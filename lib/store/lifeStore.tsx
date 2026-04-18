"use client"

import * as React from "react"
import { makeDefaultState } from "@/lib/life/defaultState"
import { isoToday } from "@/lib/life/dates"
import {
  applyXP,
  calcProgressPct,
  calcTodayScore,
  computeLevel,
  ensureDay,
  insightForDay,
  uid,
  updateStreakAfterCheckin,
} from "@/lib/life/engine"
import type {
  Goal,
  GoalCategory,
  GoalHorizon,
  ISODate,
  CheckInDraft,
  JournalEntry,
  LifeStateV1,
  Mission,
  Mood,
  TodayTaskId,
} from "@/lib/life/types"
import { finalizeHeatmapDays } from "@/lib/life/heatmap"
import { CURRENT_SCHEMA_VERSION, migrateState } from "@/lib/life/migrations"
import { xpForDay } from "@/lib/life/selectors"
import { validateState } from "@/lib/life/validate"
import {
  createBackup,
  detectDriver,
  exportData,
  importData,
  loadState,
  saveState,
  type PersistDriver,
} from "@/lib/storage/storage"
import { createStore, shallowEqual, useStore, type Store } from "@/lib/store/store"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseBrowserConfigured } from "@/lib/supabase/env"
import {
  ensureAnonymousSession,
  fetchLifeStatePrimary,
  upsertLifeStateBackup,
  type CloudAuthStatus,
} from "@/lib/supabase/backup"

export type CloudSyncStatus = "idle" | "syncing" | "synced" | "error"

type LifeStoreState = {
  driver: PersistDriver
  saving: boolean
  lastSavedAt: number | null
  lastBackupAt: number | null
  state: LifeStateV1
  error: string | null
  cloudAuth: CloudAuthStatus
  cloudSync: CloudSyncStatus
  cloudSyncMessage: string | null
  cloudLastSyncedAt: number | null
}

const initial: LifeStoreState = {
  driver: "idb",
  saving: false,
  lastSavedAt: null,
  lastBackupAt: null,
  state: makeDefaultState(),
  error: null,
  cloudAuth: "disabled",
  cloudSync: "idle",
  cloudSyncMessage: null,
  cloudLastSyncedAt: null,
}

const store: Store<LifeStoreState> = createStore(initial)

let saveTimer: number | null = null
let retryAfterFailTimer: number | null = null
let persistTail = Promise.resolve()

function scheduleRetryFlush() {
  if (retryAfterFailTimer) window.clearTimeout(retryAfterFailTimer)
  retryAfterFailTimer = window.setTimeout(() => {
    retryAfterFailTimer = null
    void flushSave()
  }, 5000)
}

async function writeCache(driver: PersistDriver, payload: LifeStateV1): Promise<void> {
  try {
    await saveState(driver, payload)
  } catch {
    /* cache best-effort */
  }
}

/**
 * Supabase first, then IndexedDB / Tauri cache. On cloud failure, still writes cache and flags error.
 */
async function runPersist(): Promise<void> {
  store.set((s) => ({ ...s, saving: true, error: null }))
  const payload = store.get().state
  const driver = store.get().driver

  try {
    if (!isSupabaseBrowserConfigured()) {
      await writeCache(driver, payload)
      store.set((s) => ({
        ...s,
        saving: false,
        lastSavedAt: Date.now(),
        cloudSync: "idle",
        cloudAuth: "disabled",
      }))
      return
    }

    store.set((s) => ({ ...s, cloudSync: "syncing", cloudSyncMessage: null }))
    const client = createClient()
    const auth = await ensureAnonymousSession(client)
    if (auth.status !== "ready") {
      store.set((s) => ({
        ...s,
        cloudAuth: auth.status,
        cloudSync: "error",
        cloudSyncMessage: auth.message ?? null,
      }))
      await writeCache(driver, payload)
      scheduleRetryFlush()
      return
    }

    store.set((s) => ({ ...s, cloudAuth: "ready" }))
    const result = await upsertLifeStateBackup(client, payload)
    if (result.ok) {
      store.set((s) => ({
        ...s,
        cloudSync: "synced",
        cloudSyncMessage: null,
        cloudLastSyncedAt: Date.now(),
      }))
    } else {
      store.set((s) => ({
        ...s,
        cloudSync: "error",
        cloudSyncMessage: result.message ?? "Could not save to Supabase",
      }))
      scheduleRetryFlush()
    }

    await writeCache(driver, payload)
  } catch (e) {
    store.set((s) => ({
      ...s,
      cloudSync: "error",
      cloudSyncMessage: e instanceof Error ? e.message : String(e),
    }))
    await writeCache(driver, payload)
    scheduleRetryFlush()
  } finally {
    store.set((s) => ({ ...s, saving: false, lastSavedAt: Date.now() }))
  }
}

function flushSave() {
  persistTail = persistTail.then(runPersist).catch(() => {})
}

function scheduleSave(ms = 550) {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    void flushSave()
  }, ms)
}

function bumpUpdated(state: LifeStateV1): LifeStateV1 {
  return { ...state, updatedAt: Date.now() }
}

function setState(mutator: (prev: LifeStateV1) => LifeStateV1, save = true) {
  store.set((s) => {
    const next = bumpUpdated(mutator(s.state))
    return { ...s, state: next }
  })
  if (save) scheduleSave()
}

function normalizeLoadedState(raw: LifeStateV1): LifeStateV1 {
  let next = raw
  if (next.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    next = { ...next, schemaVersion: CURRENT_SCHEMA_VERSION }
  }
  return finalizeHeatmapDays(next)
}

/** Offline or auth failure: load cache only (IndexedDB / Tauri). */
async function hydrateFromCacheOnly(driver: PersistDriver): Promise<void> {
  const { state } = await loadState()
  if (!state) {
    const fresh = makeDefaultState()
    store.set((s) => ({ ...s, driver, state: fresh, cloudSync: "idle" }))
    await writeCache(driver, fresh)
    return
  }
  const valid = validateState(state)
  if (!valid.ok) {
    store.set((s) => ({
      ...s,
      driver,
      state: makeDefaultState(),
      error: `Invalid cache: ${valid.error}`,
      cloudSync: "idle",
    }))
    return
  }
  const migrated = migrateState(valid.value)
  if (!migrated.ok) {
    store.set((s) => ({
      ...s,
      driver,
      state: makeDefaultState(),
      error: migrated.error,
      cloudSync: "idle",
    }))
    return
  }
  store.set((s) => ({
    ...s,
    driver,
    state: normalizeLoadedState(migrated.state as LifeStateV1),
    cloudSync: "idle",
  }))
}

/**
 * Primary: Supabase `select data`. Then cache to IndexedDB.
 * Fallback: cache if cloud unavailable. No blank screen — initial default until async completes.
 */
export async function hydrateLifeStore(): Promise<void> {
  const driver = await detectDriver()

  if (!isSupabaseBrowserConfigured()) {
    store.set((s) => ({ ...s, cloudAuth: "disabled", cloudSync: "idle", cloudSyncMessage: null }))
    await hydrateFromCacheOnly(driver)
    return
  }

  const client = createClient()
  const auth = await ensureAnonymousSession(client)
  if (auth.status !== "ready") {
    store.set((s) => ({
      ...s,
      driver,
      cloudAuth: auth.status,
      cloudSync: "error",
      cloudSyncMessage: auth.message ?? null,
    }))
    await hydrateFromCacheOnly(driver)
    return
  }

  store.set((s) => ({ ...s, driver, cloudAuth: "ready", cloudSync: "syncing" }))

  const remote = await fetchLifeStatePrimary(client)

  if (!remote.ok) {
    store.set((s) => ({
      ...s,
      cloudSync: "error",
      cloudSyncMessage: remote.message,
    }))
    await hydrateFromCacheOnly(driver)
    return
  }

  if (remote.state) {
    let next = remote.state
    if (next.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      next = { ...next, schemaVersion: CURRENT_SCHEMA_VERSION }
    }
    next = finalizeHeatmapDays(next)
    store.set((s) => ({
      ...s,
      state: next,
      error: null,
      cloudSync: "synced",
      cloudLastSyncedAt: Date.now(),
      cloudSyncMessage: null,
    }))
    await writeCache(driver, next)

    if (remote.migration?.migrated) {
      setState(
        (p) =>
          applyXP(p, isoToday(), 0, "system.migrate", {
            from: remote.migration!.fromVersion,
            to: CURRENT_SCHEMA_VERSION,
          }),
        true
      )
    }
    return
  }

  // No remote row: seed from local cache if valid, else default; upsert to Supabase, then cache.
  const { state: cached } = await loadState()
  let next: LifeStateV1
  if (cached) {
    const valid = validateState(cached)
    if (valid.ok) {
      const m = migrateState(valid.value)
      if (m.ok) {
        next = normalizeLoadedState(m.state as LifeStateV1)
      } else {
        next = makeDefaultState()
      }
    } else {
      next = makeDefaultState()
    }
  } else {
    next = makeDefaultState()
  }

  store.set((s) => ({
    ...s,
    state: next,
    error: null,
    cloudSync: "syncing",
  }))

  const up = await upsertLifeStateBackup(client, next)
  if (up.ok) {
    store.set((s) => ({
      ...s,
      cloudSync: "synced",
      cloudLastSyncedAt: Date.now(),
      cloudSyncMessage: null,
    }))
  } else {
    store.set((s) => ({
      ...s,
      cloudSync: "error",
      cloudSyncMessage: up.message ?? "Could not save to Supabase",
    }))
  }
  await writeCache(driver, next)
}

/** Pull newer state from Supabase when another tab/device saved. */
export async function refetchLifeStateFromCloudIfNewer(): Promise<void> {
  if (!isSupabaseBrowserConfigured()) return
  const client = createClient()
  const auth = await ensureAnonymousSession(client)
  if (auth.status !== "ready") return
  const remote = await fetchLifeStatePrimary(client)
  if (!remote.ok || !remote.state) return
  const local = store.get().state
  if (remote.state.updatedAt <= local.updatedAt) return
  const driver = store.get().driver
  let next = remote.state
  if (next.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    next = { ...next, schemaVersion: CURRENT_SCHEMA_VERSION }
  }
  next = finalizeHeatmapDays(next)
  store.set((s) => ({
    ...s,
    state: next,
    error: null,
    cloudSync: "synced",
    cloudLastSyncedAt: Date.now(),
    cloudSyncMessage: null,
  }))
  await writeCache(driver, next)
}

export function useLifeStore<T>(
  selector: (s: LifeStoreState) => T,
  eq: (a: T, b: T) => boolean = Object.is
): T {
  return useStore(store, selector, eq)
}

export function useLifeDerived() {
  return useLifeStore(
    (s) => {
      const today = isoToday()
      const st = s.state
      const ensured = st.daily[today] ? st : ensureDay(st, today)
      const daily = ensured.daily[today]
      const score = calcTodayScore(ensured, today)
      const progress = calcProgressPct(ensured, today)
      const lvl = computeLevel(ensured.gamification.xp)
      const dayXp = xpForDay(ensured, today)
      return {
        today,
        daily,
        score,
        progress,
        level: lvl.level,
        levelCurrent: lvl.current,
        levelNext: lvl.next,
        xp: ensured.gamification.xp,
        dayXp,
        streak: ensured.gamification.streak,
        bestStreak: ensured.gamification.bestStreak,
        perfectDays: ensured.gamification.perfectDays,
        driver: s.driver,
        saving: s.saving,
        lastSavedAt: s.lastSavedAt,
        error: s.error,
        cloudAuth: s.cloudAuth,
        cloudSync: s.cloudSync,
        cloudSyncMessage: s.cloudSyncMessage,
        cloudLastSyncedAt: s.cloudLastSyncedAt,
      }
    },
    shallowEqual
  )
}

export function actions() {
  return {
    ensureToday() {
      const today = isoToday()
      setState((s) => ensureDay(finalizeHeatmapDays(s), today))
    },
    toggleTodayTask(id: TodayTaskId, value?: boolean) {
      const day = isoToday()
      setState((s) => {
        const next = ensureDay(s, day)
        const d = next.daily[day]
        const prev = d.todayTasks[id]
        const nextVal = value ?? !prev
        let out: LifeStateV1 = {
          ...next,
          daily: {
            ...next.daily,
            [day]: { ...d, todayTasks: { ...d.todayTasks, [id]: nextVal } },
          },
        }
        out = applyXP(out, day, 0, nextVal ? "task.complete" : "task.uncomplete", { task: id })
        const scored = calcTodayScore(out, day)
        out = {
          ...out,
          daily: {
            ...out.daily,
            [day]: {
              ...out.daily[day],
              score: scored,
              status: calcProgressPct(out, day) === 100 ? "done" : "ongoing",
            },
          },
        }
        return out
      })
    },
    setSmokeCount(day: ISODate, count: number) {
      setState((s) => {
        const next = ensureDay(s, day)
        const d = next.daily[day]
        const out: LifeStateV1 = {
          ...next,
          daily: { ...next.daily, [day]: { ...d, smokeCount: Math.max(0, Math.floor(count)) } },
        }
        const scored = calcTodayScore(out, day)
        return { ...out, daily: { ...out.daily, [day]: { ...out.daily[day], score: scored } } }
      })
    },
    markDSADone(key: string, done: boolean) {
      const day = isoToday()
      setState((s) => {
        const next: LifeStateV1 = { ...s, dsaDone: { ...s.dsaDone, [key]: done } }
        return applyXP(next, day, done ? 3 : -3, done ? "task.complete" : "task.uncomplete", { domain: "dsa", key })
      })
    },
    markAngularDone(key: string, done: boolean) {
      const day = isoToday()
      setState((s) => {
        const next: LifeStateV1 = { ...s, angularDone: { ...s.angularDone, [key]: done } }
        return applyXP(next, day, done ? 3 : -3, done ? "task.complete" : "task.uncomplete", { domain: "angular", key })
      })
    },
    addJournal(mood: Mood, tag: string, text: string) {
      const day = isoToday()
      const entry: JournalEntry = { id: uid("j"), day, at: Date.now(), mood, tag, text }
      setState((s) =>
        applyXP({ ...s, journal: [entry, ...s.journal].slice(0, 500) }, day, 5, "journal.add", { mood, tag })
      )
    },
    addGoal(input: { title: string; horizon: GoalHorizon; category: GoalCategory; deadline?: ISODate }) {
      const day = isoToday()
      setState((s) => {
        const title = input.title.trim()
        if (!title) return s
        const g: Goal = {
          id: uid("g"),
          createdAt: Date.now(),
          title,
          horizon: input.horizon,
          category: input.category,
          deadline: input.deadline,
          progressPct: 0,
        }
        const m: Mission = {
          id: uid("m"),
          createdAt: Date.now(),
          horizon: input.horizon,
          title,
          sourceGoalId: g.id,
          category: input.category,
          deadline: input.deadline,
          progressPct: 0,
          active: true,
        }
        const next = { ...s, goals: [g, ...s.goals], missions: [m, ...s.missions] }
        return applyXP(next, day, 15, "goal.create", { goalId: g.id, missionId: m.id })
      })
    },
    updateGoalProgress(goalId: string, deltaPct: number) {
      const day = isoToday()
      setState((s) => {
        const goals = s.goals.map((g) =>
          g.id === goalId ? { ...g, progressPct: Math.max(0, Math.min(100, g.progressPct + deltaPct)) } : g
        )
        const goal = goals.find((g) => g.id === goalId)
        let missions = s.missions
        if (goal) {
          missions = missions.map((m) =>
            m.sourceGoalId === goalId ? { ...m, progressPct: goal.progressPct, active: goal.progressPct < 100 } : m
          )
        }
        const next = { ...s, goals, missions }
        const xp = deltaPct > 0 ? 10 : -10
        return applyXP(next, day, xp, "goal.progress", { goalId, deltaPct })
      })
    },
    deleteGoal(goalId: string) {
      const day = isoToday()
      setState((s) => {
        const goals = s.goals.filter((g) => g.id !== goalId)
        const missions = s.missions.map((m) => (m.sourceGoalId === goalId ? { ...m, active: false } : m))
        const next = { ...s, goals, missions }
        return applyXP(next, day, 0, "goal.progress", { goalId, deleted: true })
      })
    },
    async createBackupNow() {
      const snap = store.get()
      await createBackup(snap.driver, snap.state)
      store.set((s) => ({ ...s, lastBackupAt: Date.now() }))
    },
    async exportNow() {
      const snap = store.get()
      await exportData(snap.driver, snap.state)
    },
    async importNow() {
      const imported = await importData(store.get().driver)
      if (!imported) return
      const valid = validateState(imported)
      if (!valid.ok) {
        store.set((s) => ({ ...s, error: `Import failed validation: ${valid.error}` }))
        return
      }
      const mig = migrateState(valid.value)
      if (!mig.ok) {
        store.set((s) => ({ ...s, error: `Import failed migration: ${mig.error}` }))
        return
      }
      store.set((s) => ({ ...s, state: mig.state as LifeStateV1, error: null }))
      setState((p) => applyXP(p, isoToday(), 0, "system.import"), true)
      scheduleSave(10)
    },
    completeCheckin(input: {
      mandatoryWin: string
      journalText?: string
      tomorrowPlan: string
      smokeCount: number
      snoozesUsed: number
    }) {
      const day = isoToday()
      setState((s) => {
        const ensured = ensureDay(s, day)
        const scored = calcTodayScore(ensured, day)
        const progress = calcProgressPct(ensured, day)
        const wasDone = progress === 100
        const perfectDay = wasDone && input.smokeCount <= ensured.settings.smoke.baselinePerDay
        const xpGained = 0

        let out: LifeStateV1 = ensured
        out = applyXP(out, day, 0, "checkin.complete", { score: scored, win: input.mandatoryWin })
        out = updateStreakAfterCheckin(out, day, wasDone, perfectDay)

        const insight = insightForDay(out, day)
        const heatScore = Math.max(0, Math.min(100, Math.round(scored)))
        return {
          ...out,
          heatmap: { ...(out.heatmap ?? {}), [day]: { status: "fire" as const, score: heatScore } },
          daily: {
            ...out.daily,
            [day]: {
              ...out.daily[day],
              smokeCount: input.smokeCount,
              score: scored,
              checkInDraft: undefined,
              checkIn: {
                day,
                completedAt: Date.now(),
                mandatoryWin: input.mandatoryWin,
                journalText: input.journalText,
                tomorrowPlan: input.tomorrowPlan,
                smokeCount: input.smokeCount,
                snoozesUsed: input.snoozesUsed,
                score: scored,
                insight,
                xpGained,
              },
              status: wasDone ? "done" : out.daily[day].status,
            },
          },
        }
      })
    },
    updateCheckinDraft(input: { mandatoryWin: string; journalText: string; tomorrowPlan: string; smokeCount: number }) {
      const day = isoToday()
      setState((s) => {
        const next = ensureDay(s, day)
        const d = next.daily[day]
        const draft: CheckInDraft = {
          mandatoryWin: input.mandatoryWin,
          journalText: input.journalText,
          tomorrowPlan: input.tomorrowPlan,
          smokeCount: Number.isFinite(input.smokeCount) ? Math.max(0, Math.floor(input.smokeCount)) : 0,
          updatedAt: Date.now(),
        }
        return { ...next, daily: { ...next.daily, [day]: { ...d, smokeCount: draft.smokeCount, checkInDraft: draft } } }
      })
    },
    snoozeCheckin() {
      setState((s) => s, false)
    },
    flushSave,
  }
}

export function LifeHydrator({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    void hydrateLifeStore()
  }, [])

  const dayRef = React.useRef(isoToday())
  React.useEffect(() => {
    const tick = () => {
      const t = isoToday()
      if (t !== dayRef.current) {
        dayRef.current = t
        actions().ensureToday()
        void flushSave()
      }
    }
    const id = window.setInterval(tick, 60_000)
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void flushSave()
        return
      }
      tick()
      void refetchLifeStateFromCloudIfNewer()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  React.useEffect(() => {
    const onBeforeUnload = () => {
      void flushSave()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      if (retryAfterFailTimer) window.clearTimeout(retryAfterFailTimer)
    }
  }, [])

  React.useEffect(() => {
    if (!isSupabaseBrowserConfigured()) return
    const client = createClient()
    let cancelled = false
    let channel: ReturnType<typeof client.channel> | null = null
    void (async () => {
      const auth = await ensureAnonymousSession(client)
      if (cancelled || auth.status !== "ready") return
      const { data: userData } = await client.auth.getUser()
      const uid = userData.user?.id
      if (!uid) return
      channel = client
        .channel(`life_state_rt:${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "life_state", filter: `id=eq.${uid}` },
          () => {
            void refetchLifeStateFromCloudIfNewer()
          }
        )
        .subscribe()
    })()
    return () => {
      cancelled = true
      if (channel) void client.removeChannel(channel)
    }
  }, [])

  return <>{children}</>
}

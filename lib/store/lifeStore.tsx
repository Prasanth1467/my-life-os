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
import { CURRENT_SCHEMA_VERSION, migrateState } from "@/lib/life/migrations"
import { xpForDay } from "@/lib/life/selectors"
import { validateState } from "@/lib/life/validate"
import {
  createBackup,
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
  fetchRemoteLifeState,
  parseServerUpdatedAtMs,
  pushLifeState,
  subscribeLifeState,
  syncRealtimeAuth,
  type CloudAuthStatus,
} from "@/lib/sync/cloud"

export type CloudSyncStatus = "idle" | "syncing" | "synced" | "error"

/** Supabase Realtime channel for `life_state` (browser only). */
export type CloudRealtimeStatus = "off" | "connecting" | "live" | "error"

type LifeStoreState = {
  driver: PersistDriver
  hydrated: boolean
  saving: boolean
  lastSavedAt: number | null
  lastBackupAt: number | null
  state: LifeStateV1
  error: string | null
  cloudAuth: CloudAuthStatus
  cloudSync: CloudSyncStatus
  cloudRealtime: CloudRealtimeStatus
  cloudLastSyncedAt: number | null
}

const initial: LifeStoreState = {
  driver: "idb",
  hydrated: false,
  saving: false,
  lastSavedAt: null,
  lastBackupAt: null,
  state: makeDefaultState(),
  error: null,
  cloudAuth: "disabled",
  cloudSync: "idle",
  cloudRealtime: "off",
  cloudLastSyncedAt: null,
}

const store: Store<LifeStoreState> = createStore(initial)

let saveTimer: number | null = null
let inFlight = Promise.resolve()
let realtimeCleanup: (() => void) | null = null
/** Monotonic server clock (life_state.updated_at) for latest-write-wins + duplicate Realtime suppression */
let lastServerAppliedMs = 0

async function applyRemoteLifeStateFromRealtime(next: LifeStateV1, serverUpdatedAt: string) {
  const incomingMs = parseServerUpdatedAtMs(serverUpdatedAt)
  if (!Number.isFinite(incomingMs)) return
  if (incomingMs <= lastServerAppliedMs) return

  lastServerAppliedMs = incomingMs
  const snap = store.get()
  if (!snap.hydrated) return

  const merged: LifeStateV1 = { ...next, updatedAt: incomingMs }
  store.set((s) => ({
    ...s,
    state: merged,
    cloudSync: "synced",
    cloudLastSyncedAt: Date.now(),
    error: null,
  }))
  if (snap.driver === "idb") {
    try {
      await saveState(snap.driver, merged)
    } catch {
      /* ignore */
    }
  }
}

async function syncToSupabase(payload: LifeStateV1) {
  if (!isSupabaseBrowserConfigured()) return

  store.set((s) => ({ ...s, cloudSync: "syncing" }))
  try {
    const client = createClient()
    const auth = await ensureAnonymousSession(client)
    if (auth !== "ready") {
      store.set((s) => ({ ...s, cloudAuth: auth, cloudSync: "error" }))
      return
    }
    store.set((s) => ({ ...s, cloudAuth: "ready" }))
    const result = await pushLifeState(client, payload)
    if (result.ok) {
      lastServerAppliedMs = parseServerUpdatedAtMs(result.updatedAt)
      store.set((s) => ({
        ...s,
        cloudSync: "synced",
        cloudLastSyncedAt: Date.now(),
      }))
    } else {
      store.set((s) => ({ ...s, cloudSync: "error" }))
    }
  } catch {
    store.set((s) => ({ ...s, cloudSync: "error" }))
  }
}

async function initCloudSync(driver: PersistDriver) {
  realtimeCleanup?.()
  realtimeCleanup = null

  if (!isSupabaseBrowserConfigured()) {
    store.set((s) => ({ ...s, cloudAuth: "disabled", cloudSync: "idle", cloudRealtime: "off" }))
    return
  }

  try {
    const client = createClient()
    const auth = await ensureAnonymousSession(client)
    store.set((s) => ({ ...s, cloudAuth: auth }))
    if (auth !== "ready") {
      store.set((s) => ({ ...s, cloudRealtime: "off" }))
      return
    }

    await syncRealtimeAuth(client)
    const {
      data: { subscription: authSub },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) client.realtime.setAuth(session.access_token)
    })

    const remote = await fetchRemoteLifeState(client)
    if (remote) {
      const valid = validateState(remote.state)
      if (valid.ok) {
        const mig = migrateState(valid.value)
        if (mig.ok) {
          const incomingMs = parseServerUpdatedAtMs(remote.updatedAt)
          lastServerAppliedMs = incomingMs
          const next = { ...(mig.state as LifeStateV1), updatedAt: incomingMs }
          store.set((s) => ({
            ...s,
            state: next,
            cloudSync: "synced",
            cloudLastSyncedAt: Date.now(),
          }))
          if (driver === "idb") await saveState(driver, next)
        }
      }
    }

    const { data: userData } = await client.auth.getUser()
    const uid = userData.user?.id
    if (!uid) {
      authSub.unsubscribe()
      store.set((s) => ({ ...s, cloudRealtime: "off" }))
      return
    }

    store.set((s) => ({ ...s, cloudRealtime: "connecting" }))

    const channel = subscribeLifeState(
      client,
      uid,
      (next, updatedAt) => {
        void applyRemoteLifeStateFromRealtime(next, updatedAt)
      },
      (status) => {
        if (status === "SUBSCRIBED") {
          store.set((s) => ({ ...s, cloudRealtime: "live" }))
          return
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          store.set((s) => ({ ...s, cloudRealtime: "error" }))
          client.realtime.connect()
          return
        }
        if (status === "CLOSED") {
          store.set((s) => ({ ...s, cloudRealtime: "off" }))
        }
      }
    )

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return
      void syncRealtimeAuth(client)
      client.realtime.connect()
    }
    document.addEventListener("visibilitychange", onVisibility)

    realtimeCleanup = () => {
      authSub.unsubscribe()
      document.removeEventListener("visibilitychange", onVisibility)
      void client.removeChannel(channel)
    }
  } catch {
    store.set((s) => ({ ...s, cloudAuth: "error", cloudSync: "error", cloudRealtime: "error" }))
  }
}

function scheduleSave(ms = 550) {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    void flushSave()
  }, ms)
}

async function flushSave() {
  const snap = store.get()
  if (!snap.hydrated) return
  if (snap.saving) return

  store.set((s) => ({ ...s, saving: true, error: null }))
  const payload = store.get().state
  inFlight = inFlight
    .then(async () => {
      await saveState(store.get().driver, payload)
      await syncToSupabase(payload)
    })
    .then(() => {
      store.set((s) => ({ ...s, saving: false, lastSavedAt: Date.now() }))
    })
    .catch((e: unknown) => {
      store.set((s) => ({ ...s, saving: false, error: e instanceof Error ? e.message : String(e) }))
    })
  await inFlight
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

export async function hydrateLifeStore(): Promise<void> {
  const { driver, state } = await loadState()

  if (!state) {
    const fresh = makeDefaultState()
    if (driver === "supabase") {
      store.set((s) => ({ ...s, driver, hydrated: false, state: fresh }))
      await initCloudSync(driver)
      store.set((s) => ({ ...s, hydrated: true }))
      scheduleSave(10)
      return
    }
    store.set((s) => ({ ...s, driver, hydrated: true, state: fresh }))
    await initCloudSync(driver)
    scheduleSave(10)
    return
  }

  const valid = validateState(state)
  if (!valid.ok) {
    const fresh = makeDefaultState()
    store.set((s) => ({ ...s, driver, hydrated: true, state: fresh, error: `Invalid saved state: ${valid.error}` }))
    await initCloudSync(driver)
    scheduleSave(10)
    return
  }

  const migrated = migrateState(valid.value)
  if (!migrated.ok) {
    const fresh = makeDefaultState()
    store.set((s) => ({ ...s, driver, hydrated: true, state: fresh, error: migrated.error }))
    await initCloudSync(driver)
    scheduleSave(10)
    return
  }

  const next = migrated.state as LifeStateV1
  store.set((s) => ({
    ...s,
    driver,
    hydrated: true,
    state:
      next.schemaVersion === CURRENT_SCHEMA_VERSION
        ? next
        : ({ ...next, schemaVersion: CURRENT_SCHEMA_VERSION } as LifeStateV1),
  }))

  await initCloudSync(driver)

  if (migrated.migrated) {
    setState(
      (p) => applyXP(p, isoToday(), 0, "system.migrate", { from: migrated.fromVersion, to: CURRENT_SCHEMA_VERSION }),
      true
    )
  }
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
        hydrated: s.hydrated,
        saving: s.saving,
        lastSavedAt: s.lastSavedAt,
        error: s.error,
        cloudAuth: s.cloudAuth,
        cloudSync: s.cloudSync,
        cloudRealtime: s.cloudRealtime,
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
      setState((s) => ensureDay(s, today))
    },
    toggleTodayTask(id: TodayTaskId, value?: boolean) {
      const day = isoToday()
      setState((s) => {
        const next = ensureDay(s, day)
        const d = next.daily[day]
        const prev = d.todayTasks[id]
        const nextVal = value ?? !prev
        const xpDelta = nextVal && !prev ? 10 : !nextVal && prev ? -10 : 0
        let out: LifeStateV1 = {
          ...next,
          daily: {
            ...next.daily,
            [day]: { ...d, todayTasks: { ...d.todayTasks, [id]: nextVal } },
          },
        }
        out = applyXP(out, day, xpDelta, nextVal ? "task.complete" : "task.uncomplete", { task: id })
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
        const xpGained = Math.round(scored * (wasDone ? 1.2 : 0.9))

        let out: LifeStateV1 = ensured
        out = applyXP(out, day, xpGained, "checkin.complete", { score: scored, win: input.mandatoryWin })
        out = updateStreakAfterCheckin(out, day, wasDone, perfectDay)

        const insight = insightForDay(out, day)
        return {
          ...out,
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
  const hydrated = useLifeStore((s) => s.hydrated)
  React.useEffect(() => {
    void hydrateLifeStore()
  }, [])
  React.useEffect(() => {
    const onBeforeUnload = () => {
      void flushSave()
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flushSave()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("visibilitychange", onVisibility)
      realtimeCleanup?.()
      realtimeCleanup = null
    }
  }, [])
  if (!hydrated) return null
  return <>{children}</>
}


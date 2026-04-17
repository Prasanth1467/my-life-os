import { addDaysISO, diffDaysISO, isoToday } from "@/lib/life/dates"
import type {
  ISODate,
  LifeEvent,
  LifeStateV1,
  Mood,
  TodayTaskId,
} from "@/lib/life/types"

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function ensureDay(state: LifeStateV1, day: ISODate): LifeStateV1 {
  if (state.daily[day]) return state
  const todayTasks: Record<TodayTaskId, boolean> = {
    angular: false,
    dsa: false,
    walk: false,
    water: false,
    sleep: false,
    phone: false,
    nosmoke: false,
  }
  return {
    ...state,
    daily: {
      ...state.daily,
      [day]: {
        day,
        status: state.paused ? "paused" : "ongoing",
        todayTasks,
        smokeCount: 0,
        score: 0,
      },
    },
  }
}

export function dayNumber(state: LifeStateV1, day = isoToday()): number {
  const diff = diffDaysISO(day, state.startDate)
  return Math.max(1, diff + 1)
}

export function smokeGoalForDay(state: LifeStateV1, day = isoToday()): number {
  const offset = Math.max(0, diffDaysISO(day, state.startDate))
  const plan = state.settings.smoke.reductionPlan
    .slice()
    .sort((a, b) => a.startDayOffset - b.startDayOffset)
  let goal = state.settings.smoke.baselinePerDay
  for (const p of plan) {
    if (offset >= p.startDayOffset) goal = p.goalPerDay
  }
  return goal
}

export function calcTodayScore(state: LifeStateV1, day = isoToday()): number {
  const d = state.daily[day]
  if (!d) return 0
  const tasks = d.todayTasks
  const taskKeys = Object.keys(tasks) as TodayTaskId[]
  const doneCount = taskKeys.filter((k) => tasks[k]).length
  const taskScore = Math.round((doneCount / taskKeys.length) * 70)
  const smokeGoal = smokeGoalForDay(state, day)
  const smokePenalty = Math.min(30, Math.max(0, d.smokeCount - smokeGoal) * 3)
  const smokeScore = Math.max(0, 30 - smokePenalty)
  return Math.max(0, Math.min(100, taskScore + smokeScore))
}

export function calcProgressPct(state: LifeStateV1, day = isoToday()): number {
  const d = state.daily[day]
  if (!d) return 0
  const tasks = d.todayTasks
  const taskKeys = Object.keys(tasks) as TodayTaskId[]
  const doneCount = taskKeys.filter((k) => tasks[k]).length
  return Math.round((doneCount / taskKeys.length) * 100)
}

export function computeLevel(xp: number): { level: number; current: number; next: number } {
  // Level curve: next level requires 120 * level
  let level = 1
  let remaining = xp
  while (remaining >= 120 * level) {
    remaining -= 120 * level
    level += 1
  }
  const next = 120 * level
  return { level, current: remaining, next }
}

export function insightForDay(state: LifeStateV1, day = isoToday()): string {
  const d = state.daily[day]
  const score = d?.score ?? 0
  const smoke = d?.smokeCount ?? 0
  const smokeGoal = smokeGoalForDay(state, day)
  if (score >= 85) return "Momentum is real. Protect the streak. Repeat tomorrow."
  if (smoke > smokeGoal) return "You’re leaking energy. Find the trigger and replace the ritual."
  if (score < 40) return "Do the smallest next action. A single completion restarts the loop."
  return "Steady. One more task moves the needle."
}

export function deriveStatusForDay(state: LifeStateV1, day = isoToday()): LifeStateV1 {
  const d = state.daily[day]
  if (!d) return state
  if (state.paused) {
    if (d.status !== "paused") {
      return { ...state, daily: { ...state.daily, [day]: { ...d, status: "paused" } } }
    }
    return state
  }
  const done = calcProgressPct(state, day) === 100
  const status = done ? "done" : "ongoing"
  if (d.status === status) return state
  return { ...state, daily: { ...state.daily, [day]: { ...d, status } } }
}

export function applyXP(state: LifeStateV1, day: ISODate, xpDelta: number, type: LifeEvent["type"], meta?: LifeEvent["meta"]): LifeStateV1 {
  const now = Date.now()
  const ev: LifeEvent = { id: uid("ev"), at: now, type, day, meta, xpDelta }
  const xp = Math.max(0, state.gamification.xp + xpDelta)
  const lvl = computeLevel(xp)
  return {
    ...state,
    events: [ev, ...state.events].slice(0, 2000),
    gamification: { ...state.gamification, xp, level: lvl.level },
  }
}

export function updateStreakAfterCheckin(state: LifeStateV1, day: ISODate, wasDone: boolean, perfectDay: boolean): LifeStateV1 {
  const prev = state.gamification
  const last = prev.lastDoneDay
  const expectedPrev = addDaysISO(day, -1)
  let streak = prev.streak
  if (!wasDone) {
    streak = 0
  } else if (!last) {
    streak = 1
  } else if (last === expectedPrev) {
    streak = prev.streak + 1
  } else if (last === day) {
    streak = prev.streak
  } else {
    streak = 1
  }
  const bestStreak = Math.max(prev.bestStreak, streak)
  const perfectDays = prev.perfectDays + (perfectDay ? 1 : 0)
  return {
    ...state,
    gamification: { ...prev, streak, bestStreak, lastDoneDay: wasDone ? day : last, perfectDays },
  }
}

export function moodToScore(m: Mood): number {
  return m === "🔥" ? 5 : m === "💪" ? 4 : m === "😐" ? 3 : m === "😩" ? 2 : 1
}


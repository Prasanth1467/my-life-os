export type ISODate = `${number}-${number}-${number}` // YYYY-MM-DD

export type DayStatus = "ongoing" | "done" | "missed" | "paused"

export type TaskDomain = "angular" | "dsa" | "health"

export type TodayTaskId =
  | "angular"
  | "dsa"
  | "walk"
  | "water"
  | "sleep"
  | "phone"
  | "nosmoke"

export type Mood = "🔥" | "💪" | "😐" | "😩" | "❌"

export type GoalCategory = "dsa" | "angular" | "health" | "smoke" | "general"
export type GoalHorizon = "weekly" | "monthly" | "longterm"

export type MissionHorizon = "weekly" | "monthly" | "longterm"

export type LifeEventType =
  | "task.complete"
  | "task.uncomplete"
  | "checkin.complete"
  | "smoke.log"
  | "goal.create"
  | "goal.progress"
  | "journal.add"
  | "system.migrate"
  | "system.import"

export type LifeEvent = {
  id: string
  at: number // ms epoch
  type: LifeEventType
  day: ISODate
  meta?: Record<string, unknown>
  xpDelta: number
}

export type JournalEntry = {
  id: string
  day: ISODate
  at: number
  mood: Mood
  tag: string
  text: string
}

export type Goal = {
  id: string
  createdAt: number
  title: string
  horizon: GoalHorizon
  category: GoalCategory
  deadline?: ISODate
  progressPct: number // 0..100
}

export type Mission = {
  id: string
  createdAt: number
  horizon: MissionHorizon
  title: string
  sourceGoalId?: string
  category: GoalCategory
  deadline?: ISODate
  progressPct: number // 0..100
  active: boolean
}

export type CheckIn = {
  day: ISODate
  completedAt: number
  mandatoryWin: string
  journalText?: string
  tomorrowPlan: string
  smokeCount: number
  snoozesUsed: number
  score: number // 0..100
  insight: string
  xpGained: number
}

export type CheckInDraft = {
  mandatoryWin: string
  journalText: string
  tomorrowPlan: string
  smokeCount: number
  updatedAt: number
}

export type Daily = {
  day: ISODate
  status: DayStatus
  todayTasks: Record<TodayTaskId, boolean>
  smokeCount: number
  score: number // 0..100
  checkIn?: CheckIn
  checkInDraft?: CheckInDraft
}

export type Gamification = {
  xp: number
  level: number
  streak: number
  bestStreak: number
  lastDoneDay?: ISODate
  perfectDays: number
}

export type Settings = {
  focusModeDefault: boolean
  checkIn: {
    autoOpenEnabled: boolean
    windowStartHour: number // 0..23 (21)
    windowEndHour: number // 0..23 (5) - window may wrap across midnight
    maxSnoozes: number
    snoozeMinutes: number
  }
  smoke: {
    baselinePerDay: number
    reductionPlan: Array<{ startDayOffset: number; goalPerDay: number }>
  }
}

/** Check-in outcome for a calendar day (GitHub-style heatmap). */
export type HeatmapStatus = "fire" | "miss"

export type HeatmapCell = {
  status: HeatmapStatus
  /** 0–100 intensity for display */
  score: number
}

export type LifeStateV1 = {
  schemaVersion: 1 | 2
  createdAt: number
  updatedAt: number
  startDate: ISODate
  paused: boolean
  daily: Record<ISODate, Daily>
  /** Optional on legacy v1; required after migration to v2. */
  heatmap?: Record<ISODate, HeatmapCell>
  dsaDone: Record<string, boolean>
  angularDone: Record<string, boolean>
  goals: Goal[]
  missions: Mission[]
  journal: JournalEntry[]
  events: LifeEvent[]
  gamification: Gamification
  settings: Settings
}

export type LifeStateAny = LifeStateV1


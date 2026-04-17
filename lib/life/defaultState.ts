import { isoToday } from "@/lib/life/dates"
import type { ISODate, LifeStateV1, TodayTaskId } from "@/lib/life/types"

function emptyTodayTasks(): Record<TodayTaskId, boolean> {
  return {
    angular: false,
    dsa: false,
    walk: false,
    water: false,
    sleep: false,
    phone: false,
    nosmoke: false,
  }
}

export function makeDefaultState(now = new Date()): LifeStateV1 {
  const today = isoToday(now)
  const createdAt = now.getTime()
  const startDate = today as ISODate

  return {
    schemaVersion: 1,
    createdAt,
    updatedAt: createdAt,
    startDate,
    paused: false,
    daily: {
      [today]: {
        day: today,
        status: "ongoing",
        todayTasks: emptyTodayTasks(),
        smokeCount: 0,
        score: 0,
      },
    },
    dsaDone: {},
    angularDone: {},
    goals: [],
    missions: [],
    journal: [],
    events: [],
    gamification: {
      xp: 0,
      level: 1,
      streak: 0,
      bestStreak: 0,
      perfectDays: 0,
    },
    settings: {
      focusModeDefault: false,
      checkIn: {
        autoOpenEnabled: true,
        windowStartHour: 21,
        windowEndHour: 5,
        maxSnoozes: 2,
        snoozeMinutes: 20,
      },
      smoke: {
        baselinePerDay: 20,
        reductionPlan: [
          { startDayOffset: 0, goalPerDay: 20 },
          { startDayOffset: 30, goalPerDay: 15 },
          { startDayOffset: 60, goalPerDay: 10 },
          { startDayOffset: 90, goalPerDay: 5 },
          { startDayOffset: 120, goalPerDay: 2 },
        ],
      },
    },
  }
}


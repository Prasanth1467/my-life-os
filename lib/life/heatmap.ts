import { addDaysISO, compareISODate, isoToday } from "@/lib/life/dates"
import { calcTodayScore } from "@/lib/life/engine"
import type { ISODate, HeatmapCell, LifeStateV1 } from "@/lib/life/types"

/**
 * For every day from startDate up to (but not including) today:
 * - If check-in exists → fire
 * - Else if that day has a daily row → miss (night passed without check-in)
 * Today is never auto-marked miss.
 */
export function finalizeHeatmapDays(state: LifeStateV1, today = isoToday()): LifeStateV1 {
  const heatmap: Record<ISODate, HeatmapCell> = { ...(state.heatmap ?? {}) }
  let day: ISODate = state.startDate

  if (compareISODate(state.startDate, today) > 0) {
    return { ...state, heatmap }
  }

  while (compareISODate(day, today) < 0) {
    const existing = heatmap[day]
    if (existing?.status === "fire") {
      day = addDaysISO(day, 1)
      continue
    }

    const row = state.daily[day]
    if (row?.checkIn) {
      heatmap[day] = {
        status: "fire",
        score: Math.max(0, Math.min(100, row.checkIn.score)),
      }
    } else if (row) {
      const score = row.score ?? calcTodayScore(state, day)
      heatmap[day] = { status: "miss", score: Math.max(0, Math.min(100, score)) }
    }

    day = addDaysISO(day, 1)
  }

  return { ...state, heatmap }
}

/** Backfill heatmap when migrating from v1 (no heatmap). */
export function backfillHeatmapFromHistory(state: LifeStateV1): LifeStateV1 {
  return finalizeHeatmapDays({ ...state, heatmap: state.heatmap ?? {} })
}

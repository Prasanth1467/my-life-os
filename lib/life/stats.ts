import { addDaysISO, diffDaysISO, isoToday } from "@/lib/life/dates"
import type { ISODate, LifeStateV1 } from "@/lib/life/types"

export type DisciplineStats = {
  totalDays: number
  doneDays: number
  missedDays: number
  daysWasted: number
  consistencyPct: number // 0..100
  currentStreak: number
  bestStreak: number
  lastBreakAfterDays: number | null
  onBestRun: boolean
}

/** "Done" = check-in fire day (heatmap), with legacy fallback to stored check-in. */
function isFireDay(st: LifeStateV1, day: ISODate) {
  const h = st.heatmap?.[day]
  if (h?.status === "fire") return true
  if (h?.status === "miss") return false
  return Boolean(st.daily[day]?.checkIn)
}

export function computeDisciplineStats(st: LifeStateV1, today = isoToday()): DisciplineStats {
  const totalDays = Math.max(1, diffDaysISO(today, st.startDate) + 1)

  let doneDays = 0
  let missedDays = 0

  for (let i = 0; i < totalDays - 1; i++) {
    const d = addDaysISO(st.startDate, i)
    if (isFireDay(st, d)) doneDays++
    else missedDays++
  }

  const daysWasted = missedDays
  const denom = Math.max(1, totalDays - 1)
  const consistencyPct = Math.round((doneDays / denom) * 100)

  let lastBreakAfterDays: number | null = null
  let run = 0
  for (let i = 0; i < totalDays - 1; i++) {
    const d = addDaysISO(st.startDate, i)
    if (isFireDay(st, d)) {
      run++
      continue
    }
    if (run > 0) lastBreakAfterDays = run
    run = 0
  }

  const currentStreak = st.gamification.streak
  const bestStreak = st.gamification.bestStreak
  const onBestRun = currentStreak > 0 && currentStreak >= bestStreak

  return {
    totalDays,
    doneDays,
    missedDays,
    daysWasted,
    consistencyPct,
    currentStreak,
    bestStreak,
    lastBreakAfterDays,
    onBestRun,
  }
}

import type { ISODate } from "@/lib/life/types"

export function isoToday(now = new Date()): ISODate {
  return now.toISOString().slice(0, 10) as ISODate
}

export function addDaysISO(day: ISODate, deltaDays: number): ISODate {
  const d = new Date(day + "T00:00:00.000Z")
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10) as ISODate
}

export function diffDaysISO(a: ISODate, b: ISODate): number {
  const da = new Date(a + "T00:00:00.000Z").getTime()
  const db = new Date(b + "T00:00:00.000Z").getTime()
  return Math.round((da - db) / 86_400_000)
}

/** Lexicographic compare (works for YYYY-MM-DD). Returns -1 | 0 | 1. */
export function compareISODate(a: ISODate, b: ISODate): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function isTimeInWindow(
  now: Date,
  windowStartHour: number,
  windowEndHour: number
): boolean {
  const h = now.getHours()
  if (windowStartHour === windowEndHour) return true
  if (windowStartHour < windowEndHour) {
    return h >= windowStartHour && h < windowEndHour
  }
  return h >= windowStartHour || h < windowEndHour
}


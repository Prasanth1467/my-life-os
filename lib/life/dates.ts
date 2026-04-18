import type { ISODate } from "@/lib/life/types"

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

/** Local calendar day as YYYY-MM-DD (not UTC). */
export function toISODateLocal(d: Date): ISODate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` as ISODate
}

/** Parse YYYY-MM-DD as local midnight. */
export function localDateFromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Today in the user's local timezone. */
export function isoToday(now = new Date()): ISODate {
  return toISODateLocal(now)
}

export function addDaysISO(day: ISODate, deltaDays: number): ISODate {
  const d = localDateFromISO(day)
  d.setDate(d.getDate() + deltaDays)
  return toISODateLocal(d)
}

export function diffDaysISO(a: ISODate, b: ISODate): number {
  const da = localDateFromISO(a)
  da.setHours(0, 0, 0, 0)
  const db = localDateFromISO(b)
  db.setHours(0, 0, 0, 0)
  return Math.round((da.getTime() - db.getTime()) / 86_400_000)
}

/** Lexicographic compare (works for YYYY-MM-DD). Returns -1 | 0 | 1. */
export function compareISODate(a: ISODate, b: ISODate): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** Monday = 0 … Sunday = 6 (for calendar grid padding). */
export function mondayWeekIndex(iso: ISODate): number {
  const wd = localDateFromISO(iso).getDay()
  return (wd + 6) % 7
}

export function isTimeInWindow(now: Date, windowStartHour: number, windowEndHour: number): boolean {
  const h = now.getHours()
  if (windowStartHour === windowEndHour) return true
  if (windowStartHour < windowEndHour) {
    return h >= windowStartHour && h < windowEndHour
  }
  return h >= windowStartHour || h < windowEndHour
}

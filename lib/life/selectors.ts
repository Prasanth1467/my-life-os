import type { ISODate, LifeStateV1 } from "@/lib/life/types"

export function xpForDay(state: LifeStateV1, day: ISODate): number {
  let sum = 0
  for (const ev of state.events) {
    if (ev.day !== day) continue
    sum += ev.xpDelta
  }
  return sum
}

export function lastNDays(state: LifeStateV1, days: ISODate[]): Array<{ day: ISODate; score: number; smoke: number; status: string; xp: number }> {
  return days.map((d) => ({
    day: d,
    score: state.daily[d]?.score ?? 0,
    smoke: state.daily[d]?.smokeCount ?? 0,
    status: state.daily[d]?.status ?? "ongoing",
    xp: xpForDay(state, d),
  }))
}


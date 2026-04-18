import type { CuratedQuote, QuoteLane } from "@/lib/quotes/types"

const LANE_ORDER: QuoteLane[] = ["krishna", "luffy", "anime_discipline", "long_term", "discipline"]

/** Deterministic string hash → uint32 */
function hash32(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function poolForLane(quotes: CuratedQuote[], lane: QuoteLane): CuratedQuote[] {
  return quotes.filter((q) => q.lane === lane)
}

/**
 * Same calendar day → same quote. Rotates lane by day; index within lane from hash.
 */
export function getQuoteForCalendarDay(isoDate: string, quotes: CuratedQuote[]): CuratedQuote {
  const h0 = hash32(isoDate)
  const lane = LANE_ORDER[h0 % LANE_ORDER.length]
  const pool = poolForLane(quotes, lane)
  if (pool.length === 0) {
    const fallback = quotes[0]
    if (!fallback) {
      return {
        id: "empty",
        lane: "discipline",
        text: "Show up today. Small steps compound.",
        attribution: "Life OS",
      }
    }
    return fallback
  }
  const h1 = hash32(`${isoDate}:${lane}`)
  return pool[h1 % pool.length]!
}

"use client"

import * as React from "react"

import { getQuoteForCalendarDay } from "@/lib/quotes/pick"
import type { CuratedQuote } from "@/lib/quotes/types"

export function useDailyQuote(isoDate: string) {
  const [quote, setQuote] = React.useState<CuratedQuote | null>(null)

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      const mod = (await import("@/lib/quotes/curated.json")) as { default: CuratedQuote[] }
      const q = getQuoteForCalendarDay(isoDate, mod.default)
      if (alive) setQuote(q)
    })()
    return () => {
      alive = false
    }
  }, [isoDate])

  return quote
}

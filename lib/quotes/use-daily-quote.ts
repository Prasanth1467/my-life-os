"use client"

import * as React from "react"

import type { DailyQuote } from "@/lib/quotes/types"
import { getQuoteOfDay } from "@/lib/quotes/quote-cycle"

export function useDailyQuote(dayNumber: number) {
  const [quote, setQuote] = React.useState<DailyQuote | null>(null)

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      const mod = (await import("@/lib/quotes/quotes365.json")) as { default: DailyQuote[] }
      const q = getQuoteOfDay({ quotes: mod.default, dayNumber })
      if (alive) setQuote(q)
    })()
    return () => {
      alive = false
    }
  }, [dayNumber])

  return quote
}


"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DailyQuote } from "@/lib/quotes/types"

const categoryLabel: Record<DailyQuote["category"], string> = {
  discipline: "Discipline",
  pain_struggle: "Pain & Struggle",
  comeback: "Comeback",
  ambition_growth: "Ambition & Growth",
  spiritual_grounding: "Spiritual Grounding",
}

export function DailyQuoteHero({ quote, className }: { quote: DailyQuote | null; className?: string }) {
  if (!quote) return null

  return (
    <section className={cn("rounded-2xl border bg-card p-5 md:p-7", "animate-in fade-in-0 slide-in-from-bottom-2", className)}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge variant="secondary">{categoryLabel[quote.category]}</Badge>
        {quote.ref ? (
          <Badge variant="outline">{quote.ref}</Badge>
        ) : null}
      </div>

      <div className="mt-4 text-center">
        <div
          className={cn(
            "text-balance font-extrabold tracking-tight",
            "text-3xl md:text-5xl",
            "bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent"
          )}
        >
          “{quote.text}”
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          — {quote.author}
        </div>
      </div>
    </section>
  )
}


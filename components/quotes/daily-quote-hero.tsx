"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CuratedQuote, QuoteLane } from "@/lib/quotes/types"

const laneLabel: Record<QuoteLane, string> = {
  krishna: "Krishna · Gita",
  luffy: "Luffy",
  anime_discipline: "Anime · discipline",
  long_term: "Long-term",
  discipline: "Discipline",
}

export function DailyQuoteHero({ quote, className }: { quote: CuratedQuote | null; className?: string }) {
  if (!quote) return null

  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 bg-card/80 p-4 md:p-5",
        "animate-in fade-in-0 slide-in-from-bottom-2",
        className
      )}
    >
      <div className="flex justify-center">
        <Badge variant="secondary" className="text-[11px] font-normal tracking-wide">
          {laneLabel[quote.lane]}
        </Badge>
      </div>

      <blockquote className="mt-3 text-center">
        <p className="text-balance text-lg font-semibold leading-snug tracking-tight text-foreground md:text-2xl">
          “{quote.text}”
        </p>
        <footer className="mt-2 text-xs text-muted-foreground md:text-sm">
          — {quote.attribution}
          {quote.source ? <span className="text-muted-foreground/80"> · {quote.source}</span> : null}
        </footer>
      </blockquote>
    </section>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"

import { addDaysISO, compareISODate, isoToday, mondayWeekIndex } from "@/lib/life/dates"
import type { ISODate, LifeStateV1 } from "@/lib/life/types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { heatmapCellBackground, heatmapCellRing, type HeatVisualKind } from "@/components/calendar/heatmap-shared"

type HStatus = "fire" | "miss" | "neutral"

function heatStatus(state: LifeStateV1, day: ISODate, today: ISODate): HStatus {
  const h = state.heatmap?.[day]
  if (h?.status === "fire") return "fire"
  if (h?.status === "miss") return "miss"
  if (state.daily[day]?.checkIn) return "fire"
  if (compareISODate(day, today) < 0) return "miss"
  return "neutral"
}

function toVisual(hs: HStatus, day: ISODate, today: ISODate): HeatVisualKind {
  if (hs === "neutral" && day === today) return "today"
  if (hs === "fire") return "fire"
  if (hs === "miss") return "miss"
  return "neutral"
}

function statusLabel(hs: HStatus, day: ISODate, today: ISODate): string {
  if (day === today && hs === "neutral") return "Today (in progress)"
  if (hs === "fire") return "Check-in"
  if (hs === "miss") return "Missed"
  return "In progress"
}

export function Heatmap30({
  state,
  className,
  showViewAll,
}: {
  state: LifeStateV1
  className?: string
  /** Show link to full lifetime heatmap */
  showViewAll?: boolean
}) {
  const today = isoToday()
  const days: ISODate[] = React.useMemo(() => {
    const out: ISODate[] = []
    for (let i = 29; i >= 0; i--) out.push(addDaysISO(today, -i))
    return out
  }, [today])

  const start = days[0]
  const startOffset = mondayWeekIndex(start)
  const cells: Array<{ key: string; day?: ISODate }> = []
  for (let i = 0; i < startOffset; i++) cells.push({ key: `p${i}` })
  for (const d of days) cells.push({ key: d, day: d })
  while (cells.length % 7 !== 0) cells.push({ key: `t${cells.length}` })

  return (
    <TooltipProvider>
      <div className={cn("space-y-2", className)}>
        {showViewAll ? (
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
              <Link href="/heatmap">Full calendar</Link>
            </Button>
          </div>
        ) : null}
        <div className="grid grid-cols-7 gap-2 text-[11px] text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {cells.map((c) => {
            if (!c.day) {
              return <div key={c.key} className="aspect-square min-h-7 rounded-sm border border-transparent" />
            }

            const hs = heatStatus(state, c.day, today)
            const vk = toVisual(hs, c.day, today)
            const score = state.heatmap?.[c.day]?.score ?? state.daily[c.day]?.score ?? 0
            const smoke = state.daily[c.day]?.smokeCount ?? 0

            return (
              <Tooltip key={c.key}>
                <TooltipTrigger asChild>
                  <div
                    role="presentation"
                    className={cn(
                      "aspect-square min-h-7 rounded-sm border border-border/30 transition-opacity hover:opacity-90",
                      heatmapCellRing(vk)
                    )}
                    style={{ backgroundColor: heatmapCellBackground(vk, score) }}
                    aria-label={`${c.day} ${statusLabel(hs, c.day, today)}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs font-semibold">{c.day}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {statusLabel(hs, c.day, today)} · {Math.round(score)}/100 · smoke {smoke}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        <div className="text-[11px] text-muted-foreground">
          Darker green = stronger day score. Rose = missed (no check-in). Orange tint = today.
        </div>
      </div>
    </TooltipProvider>
  )
}

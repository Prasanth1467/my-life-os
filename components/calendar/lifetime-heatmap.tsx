"use client"

import * as React from "react"
import Link from "next/link"

import { addDaysISO, compareISODate, isoToday } from "@/lib/life/dates"
import type { ISODate, LifeStateV1 } from "@/lib/life/types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

function mondayPad(iso: ISODate): number {
  const wd = new Date(iso + "T12:00:00.000Z").getUTCDay()
  return (wd + 6) % 7
}

type CellKind = "fire" | "miss" | "empty" | "today"

function cellKind(state: LifeStateV1, day: ISODate, today: ISODate): CellKind {
  if (compareISODate(day, today) > 0) return "empty"
  const h = state.heatmap?.[day]
  if (h?.status === "fire") return "fire"
  if (h?.status === "miss") return "miss"
  if (state.daily[day]?.checkIn) return "fire"
  if (compareISODate(day, today) < 0) return "miss"
  return "today"
}

function face(kind: CellKind) {
  if (kind === "fire") return "🔥"
  if (kind === "miss") return "😢"
  if (kind === "today") return "⚪"
  return ""
}

function intensityBg(kind: CellKind, score: number) {
  const t = Math.max(0, Math.min(1, score / 100))
  if (kind === "fire") return `rgba(16, 185, 129, ${0.12 + t * 0.55})`
  if (kind === "miss") return `rgba(244, 63, 94, ${0.1 + (1 - t) * 0.35})`
  if (kind === "today") return "rgba(249, 115, 22, 0.12)"
  return "transparent"
}

export function LifetimeHeatmap({
  state,
  maxWeeks,
  className,
  cellClassName,
}: {
  state: LifeStateV1
  maxWeeks?: number
  className?: string
  cellClassName?: string
}) {
  const today = isoToday()
  const weeks = React.useMemo(() => {
    const dates: ISODate[] = []
    let d: ISODate = state.startDate
    if (compareISODate(state.startDate, today) > 0) {
      return [] as (ISODate | null)[][]
    }
    while (compareISODate(d, today) <= 0) {
      dates.push(d)
      d = addDaysISO(d, 1)
    }
    const pad = mondayPad(state.startDate)
    const cells: (ISODate | null)[] = [...Array(pad).fill(null), ...dates]
    while (cells.length % 7 !== 0) cells.push(null)
    const chunk: (ISODate | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      chunk.push(cells.slice(i, i + 7))
    }
    if (maxWeeks != null && chunk.length > maxWeeks) {
      return chunk.slice(-maxWeeks)
    }
    return chunk
  }, [state.startDate, today, maxWeeks])

  return (
    <TooltipProvider>
      <div className={cn("space-y-2 overflow-x-auto pb-1", className)}>
        <div className="flex gap-1 min-w-min">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => {
                if (!day) {
                  return <div key={`e-${wi}-${di}`} className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-sm", cellClassName)} />
                }
                const kind = cellKind(state, day, today)
                const score = state.heatmap?.[day]?.score ?? state.daily[day]?.score ?? 0
                const label = `${day} · ${kind === "fire" ? "Check-in" : kind === "miss" ? "Missed" : "Today"} · score ${Math.round(score)}`
                return (
                  <Tooltip key={day}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-sm border border-border/40 grid place-items-center text-[8px] sm:text-[9px] leading-none",
                          cellClassName
                        )}
                        style={{ backgroundColor: intensityBg(kind, score) }}
                        aria-label={label}
                      >
                        {face(kind)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="text-xs font-semibold">{day}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          ))}
        </div>
        <div className="text-[11px] text-muted-foreground">
          🔥 check-in · 😢 missed · ⚪ today
        </div>
      </div>
    </TooltipProvider>
  )
}

export function LifetimeHeatmapHeader({
  title = "Lifetime activity",
  showViewAll = true,
}: {
  title?: string
  showViewAll?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-sm font-semibold">{title}</div>
      {showViewAll ? (
        <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
          <Link href="/heatmap">View all</Link>
        </Button>
      ) : null}
    </div>
  )
}

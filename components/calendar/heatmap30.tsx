"use client"

import * as React from "react"

import { addDaysISO, compareISODate, isoToday } from "@/lib/life/dates"
import type { ISODate, LifeStateV1 } from "@/lib/life/types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function mondayIndex(iso: ISODate) {
  const d = new Date(iso + "T12:00:00.000Z").getUTCDay()
  return (d + 6) % 7
}

type HStatus = "fire" | "miss" | "neutral"

function heatStatus(state: LifeStateV1, day: ISODate, today: ISODate): HStatus {
  const h = state.heatmap?.[day]
  if (h?.status === "fire") return "fire"
  if (h?.status === "miss") return "miss"
  if (state.daily[day]?.checkIn) return "fire"
  if (compareISODate(day, today) < 0) return "miss"
  return "neutral"
}

function face(s: HStatus) {
  if (s === "fire") return "🔥"
  if (s === "miss") return "😢"
  return "⚪"
}

function ringFor(s: HStatus) {
  if (s === "fire") return "ring-emerald-400/30"
  if (s === "miss") return "ring-rose-400/35"
  return "ring-orange-400/20"
}

function bgFor(s: HStatus, score: number) {
  const t = Math.max(0, Math.min(1, score / 100))
  if (s === "fire") return `rgba(16, 185, 129, ${0.08 + t * 0.4})`
  if (s === "miss") return `rgba(244, 63, 94, ${0.08 + (1 - t) * 0.25})`
  return "rgba(249, 115, 22, 0.08)"
}

export function Heatmap30({ state, className }: { state: LifeStateV1; className?: string }) {
  const today = isoToday()
  const days: ISODate[] = React.useMemo(() => {
    const out: ISODate[] = []
    for (let i = 29; i >= 0; i--) out.push(addDaysISO(today, -i))
    return out
  }, [today])

  const start = days[0]
  const startOffset = mondayIndex(start)
  const cells: Array<{ key: string; day?: ISODate }> = []
  for (let i = 0; i < startOffset; i++) cells.push({ key: `p${i}` })
  for (const d of days) cells.push({ key: d, day: d })
  while (cells.length % 7 !== 0) cells.push({ key: `t${cells.length}` })

  return (
    <TooltipProvider>
      <div className={cn("space-y-2", className)}>
        <div className="grid grid-cols-7 gap-2 text-[11px] text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((c) => {
            if (!c.day) {
              return <div key={c.key} className="h-9 rounded-lg border border-transparent" />
            }

            const hs = heatStatus(state, c.day, today)
            const score = state.heatmap?.[c.day]?.score ?? state.daily[c.day]?.score ?? 0
            const smoke = state.daily[c.day]?.smokeCount ?? 0

            return (
              <Tooltip key={c.key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "h-9 rounded-xl border bg-card/30 text-sm transition-colors",
                      "hover:bg-muted/50",
                      "ring-1",
                      ringFor(hs)
                    )}
                    style={{ backgroundColor: bgFor(hs, score) }}
                    aria-label={`${c.day} ${hs}`}
                  >
                    <span className="grid place-items-center">{face(hs)}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs font-semibold">{c.day}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {hs === "fire" ? "Check-in" : hs === "miss" ? "Missed" : "In progress"} · Score:{" "}
                    <span className="text-foreground">{Math.round(score)}</span> · Smoke:{" "}
                    <span className="text-foreground">{smoke}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}

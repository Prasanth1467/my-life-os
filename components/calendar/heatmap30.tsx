"use client"

import * as React from "react"

import { addDaysISO, isoToday } from "@/lib/life/dates"
import type { ISODate, LifeStateV1 } from "@/lib/life/types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function compareISO(a: ISODate, b: ISODate) {
  return a < b ? -1 : a > b ? 1 : 0
}

function faceFor(status: "done" | "missed" | "ongoing" | "paused") {
  if (status === "done") return "🔥"
  if (status === "missed") return "😭"
  if (status === "paused") return "⏸"
  return "⚪"
}

function ringFor(status: "done" | "missed" | "ongoing" | "paused") {
  if (status === "done") return "ring-emerald-400/30"
  if (status === "missed") return "ring-rose-400/35"
  if (status === "paused") return "ring-zinc-400/20"
  return "ring-orange-400/20"
}

function bgFor(status: "done" | "missed" | "ongoing" | "paused") {
  if (status === "done") return "bg-emerald-500/10"
  if (status === "missed") return "bg-rose-500/10"
  if (status === "paused") return "bg-zinc-500/10"
  return "bg-orange-500/10"
}

export function Heatmap30({ state, className }: { state: LifeStateV1; className?: string }) {
  const today = isoToday()
  const days: ISODate[] = React.useMemo(() => {
    const out: ISODate[] = []
    for (let i = 29; i >= 0; i--) out.push(addDaysISO(today, -i))
    return out
  }, [today])

  // Arrange into a calendar-like grid (Mon..Sun)
  const weekday = (iso: ISODate) => new Date(iso).getDay() // 0..6 (Sun..Sat)
  const monIndex = (d: number) => (d + 6) % 7 // Mon=0..Sun=6

  const start = days[0]
  const startOffset = monIndex(weekday(start)) // leading blanks before first day
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

            const raw = state.daily[c.day]?.status ?? "ongoing"
            const status =
              raw === "ongoing" && compareISO(c.day, today) === -1 ? ("missed" as const) : (raw as "done" | "missed" | "ongoing" | "paused")

            const score = state.daily[c.day]?.score ?? 0
            const smoke = state.daily[c.day]?.smokeCount ?? 0

            return (
              <Tooltip key={c.key}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "h-9 rounded-xl border bg-card/30 text-sm transition-colors",
                      "hover:bg-muted/50",
                      "ring-1",
                      ringFor(status),
                      bgFor(status)
                    )}
                    aria-label={`${c.day} ${status}`}
                  >
                    <span className="grid place-items-center">{faceFor(status)}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs font-semibold">{c.day}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Status: <span className="text-foreground">{status}</span> · Score: <span className="text-foreground">{score}</span> · Smoke:{" "}
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


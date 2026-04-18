"use client"

import * as React from "react"
import { Flame } from "lucide-react"

import { cn } from "@/lib/utils"
import type { DayStatus, ISODate, LifeStateV1 } from "@/lib/life/types"
import { isoToday, toISODateLocal } from "@/lib/life/dates"

function iso(d: Date): ISODate {
  return toISODateLocal(d)
}

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

function statusColor(status: DayStatus | "empty") {
  if (status === "done") return "bg-emerald-500/70"
  if (status === "missed") return "bg-rose-500/70"
  if (status === "paused") return "bg-zinc-500/40"
  if (status === "ongoing") return "bg-orange-500/50"
  return "bg-transparent"
}

function compareISO(a: ISODate, b: ISODate) {
  return a < b ? -1 : a > b ? 1 : 0
}

export function MonthGrid({
  state,
  month,
  onPickDay,
}: {
  state: LifeStateV1
  month: Date
  onPickDay: (day: ISODate) => void
}) {
  const first = startOfMonth(month)
  const offset = first.getDay() // 0..6
  const totalDays = daysInMonth(month)
  const today = isoToday()

  const cells: Array<{ key: string; label: string; day?: ISODate; status: DayStatus | "empty" }> = []
  for (let i = 0; i < offset; i++) cells.push({ key: `p${i}`, label: "", status: "empty" })
  for (let d = 1; d <= totalDays; d++) {
    const dd = new Date(month.getFullYear(), month.getMonth(), d)
    const day = iso(dd)
    const heat = state.heatmap?.[day]
    let status: DayStatus
    if (heat?.status === "fire") status = "done"
    else if (heat?.status === "miss") status = "missed"
    else {
      const raw = state.daily[day]?.status ?? "ongoing"
      status = raw === "ongoing" && compareISO(day, today) === -1 ? "missed" : raw
    }
    cells.push({ key: day, label: String(d), day, status })
  }
  while (cells.length % 7 !== 0) cells.push({ key: `t${cells.length}`, label: "", status: "empty" })

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((c) => {
          const isClickable = Boolean(c.day)
          const isToday = Boolean(c.day && c.day === today)
          return (
            <button
              key={c.key}
              className={cn(
                "h-10 rounded-lg border text-sm transition-colors",
                isClickable ? "hover:bg-muted/50" : "cursor-default border-transparent",
                isToday && "ring-2 ring-orange-400/60 ring-offset-2 ring-offset-background"
              )}
              onClick={() => c.day && onPickDay(c.day)}
              disabled={!isClickable}
            >
              <div className="flex h-full items-center justify-center gap-2">
                <span className="text-sm font-medium">{c.label}</span>
                {c.day && c.status === "done" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <Flame className="size-3" />
                  </span>
                ) : c.day ? (
                  <span className={cn("size-2 rounded-sm", statusColor(c.status))} />
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function useMonthNav(initial = new Date()) {
  const [month, setMonth] = React.useState(() => startOfMonth(initial))
  const prev = React.useCallback(() => setMonth((m) => addMonths(m, -1)), [])
  const next = React.useCallback(() => setMonth((m) => addMonths(m, 1)), [])
  return { month, prev, next, setMonth }
}


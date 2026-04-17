"use client"

import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Heatmap30 } from "@/components/calendar/heatmap30"
import { MonthGrid, useMonthNav } from "@/components/calendar/month-grid"
import { useLifeStore } from "@/lib/store/lifeStore"
import { computeDisciplineStats } from "@/lib/life/stats"
import { isoToday } from "@/lib/life/dates"
import type { ISODate } from "@/lib/life/types"

export default function CalendarPage() {
  const state = useLifeStore((s) => s.state)
  const { month, prev, next } = useMonthNav(new Date())
  const stats = React.useMemo(() => computeDisciplineStats(state, isoToday()), [state])

  const [picked, setPicked] = React.useState<ISODate | null>(null)
  const day = picked ? state.daily[picked] : null

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <CalendarDays className="size-5 text-orange-400" /> Calendar
        </div>
        <div className="text-sm text-muted-foreground">Click any day for status + details.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </CardTitle>
              <CardDescription>Done / Missed / Ongoing / Paused</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={prev} aria-label="Previous month">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={next} aria-label="Next month">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <MonthGrid state={state} month={month} onPickDay={(d) => setPicked(d)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discipline Metrics</CardTitle>
            <CardDescription>Real-time streak + accountability.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Current streak</div>
                <Badge variant={stats.currentStreak >= 7 ? "success" : "outline"}>{stats.currentStreak}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Max streak</div>
                <Badge variant="outline">{stats.bestStreak}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Days wasted</div>
                <Badge variant={stats.daysWasted > 0 ? "danger" : "success"}>{stats.daysWasted}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Consistency</div>
                <Badge variant={stats.consistencyPct >= 70 ? "success" : stats.consistencyPct >= 40 ? "warning" : "danger"}>
                  {stats.consistencyPct}%
                </Badge>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Insight</div>
                <div className="mt-1 text-sm font-medium">
                  {stats.onBestRun
                    ? "You are currently on your best run."
                    : stats.lastBreakAfterDays
                      ? `You broke your streak after ${stats.lastBreakAfterDays} days.`
                      : "Start the run. One done day changes identity."}
                </div>
              </div>

              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-2">30-day view</div>
                <Heatmap30 state={state} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(picked)} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{picked ?? ""}</DialogTitle>
            <DialogDescription>
              Status: <span className="font-semibold text-foreground">{day?.status ?? "ongoing"}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="text-lg font-extrabold">{day?.score ?? 0}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Smoke</div>
                <div className="text-lg font-extrabold">{day?.smokeCount ?? 0}</div>
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Tasks</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(day?.todayTasks ?? {}).map(([k, v]) => (
                  <Badge key={k} variant={v ? "success" : "outline"}>
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
            {day?.checkIn && (
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Check-In Win</div>
                <div className="mt-1 text-sm font-medium">{day.checkIn.mandatoryWin}</div>
                <div className="mt-2 text-xs text-muted-foreground">Tomorrow plan</div>
                <div className="mt-1 text-sm">{day.checkIn.tomorrowPlan}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicked(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


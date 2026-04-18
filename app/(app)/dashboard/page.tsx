"use client"

import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Heatmap30 } from "@/components/calendar/heatmap30"
import { Sparkline } from "@/components/charts/sparkline"
import { Bars } from "@/components/charts/bars"
import { DailyQuoteHero } from "@/components/quotes/daily-quote-hero"
import { addDaysISO, isoToday } from "@/lib/life/dates"
import { smokeGoalForDay } from "@/lib/life/engine"
import { useLifeDerived, useLifeStore } from "@/lib/store/lifeStore"
import type { ISODate } from "@/lib/life/types"
import { useDailyQuote } from "@/lib/quotes/use-daily-quote"
import { computeDisciplineStats } from "@/lib/life/stats"

export default function DashboardPage() {
  const derived = useLifeDerived()
  const state = useLifeStore((s) => s.state)
  const today = isoToday()
  const quote = useDailyQuote(today)
  const stats = React.useMemo(() => computeDisciplineStats(state, today), [state, today])

  const weekDays = React.useMemo(() => {
    const out: ISODate[] = []
    for (let i = 6; i >= 0; i--) out.push(addDaysISO(today, -i))
    return out
  }, [today])

  const weekScores = weekDays.map((d) => state.daily[d]?.score ?? null)
  const weekSmoke = weekDays.map((d) => state.daily[d]?.smokeCount ?? 0)
  const weekGoals = weekDays.map((d) => smokeGoalForDay(state, d))
  const doneCount7 = weekDays.filter((d) => state.daily[d]?.status === "done").length

  const riskAlerts = React.useMemo(() => {
    const alerts: Array<{ tone: "danger" | "warning" | "success"; title: string; body: string }> = []
    const sm = state.daily[today]?.smokeCount ?? 0
    const goal = smokeGoalForDay(state, today)
    if (derived.progress < 40) {
      alerts.push({ tone: "danger", title: "Execution risk", body: "You’re below 40% today. Finish one task when you can to restart momentum." })
    } else if (derived.progress < 80) {
      alerts.push({ tone: "warning", title: "Close the day", body: "You’re not done yet. Focus Mode and one-click wins still help." })
    } else {
      alerts.push({ tone: "success", title: "Winning today", body: "Strong execution today. Optional check-in can capture the win whenever you want." })
    }
    if (sm > goal) {
      alerts.push({ tone: "danger", title: "Smoke overflow", body: `You’re over goal by ${sm - goal}. Replace next craving with a 2-minute walk.` })
    }
    if (state.gamification.streak === 0) {
      alerts.push({ tone: "warning", title: "No active streak", body: "A check-in on a solid day starts the streak—only when you choose to." })
    }
    return alerts
  }, [derived.progress, state, today])

  return (
    <div className="space-y-6">
      <DailyQuoteHero quote={quote} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today Score</CardTitle>
            <CardDescription>Are you winning or losing today?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{derived.score}</div>
            <div className="mt-2">
              <Progress value={derived.score} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{derived.progress}% execution</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Streaks</CardTitle>
            <CardDescription>Accountability is compounding.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-extrabold">{derived.streak}</div>
                <div className="text-xs text-muted-foreground">current streak</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{derived.bestStreak}</div>
                <div className="text-xs text-muted-foreground">best</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Perfect days: {derived.perfectDays}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>Days wasted: {stats.daysWasted}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>Consistency: {stats.consistencyPct}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>7-day execution + smoke.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{doneCount7}/7 done</div>
              <Badge variant="outline">smoke</Badge>
            </div>
            <div className="mt-3">
              <Bars
                values={weekSmoke}
                height={54}
                maxValue={Math.max(1, ...weekSmoke, ...weekGoals)}
                dangerOver={(v, i) => v > weekGoals[i]}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calendar (30 days)</CardTitle>
            <CardDescription>Recent check-ins and misses. Open the full grid from the link below.</CardDescription>
          </CardHeader>
          <CardContent>
            <Heatmap30 state={state} showViewAll />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trend</CardTitle>
            <CardDescription>Last 7 days score.</CardDescription>
          </CardHeader>
          <CardContent>
            <Sparkline values={weekScores} height={70} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {riskAlerts.map((a, idx) => (
          <Card key={idx} className="relative overflow-hidden">
            <div
              className={
                a.tone === "success"
                  ? "absolute inset-x-0 top-0 h-0.5 bg-emerald-500/80"
                  : a.tone === "warning"
                    ? "absolute inset-x-0 top-0 h-0.5 bg-amber-500/80"
                    : "absolute inset-x-0 top-0 h-0.5 bg-rose-500/80"
              }
            />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant={a.tone === "success" ? "success" : a.tone === "warning" ? "warning" : "danger"}>
                  {a.tone.toUpperCase()}
                </Badge>
                {a.title}
              </CardTitle>
              <CardDescription>{a.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}


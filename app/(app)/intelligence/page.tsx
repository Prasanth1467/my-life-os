"use client"

import * as React from "react"
import { Gauge, Lightbulb, ShieldAlert, ThumbsUp } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heatmap30 } from "@/components/calendar/heatmap30"
import { addDaysISO, isoToday } from "@/lib/life/dates"
import { smokeGoalForDay } from "@/lib/life/engine"
import { computeDisciplineStats } from "@/lib/life/stats"
import { useLifeDerived, useLifeStore } from "@/lib/store/lifeStore"
import type { LifeStateV1 } from "@/lib/life/types"

type Insight = { tone: "success" | "warning" | "danger"; title: string; body: string }

function computeInsights(st: LifeStateV1): Insight[] {
  const today = isoToday()
  const d = st.daily[today]
  const score = d?.score ?? 0
  const smoke = d?.smokeCount ?? 0
  const smokeGoal = smokeGoalForDay(st, today)
  const insights: Insight[] = []

  if (score >= 85) {
    insights.push({ tone: "success", title: "You are winning today", body: "Protect the win: finish check-in and sleep on time. Repeat tomorrow." })
  } else if (score >= 50) {
    insights.push({ tone: "warning", title: "Close the gap", body: "You’re mid-pack today. Finish one task immediately to push momentum." })
  } else {
    insights.push({ tone: "danger", title: "Execution crash risk", body: "Start the smallest next action. One completion restarts dopamine and identity." })
  }

  if (smoke > smokeGoal) {
    insights.push({ tone: "danger", title: "Smoke overflow", body: `Over goal by ${smoke - smokeGoal}. Identify trigger: stress/boredom/breaks. Replace ritual now.` })
  } else {
    insights.push({ tone: "success", title: "Smoke under control", body: "Good. Keep environment friction: no packs within reach, water ready, short walk available." })
  }

  const last7 = Array.from({ length: 7 }, (_, i) => addDaysISO(today, -(6 - i)))
  const done7 = last7.filter((d) => st.daily[d]?.status === "done").length
  if (done7 >= 5) insights.push({ tone: "success", title: "Consistency is compounding", body: `${done7}/7 done. Your system is working. Keep the check-in sacred.` })
  else if (done7 >= 3) insights.push({ tone: "warning", title: "Inconsistent week", body: `${done7}/7 done. Build the 7-day streak by reducing task scope, not skipping.` })
  else insights.push({ tone: "danger", title: "Low weekly reliability", body: `${done7}/7 done. Your plan is too big or environment is hostile. Cut scope; remove friction.` })

  // reinforcement
  insights.push({ tone: "success", title: "Rule", body: "Motivation is irrelevant. The system runs. One task is enough to keep identity alive." })
  return insights
}

export default function IntelligencePage() {
  const derived = useLifeDerived()
  const state = useLifeStore((s) => s.state)

  const insights = React.useMemo(() => computeInsights(state), [state])
  const stats = React.useMemo(() => computeDisciplineStats(state, derived.today), [state, derived.today])
  const last7 = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(derived.today, -(6 - i))), [derived.today])
  const done7 = last7.filter((d) => state.daily[d]?.status === "done").length

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Gauge className="size-5 text-orange-400" /> Intelligence
        </div>
        <div className="text-sm text-muted-foreground">Rule-based insights. Fully offline. No cloud.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-400" /> Smart Insights
            </CardTitle>
            <CardDescription>Winning signals + risk detection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((i, idx) => (
              <div key={idx} className="rounded-xl border p-4">
                <div className="flex items-center gap-2">
                  <Badge variant={i.tone === "success" ? "success" : i.tone === "warning" ? "warning" : "danger"}>
                    {i.tone.toUpperCase()}
                  </Badge>
                  <div className="text-sm font-semibold">{i.title}</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{i.body}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-400" /> Risk Panel
            </CardTitle>
            <CardDescription>Fast visual: last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Heatmap30 state={state} />
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Weekly summary</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-2">
                  <div className="text-[11px] text-muted-foreground">Done (7d)</div>
                  <div className="text-lg font-extrabold">{done7}/7</div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-[11px] text-muted-foreground">Consistency</div>
                  <div className="text-lg font-extrabold">{stats.consistencyPct}%</div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-[11px] text-muted-foreground">Days wasted</div>
                  <div className="text-lg font-extrabold">{stats.daysWasted}</div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-[11px] text-muted-foreground">Best streak</div>
                  <div className="text-lg font-extrabold">{stats.bestStreak}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {stats.onBestRun ? "You are currently on your best run." : stats.lastBreakAfterDays ? `You broke your streak after ${stats.lastBreakAfterDays} days.` : "Start the run. Today decides identity."}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Today</div>
              <div className="mt-1 flex items-center justify-between">
                <div className="text-sm font-semibold">Score</div>
                <Badge variant={derived.score >= 85 ? "success" : derived.score >= 50 ? "warning" : "danger"}>{derived.score}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-semibold">Streak</div>
                <Badge variant={derived.streak >= 7 ? "success" : "outline"}>{derived.streak}</Badge>
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <ThumbsUp className="size-4 text-emerald-400" />
                <div className="text-sm font-semibold">Suggestion</div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                If you feel resistance, reduce scope by 80% and start anyway. The habit matters more than volume.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


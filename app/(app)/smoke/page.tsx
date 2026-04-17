"use client"

import * as React from "react"
import { Cigarette, TriangleAlert } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bars } from "@/components/charts/bars"
import { addDaysISO, isoToday } from "@/lib/life/dates"
import { smokeGoalForDay } from "@/lib/life/engine"
import { actions, useLifeStore } from "@/lib/store/lifeStore"
import type { ISODate } from "@/lib/life/types"

export default function SmokePage() {
  const a = React.useMemo(() => actions(), [])
  const st = useLifeStore((s) => s.state)
  const today = isoToday()
  const smoke = st.daily[today]?.smokeCount ?? 0
  const goal = smokeGoalForDay(st, today)

  const days = React.useMemo(() => {
    const out: ISODate[] = []
    for (let i = 13; i >= 0; i--) out.push(addDaysISO(today, -i))
    return out
  }, [today])
  const values = days.map((d) => st.daily[d]?.smokeCount ?? 0)
  const goals = days.map((d) => smokeGoalForDay(st, d))

  const over = smoke > goal
  const pattern = React.useMemo(() => {
    const last7 = values.slice(-7)
    const last7Goals = goals.slice(-7)
    const overDays = last7.filter((v, i) => v > last7Goals[i]).length
    if (overDays >= 4) {
      return { tone: "danger" as const, title: "Risk pattern", body: "4+ of last 7 days exceeded goal. You’re trending up." }
    }
    if (overDays >= 2) {
      return { tone: "warning" as const, title: "Watch the slope", body: "You’ve exceeded goal multiple times recently. Add friction now." }
    }
    return { tone: "success" as const, title: "Control trending", body: "You’re staying at/under goal. Keep the replacement ritual." }
  }, [goals, values])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Cigarette className="size-5 text-orange-400" /> Smoke Control
        </div>
        <div className="text-sm text-muted-foreground">Track, reduce, detect patterns. No excuses.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CardDescription>Log quickly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-extrabold">{smoke}</div>
              <Badge variant={over ? "danger" : "success"}>goal ≤ {goal}</Badge>
            </div>
            <Input
              type="number"
              min={0}
              value={String(smoke)}
              onChange={(e) => a.setSmokeCount(today, Number(e.target.value))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => a.setSmokeCount(today, Math.max(0, smoke - 1))}>
                -1
              </Button>
              <Button onClick={() => a.setSmokeCount(today, smoke + 1)}>+1</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>14-day Trend</CardTitle>
            <CardDescription>Bars turn red when over goal.</CardDescription>
          </CardHeader>
          <CardContent>
            <Bars
              values={values}
              height={70}
              maxValue={Math.max(1, ...values, ...goals)}
              dangerOver={(v, i) => v > goals[i]}
            />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
              {days.slice(-4).map((d, idx) => (
                <div key={d} className="rounded-lg border p-2">
                  <div className="font-medium text-foreground">{d}</div>
                  <div>
                    {values[values.length - 4 + idx]} / goal {goals[goals.length - 4 + idx]}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-amber-400" /> Intelligence
          </CardTitle>
          <CardDescription>Pattern detection + warning system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge variant={pattern.tone === "success" ? "success" : pattern.tone === "warning" ? "warning" : "danger"}>
            {pattern.title}
          </Badge>
          <div className="text-sm">{pattern.body}</div>
          <div className="text-sm text-muted-foreground">
            Replacement protocol: cravings → 2-minute walk + water + 10 slow breaths. The goal is to break the loop, not win a debate.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


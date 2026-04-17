"use client"

import * as React from "react"
import { Activity } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkline } from "@/components/charts/sparkline"
import { Bars } from "@/components/charts/bars"
import { addDaysISO, isoToday } from "@/lib/life/dates"
import { smokeGoalForDay } from "@/lib/life/engine"
import { useLifeStore } from "@/lib/store/lifeStore"
import type { ISODate } from "@/lib/life/types"

export default function AnalyticsPage() {
  const st = useLifeStore((s) => s.state)
  const today = isoToday()

  const days30 = React.useMemo(() => {
    const out: ISODate[] = []
    for (let i = 29; i >= 0; i--) out.push(addDaysISO(today, -i))
    return out
  }, [today])

  const completion = days30.map((d) => {
    const t = st.daily[d]?.todayTasks
    if (!t) return null
    const keys = Object.keys(t) as Array<keyof typeof t>
    const done = keys.filter((k) => t[k]).length
    return Math.round((done / Math.max(1, keys.length)) * 100)
  })
  const scores = days30.map((d) => st.daily[d]?.score ?? null)
  const smoke = days30.map((d) => st.daily[d]?.smokeCount ?? 0)
  const smokeGoals = days30.map((d) => smokeGoalForDay(st, d))

  const dsaDone = Object.values(st.dsaDone).filter(Boolean).length
  const angDone = Object.values(st.angularDone).filter(Boolean).length

  const health = days30.map((d) => {
    const t = st.daily[d]?.todayTasks
    if (!t) return null
    const keys = ["walk", "water", "sleep", "phone", "nosmoke"] as const
    const doneCount = keys.filter((k) => t[k]).length
    return Math.round((doneCount / keys.length) * 100)
  })

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Activity className="size-5 text-orange-400" /> Analytics
        </div>
        <div className="text-sm text-muted-foreground">Offline charts. Smooth rendering. No CDN.</div>
      </div>

      <Tabs defaultValue="completion">
        <TabsList>
          <TabsTrigger value="completion">Completion</TabsTrigger>
          <TabsTrigger value="smoke">Smoke</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="completion">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Execution % (30d)</CardTitle>
                <CardDescription>Tasks completed each day.</CardDescription>
              </CardHeader>
              <CardContent>
                <Sparkline values={completion} height={90} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Score (30d)</CardTitle>
                <CardDescription>Outcome metric (0–100).</CardDescription>
              </CardHeader>
              <CardContent>
                <Sparkline values={scores} height={90} strokeClassName="stroke-violet-400" fillClassName="fill-violet-500/10" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="smoke">
          <Card>
            <CardHeader>
              <CardTitle>Smoke Trend (30d)</CardTitle>
              <CardDescription>Bars go red when you exceed goal.</CardDescription>
            </CardHeader>
            <CardContent>
              <Bars
                values={smoke}
                height={90}
                maxValue={Math.max(1, ...smoke, ...smokeGoals)}
                dangerOver={(v, i) => v > smokeGoals[i]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Health % (30d)</CardTitle>
              <CardDescription>Walk/water/sleep/phone/no-smoke completion.</CardDescription>
            </CardHeader>
            <CardContent>
              <Sparkline values={health} height={90} strokeClassName="stroke-amber-400" fillClassName="fill-amber-500/10" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>DSA done</CardTitle>
                <CardDescription>Total marked complete.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-extrabold">{dsaDone}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Angular done</CardTitle>
                <CardDescription>Total marked complete.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-extrabold">{angDone}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}


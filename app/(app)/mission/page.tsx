"use client"

import * as React from "react"
import { Target, Zap } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLifeDerived, useLifeStore } from "@/lib/store/lifeStore"
import { dayNumber } from "@/lib/life/engine"
import { isoToday } from "@/lib/life/dates"

const QUOTES = [
  { t: "Discipline beats motivation. Every time.", a: "Life OS" },
  { t: "One task done is worth more than a perfect plan.", a: "Life OS" },
  { t: "No negotiations after 9pm. System runs.", a: "Life OS" },
  { t: "Compounding is quiet. Keep going.", a: "Life OS" },
]

export default function MissionPage() {
  const derived = useLifeDerived()
  const state = useLifeStore((s) => s.state)
  const [qi, setQi] = React.useState(() => Math.floor(Math.random() * QUOTES.length))
  const q = QUOTES[qi]

  const today = isoToday()
  const dayNum = dayNumber(state, today)

  const dsaDone = Object.values(state.dsaDone).filter(Boolean).length
  const angDone = Object.values(state.angularDone).filter(Boolean).length
  const smoke = state.daily[today]?.smokeCount ?? 0

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Target className="size-5 text-orange-400" /> Mission
        </div>
        <div className="text-sm text-muted-foreground">Long-term direction. Daily execution is the engine.</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>15-Month Mission</CardTitle>
          <CardDescription>Apr 2026 → Jul 2027 · Compounding skills + behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border bg-orange-500/5 p-4">
            <div className="text-sm font-semibold text-orange-300">Quote</div>
            <div className="mt-2 text-sm italic">
              “{q.t}” <span className="text-xs text-muted-foreground">— {q.a}</span>
            </div>
            <button className="mt-3 text-xs underline underline-offset-4" onClick={() => setQi((i) => (i + 1) % QUOTES.length)}>
              New quote
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="Day on mission" value={String(dayNum)} sub="/ 450" />
            <Stat label="XP" value={String(derived.xp)} sub="total" />
            <Stat label="Streak" value={String(derived.streak)} sub="days" />
            <Stat label="Today smoke" value={String(smoke)} sub="count" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-4 text-violet-400" /> Skill Stack
                </CardTitle>
                <CardDescription>Track the outputs.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm font-semibold">DSA done</div>
                  <Badge variant="outline">{dsaDone}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm font-semibold">Angular done</div>
                  <Badge variant="outline">{angDone}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>The Daily Rule</CardTitle>
                <CardDescription>No negotiation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="rounded-lg border p-3">
                  9pm alarm → laptop open → one task → check-in. Even if tiny. Even if tired.
                </div>
                <div className="rounded-lg border p-3">
                  If you fail a day: do not spiral. Restart with a single completion. Identity over perfection.
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">
        {value} <span className="text-xs font-medium text-muted-foreground">{sub}</span>
      </div>
    </div>
  )
}


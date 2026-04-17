"use client"

import * as React from "react"
import { BookOpen, CheckCircle2, Circle } from "lucide-react"

import { ANGULAR_MODULES } from "@/lib/data/angular"
import { actions, useLifeStore } from "@/lib/store/lifeStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export default function AngularPage() {
  const a = React.useMemo(() => actions(), [])
  const done = useLifeStore((s) => s.state.angularDone)

  const totals = React.useMemo(() => {
    const total = ANGULAR_MODULES.reduce((s, m) => s + m.topics.length, 0)
    const doneCount = Object.values(done).filter(Boolean).length
    const pct = total ? Math.round((doneCount / total) * 100) : 0
    return { total, doneCount, pct }
  }, [done])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <BookOpen className="size-5 text-orange-400" /> Angular
          </div>
          <div className="text-sm text-muted-foreground">Company-grade skill. Build real features. Track done.</div>
        </div>
        <div className="text-right">
          <Badge variant="outline">
            {totals.doneCount}/{totals.total}
          </Badge>
          <div className="mt-2 w-[220px]">
            <Progress value={totals.pct} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {ANGULAR_MODULES.map((m) => {
          const moduleTotal = m.topics.length
          const moduleDone = m.topics.filter((_, i) => done[`${m.id}|${i}`]).length
          const pct = moduleTotal ? Math.round((moduleDone / moduleTotal) * 100) : 0
          return (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{m.title}</span>
                  <Badge variant="outline">{m.week}</Badge>
                </CardTitle>
                <CardDescription>{pct}% complete</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={pct} />
                <div className="grid gap-2 md:grid-cols-2">
                  {m.topics.map((t, i) => {
                    const key = `${m.id}|${i}`
                    const isDone = Boolean(done[key])
                    return (
                      <button
                        key={key}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                          isDone && "border-emerald-500/30 bg-emerald-500/5"
                        )}
                        onClick={() => a.markAngularDone(key, !isDone)}
                      >
                        {isDone ? <CheckCircle2 className="size-4 text-emerald-400" /> : <Circle className="size-4 text-muted-foreground" />}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{t}</div>
                          <div className="text-xs text-muted-foreground">{isDone ? "+3 XP locked" : "Tap to mark done"}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}


"use client"

import * as React from "react"
import { ChevronDown, Cpu } from "lucide-react"

import { DSA_MODULES } from "@/lib/data/dsa"
import { actions, useLifeStore } from "@/lib/store/lifeStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

function totalProblems() {
  return DSA_MODULES.reduce((s, m) => s + m.sections.reduce((ss, sec) => ss + sec.problems.length, 0), 0)
}

export default function DSAPage() {
  const a = React.useMemo(() => actions(), [])
  const done = useLifeStore((s) => s.state.dsaDone)

  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    const first = DSA_MODULES[0]?.id ?? "beginner"
    return { [first]: true }
  })

  const totals = React.useMemo(() => {
    const total = totalProblems()
    const doneCount = Object.values(done).filter(Boolean).length
    return { total, doneCount, pct: total ? Math.round((doneCount / total) * 100) : 0 }
  }, [done])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Cpu className="size-5 text-orange-400" /> DSA
          </div>
          <div className="text-sm text-muted-foreground">Problems solved compounds. Track execution, not intention.</div>
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
        {DSA_MODULES.map((m) => {
          const moduleTotal = m.sections.reduce((s, sec) => s + sec.problems.length, 0)
          const moduleDone = m.sections.reduce(
            (s, sec) =>
              s +
              sec.problems.filter((_, i) => done[`${m.id}|${sec.name}|${i}`]).length,
            0
          )
          const pct = moduleTotal ? Math.round((moduleDone / moduleTotal) * 100) : 0
          const isOpen = Boolean(open[m.id])
          return (
            <Card key={m.id}>
              <CardHeader className="cursor-pointer" onClick={() => setOpen((p) => ({ ...p, [m.id]: !p[m.id] }))}>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{m.title}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">
                      {moduleDone}/{moduleTotal}
                    </Badge>
                    <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                  </span>
                </CardTitle>
                <CardDescription>{pct}% complete</CardDescription>
              </CardHeader>
              {isOpen && (
                <CardContent className="space-y-4">
                  <Progress value={pct} />
                  {m.sections.map((sec) => (
                    <div key={sec.name} className="space-y-2">
                      <div className="text-sm font-semibold">{sec.name}</div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {sec.problems.map((p, i) => {
                          const key = `${m.id}|${sec.name}|${i}`
                          const isDone = Boolean(done[key])
                          return (
                            <button
                              key={key}
                              className={cn(
                                "flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                                isDone && "border-emerald-500/30 bg-emerald-500/5"
                              )}
                              onClick={() => a.markDSADone(key, !isDone)}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{p}</div>
                                <div className="text-xs text-muted-foreground">{isDone ? "+3 XP locked" : "Tap to mark done"}</div>
                              </div>
                              <Button size="xs" variant={isDone ? "outline" : "default"} asChild>
                                <span>{isDone ? "Undo" : "Done"}</span>
                              </Button>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}


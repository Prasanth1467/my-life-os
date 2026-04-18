"use client"

import * as React from "react"
import { CheckCircle2, Focus, ListChecks, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { actions, useLifeDerived, useLifeStore } from "@/lib/store/lifeStore"
import type { TodayTaskId } from "@/lib/life/types"

type Task = { id: TodayTaskId; label: string; xp: number; tone: "orange" | "violet" | "emerald" }

const TASKS: Task[] = [
  { id: "angular", label: "Angular execution", xp: 10, tone: "orange" },
  { id: "dsa", label: "DSA execution", xp: 10, tone: "violet" },
  { id: "walk", label: "Walk 20 minutes", xp: 10, tone: "emerald" },
  { id: "water", label: "Water target", xp: 10, tone: "emerald" },
  { id: "sleep", label: "Sleep discipline", xp: 10, tone: "emerald" },
  { id: "phone", label: "Phone control", xp: 10, tone: "emerald" },
  { id: "nosmoke", label: "No smoke (or within goal)", xp: 10, tone: "emerald" },
]

function toneClass(t: Task["tone"]) {
  if (t === "orange") return "border-orange-500/30 bg-orange-500/5"
  if (t === "violet") return "border-violet-500/30 bg-violet-500/5"
  return "border-emerald-500/30 bg-emerald-500/5"
}

export default function TodayPage() {
  const a = React.useMemo(() => actions(), [])
  const derived = useLifeDerived()
  const todayTasks = useLifeStore((s) => s.state.daily[derived.today]?.todayTasks)
  const smoke = useLifeStore((s) => s.state.daily[derived.today]?.smokeCount ?? 0)
  const smokeGoal = useLifeStore((s) => s.state.settings.smoke.baselinePerDay)
  const [focus, setFocus] = React.useState(false)
  const [celebrateOpen, setCelebrateOpen] = React.useState(false)
  const celebratedRef = React.useRef(false)

  React.useEffect(() => {
    if (derived.progress === 100 && !celebratedRef.current) {
      celebratedRef.current = true
      setCelebrateOpen(true)
      window.setTimeout(() => setCelebrateOpen(false), 2600)
    }
    if (derived.progress < 100) {
      celebratedRef.current = false
    }
  }, [derived.progress])

  if (!todayTasks) return null

  return (
    <div className={cn("space-y-6", focus && "max-w-2xl mx-auto")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <ListChecks className="size-5 text-orange-400" /> Today Execution
          </div>
          <div className="text-sm text-muted-foreground">Zero friction. One click. Instant feedback.</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Progress {derived.progress}%</Badge>
          <Button variant={focus ? "default" : "outline"} onClick={() => setFocus((v) => !v)}>
            <Focus className="size-4" />
            Focus Mode
          </Button>
        </div>
      </div>

      <Card className={cn(focus && "hidden")}>
        <CardHeader>
          <CardTitle>Live Progress</CardTitle>
          <CardDescription>Instant updates + autosave. No refresh needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={cn("rounded-xl p-3", derived.progress === 100 && "border border-emerald-500/25 bg-emerald-500/5")}>
            <Progress value={derived.progress} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Score: {derived.score}/100</span>
            <span>
              Smoke: {smoke} (goal ≤ {smokeGoal})
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {TASKS.map((t) => {
          const done = Boolean(todayTasks[t.id])
          return (
            <button
              key={t.id}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/50",
                toneClass(t.tone),
                done && "opacity-95 shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_0_20px_rgba(16,185,129,0.08)]"
              )}
              onClick={() => {
                a.toggleTodayTask(t.id)
                toast(done ? `−${t.xp} XP` : `+${t.xp} XP`, {
                  description: done ? "Undo logged." : "Completion logged.",
                })
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="size-5 text-emerald-400" />
                    ) : (
                      <XCircle className="size-5 text-muted-foreground" />
                    )}
                    <div className="font-semibold truncate">{t.label}</div>
                    <Badge variant="outline" className="shrink-0">
                      <span className={cn(done && "text-emerald-400 animate-in fade-in-0 zoom-in-95")}>+{t.xp} XP</span>
                    </Badge>
                  </div>
                  {!focus && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Click once to {done ? "undo" : "complete"}.
                    </div>
                  )}
                </div>
                <div>
                  <Button variant={done ? "outline" : "default"} size="sm" asChild>
                    <span>{done ? "Undo" : "Complete"}</span>
                  </Button>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {focus && (
        <div className="text-center text-xs text-muted-foreground">
          Focus Mode is on. Only tasks remain—check in later if you want.
        </div>
      )}

      <Dialog open={celebrateOpen} onOpenChange={setCelebrateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execution Complete</DialogTitle>
            <DialogDescription>
              {smoke <= smokeGoal
                ? "Great momentum. Optional check-in can capture it tonight."
                : "Tasks done for now—adjust smoke when you can."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border p-4 text-sm">
            <div className="font-semibold">Completion satisfaction</div>
            <div className="mt-1 text-muted-foreground">Rest or reflect—no required next step.</div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCelebrateOpen(false)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


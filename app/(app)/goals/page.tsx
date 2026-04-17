"use client"

import * as React from "react"
import { Goal, Plus, Target } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { actions, useLifeStore } from "@/lib/store/lifeStore"
import type { GoalCategory, GoalHorizon, Mission } from "@/lib/life/types"

const horizonOptions = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "longterm", label: "Long-term" },
]
const categoryOptions = [
  { value: "dsa", label: "DSA" },
  { value: "angular", label: "Angular" },
  { value: "health", label: "Health" },
  { value: "smoke", label: "Smoke" },
  { value: "general", label: "General" },
]

export default function GoalsPage() {
  const a = React.useMemo(() => actions(), [])
  const state = useLifeStore((s) => s.state)

  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [horizon, setHorizon] = React.useState<GoalHorizon>("weekly")
  const [category, setCategory] = React.useState<GoalCategory>("general")

  function addGoal() {
    const t = title.trim()
    if (!t) return
    a.addGoal({ title: t, horizon, category })
    setOpen(false)
    setTitle("")
  }

  // Temporary until goal actions are added to store: render read-only from state.
  const goals = state.goals
  const missions = state.missions

  const grouped = React.useMemo(() => {
    const by: Record<string, typeof goals> = { weekly: [], monthly: [], longterm: [] }
    for (const g of goals) by[g.horizon].push(g)
    return by
  }, [goals])

  const activeMissions = missions.filter((m) => m.active)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Goal className="size-5 text-orange-400" /> Goals → Missions
          </div>
          <div className="text-sm text-muted-foreground">Goals become missions. Missions drive daily execution.</div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="size-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Goal</DialogTitle>
              <DialogDescription>Create a goal. It will also generate a mission.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Title</div>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Solve 20 DSA problems" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Horizon</div>
                  <Select value={horizon} onChange={(e) => setHorizon(e.target.value as GoalHorizon)} options={horizonOptions} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Category</div>
                  <Select value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)} options={categoryOptions} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addGoal}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-4 text-violet-400" /> Active Missions
          </CardTitle>
          <CardDescription>What matters right now.</CardDescription>
        </CardHeader>
        <CardContent>
          {activeMissions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No missions yet. Add a goal to generate missions.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {activeMissions.map((m) => (
                <MissionCard key={m.id} mission={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {(["weekly", "monthly", "longterm"] as const).map((h) => (
          <Card key={h}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{h === "weekly" ? "Weekly" : h === "monthly" ? "Monthly" : "Long-term"}</span>
                <Badge variant="outline">{grouped[h].length}</Badge>
              </CardTitle>
              <CardDescription>Progress per goal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped[h].length === 0 ? (
                <div className="text-sm text-muted-foreground">None</div>
              ) : (
                grouped[h].map((g) => (
                  <div key={g.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{g.title}</div>
                        <div className="text-xs text-muted-foreground">{g.category}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{g.progressPct}%</Badge>
                        <Button variant="outline" size="xs" onClick={() => a.deleteGoal(g.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Progress value={g.progressPct} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => a.updateGoalProgress(g.id, -10)}>
                        -10%
                      </Button>
                      <Button size="sm" onClick={() => a.updateGoalProgress(g.id, 10)}>
                        +10%
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function MissionCard({ mission }: { mission: Mission }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{mission.title}</div>
          <div className="text-xs text-muted-foreground">
            {mission.horizon} · {mission.category}
          </div>
        </div>
        <Badge variant="outline">{mission.progressPct}%</Badge>
      </div>
      <div className="mt-2">
        <Progress value={mission.progressPct} />
      </div>
    </div>
  )
}


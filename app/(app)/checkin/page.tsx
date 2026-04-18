"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ClipboardCheck, Moon, Timer, Trophy, Zap } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { actions, useLifeDerived, useLifeStore } from "@/lib/store/lifeStore"
import { isoToday } from "@/lib/life/dates"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

type Step = "summary" | "win" | "journal" | "plan" | "done"

function toInt(v: string): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

function readSnooze(): { count: number; until: number } {
  const key = `lifeos:snooze:${isoToday()}`
  const raw = window.sessionStorage.getItem(key)
  if (!raw) return { count: 0, until: 0 }
  try {
    const parsed = JSON.parse(raw) as { count: number; until: number }
    return { count: parsed.count ?? 0, until: parsed.until ?? 0 }
  } catch {
    return { count: 0, until: 0 }
  }
}

function writeSnooze(next: { count: number; until: number }) {
  const key = `lifeos:snooze:${isoToday()}`
  window.sessionStorage.setItem(key, JSON.stringify(next))
}

export default function CheckInPage() {
  const router = useRouter()
  const a = React.useMemo(() => actions(), [])
  const derived = useLifeDerived()
  const st = useLifeStore((s) => s.state)
  const today = derived.today
  const daily = st.daily[today]
  const draft = daily?.checkInDraft

  const maxSnoozes = st.settings.checkIn.maxSnoozes
  const snoozeMinutes = st.settings.checkIn.snoozeMinutes

  const [step, setStep] = React.useState<Step>(() => (daily?.checkIn ? "done" : draft ? "win" : "summary"))
  const [win, setWin] = React.useState(() => draft?.mandatoryWin ?? "")
  const [journal, setJournal] = React.useState(() => draft?.journalText ?? "")
  const [tomorrow, setTomorrow] = React.useState(() => draft?.tomorrowPlan ?? "")
  const [smoke, setSmoke] = React.useState<number>(() => draft?.smokeCount ?? daily?.smokeCount ?? 0)
  const [error, setError] = React.useState<string | null>(null)

  const done = Boolean(daily?.checkIn)

  React.useEffect(() => {
    a.ensureToday()
  }, [a])

  // Keep local form in sync if a draft arrives after hydration.
  React.useEffect(() => {
    if (!draft) return
    setWin((v) => (v ? v : draft.mandatoryWin))
    setJournal((v) => (v ? v : draft.journalText))
    setTomorrow((v) => (v ? v : draft.tomorrowPlan))
    setSmoke((v) => (v ? v : draft.smokeCount))
  }, [draft])

  // Autosave draft smoothly while typing (local-first store + persistence)
  React.useEffect(() => {
    if (done) return
    const t = window.setTimeout(() => {
      a.updateCheckinDraft({
        mandatoryWin: win,
        journalText: journal,
        tomorrowPlan: tomorrow,
        smokeCount: smoke,
      })
    }, 350)
    return () => window.clearTimeout(t)
  }, [a, done, journal, smoke, tomorrow, win])

  const snooze = React.useMemo(() => (typeof window !== "undefined" ? readSnooze() : { count: 0, until: 0 }), [])
  const snoozesLeft = Math.max(0, maxSnoozes - snooze.count)

  function doSnooze() {
    if (snoozesLeft <= 0) return
    writeSnooze({ count: snooze.count + 1, until: Date.now() + snoozeMinutes * 60_000 })
    router.push("/dashboard")
  }

  function dismissForToday() {
    const dismissKey = `lifeos:checkin:dismiss:${today}`
    window.sessionStorage.setItem(dismissKey, "1")
    toast("Draft saved", { description: "Come back whenever you like—nothing is forced." })
    router.push("/dashboard")
  }

  function next() {
    setError(null)
    if (step === "summary") return setStep("win")
    if (step === "win") {
      return setStep("journal")
    }
    if (step === "journal") return setStep("plan")
    if (step === "plan") {
      a.completeCheckin({
        mandatoryWin: win.trim() || "—",
        journalText: journal.trim() ? journal.trim() : undefined,
        tomorrowPlan: tomorrow.trim() || "—",
        smokeCount: Math.max(0, Math.floor(smoke)),
        snoozesUsed: maxSnoozes - snoozesLeft,
      })
      return setStep("done")
    }
  }

  const summaryLines = [
    {
      label: "Execution",
      value: `${derived.progress}%`,
      tone: derived.progress >= 80 ? "success" : derived.progress >= 40 ? "warning" : "danger",
    },
    { label: "Score", value: `${derived.score}/100`, tone: derived.score >= 85 ? "success" : derived.score >= 50 ? "warning" : "danger" },
    { label: "Smoke", value: `${smoke}`, tone: smoke <= (st.settings.smoke.baselinePerDay ?? 20) ? "success" : "danger" },
    { label: "XP (today)", value: `${derived.dayXp}`, tone: "outline" },
  ] as Array<{ label: string; value: string; tone: "success" | "warning" | "danger" | "outline" }>

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <ClipboardCheck className="size-5 text-orange-400" /> Optional check-in
          </div>
          <div className="text-sm text-muted-foreground">
            A soft close to the day when you want it. Everything autosaves.
          </div>
        </div>
        {!done && (
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <Timer className="size-4 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                Snoozes left: <span className="font-semibold text-foreground">{snoozesLeft}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-1" disabled={snoozesLeft <= 0} onClick={doSnooze}>
              Snooze {snoozeMinutes}m
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="size-4 text-violet-400" /> Check-In Flow
          </CardTitle>
          <CardDescription>No pressure—open this page only when it helps you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="summary" value={done ? "done" : step} onValueChange={(v) => setStep(v as Step)}>
            <TabsList className="w-full justify-between">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="win">Win</TabsTrigger>
              <TabsTrigger value="journal">Journal</TabsTrigger>
              <TabsTrigger value="plan">Tomorrow</TabsTrigger>
              <TabsTrigger value="done" disabled={!done && step !== "done"}>
                Done
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-3 mt-4">
              <div className="grid gap-2 md:grid-cols-2">
                {summaryLines.map((l) => (
                  <div key={l.label} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="text-sm font-medium">{l.label}</div>
                    <Badge variant={l.tone}>{l.value}</Badge>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold">Smoke count</div>
                <Input
                  type="number"
                  value={String(smoke)}
                  onChange={(e) => {
                    const next = toInt(e.target.value)
                    setSmoke(next)
                    a.setSmokeCount(today, next)
                    toast("Smoke updated", { description: `Today: ${next}` })
                  }}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold">Progress</div>
                <Progress value={derived.progress} />
              </div>
              <Button className="w-full" onClick={next}>
                Continue
              </Button>
              <Separator />
              <div className="text-xs text-muted-foreground text-center">Autosaved in real time. Switch tabs freely.</div>
            </TabsContent>

            <TabsContent value="win" className="space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-amber-400" />
                <div className="text-sm font-semibold">Today Win (optional)</div>
              </div>
              <Textarea
                value={win}
                onChange={(e) => setWin(e.target.value)}
                placeholder="What did you win today? (Small wins count.)"
              />
              <Button className="w-full" onClick={next}>
                Continue
              </Button>
            </TabsContent>

            <TabsContent value="journal" className="space-y-3 mt-4">
              <div className="text-sm font-semibold">Journal</div>
              <Textarea
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                placeholder="Anything to reflect on? Triggers? Wins? What to fix tomorrow?"
              />
              <Button className="w-full" onClick={next}>
                Continue
              </Button>
            </TabsContent>

            <TabsContent value="plan" className="space-y-3 mt-4">
              <div className="text-sm font-semibold">Tomorrow plan</div>
              <Textarea
                value={tomorrow}
                onChange={(e) => setTomorrow(e.target.value)}
                placeholder="Write the concrete plan: Angular + DSA + health. Make it simple."
              />
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="text-sm font-medium">Smoke count</div>
                <Badge variant="outline">{smoke}</Badge>
              </div>
              <Button className="w-full" onClick={next}>
                Complete Check-In
              </Button>
            </TabsContent>

            <TabsContent value="done" className="space-y-3 mt-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Zap className="size-4 text-orange-400" /> Summary
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">XP gained</div>
                  <div className="text-lg font-extrabold">{daily?.checkIn?.xpGained ?? 0}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Streak</div>
                  <div className="text-lg font-extrabold">{st.gamification.streak}</div>
                </div>
                <div className="rounded-lg border p-3 md:col-span-2">
                  <div className="text-xs text-muted-foreground">Insight</div>
                  <div className="text-sm">{daily?.checkIn?.insight ?? "Locked."}</div>
                </div>
              </div>
              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                Back to Dashboard
              </Button>
            </TabsContent>
          </Tabs>

          {error && <div className="text-sm text-rose-400">{error}</div>}

          {!done && step !== "done" && (
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={dismissForToday}>
                Save draft & exit
              </Button>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                Your text stays in the app. This returns you to the dashboard.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


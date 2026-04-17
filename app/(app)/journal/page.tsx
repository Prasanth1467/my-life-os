"use client"

import * as React from "react"
import { NotebookPen, Search } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Sparkline } from "@/components/charts/sparkline"
import { addDaysISO, isoToday } from "@/lib/life/dates"
import { actions, useLifeStore } from "@/lib/store/lifeStore"
import type { Mood } from "@/lib/life/types"
import { moodToScore } from "@/lib/life/engine"

const moods: Mood[] = ["🔥", "💪", "😐", "😩", "❌"]

export default function JournalPage() {
  const a = React.useMemo(() => actions(), [])
  const entries = useLifeStore((s) => s.state.journal)

  const [mood, setMood] = React.useState<Mood>("🔥")
  const [tag, setTag] = React.useState("general")
  const [text, setText] = React.useState("")
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) => e.text.toLowerCase().includes(q) || e.tag.toLowerCase().includes(q))
  }, [entries, query])

  const days7 = React.useMemo(() => {
    const t = isoToday()
    const out: string[] = []
    for (let i = 6; i >= 0; i--) out.push(addDaysISO(t, -i))
    return out
  }, [])

  const moodSeries = React.useMemo(() => {
    return days7.map((d) => {
      const dayEntries = entries.filter((e) => e.day === d)
      if (dayEntries.length === 0) return null
      const avg = dayEntries.reduce((s, e) => s + moodToScore(e.mood), 0) / dayEntries.length
      return avg
    })
  }, [days7, entries])

  const weeklyPrompt = React.useMemo(() => {
    const last = entries[0]
    if (!last) return "Write one sentence about the day. Then one sentence about what to fix tomorrow."
    if (last.text.length < 80) return "Go deeper: what triggered you today and how will you change the environment?"
    return "Great depth. Now extract one rule you will follow tomorrow."
  }, [entries])

  function save() {
    const t = text.trim()
    if (!t) return
    a.addJournal(mood, tag.trim() || "general", t)
    setText("")
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <NotebookPen className="size-5 text-orange-400" /> Journal
        </div>
        <div className="text-sm text-muted-foreground">Mood tracking, tags, search, weekly signal.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>New Entry</CardTitle>
            <CardDescription>{weeklyPrompt}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {moods.map((m) => (
                <Button key={m} variant={m === mood ? "default" : "outline"} size="sm" onClick={() => setMood(m)}>
                  {m}
                </Button>
              ))}
              <div className="ml-auto w-[180px]">
                <Select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  options={[
                    { value: "general", label: "general" },
                    { value: "work", label: "work" },
                    { value: "dsa", label: "dsa" },
                    { value: "angular", label: "angular" },
                    { value: "health", label: "health" },
                    { value: "smoke", label: "smoke" },
                  ]}
                />
              </div>
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write the truth. Short is fine. Honest is mandatory." />
            <Button className="w-full" onClick={save}>
              Save +5 XP
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mood (7d)</CardTitle>
            <CardDescription>Avg mood score.</CardDescription>
          </CardHeader>
          <CardContent>
            <Sparkline values={moodSeries} height={90} strokeClassName="stroke-violet-400" fillClassName="fill-violet-500/10" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>History</CardTitle>
            <CardDescription>Search and review.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search text or tag..." className="w-[260px]" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No entries found.</div>
          ) : (
            filtered.slice(0, 50).map((e) => (
              <div key={e.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {e.mood} {e.day}
                  </div>
                  <Badge variant="outline">{e.tag}</Badge>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{e.text}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}


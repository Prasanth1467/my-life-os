"use client"

import * as React from "react"
import { Grid3x3 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LifetimeHeatmap } from "@/components/calendar/lifetime-heatmap"
import { useLifeStore } from "@/lib/store/lifeStore"

export default function HeatmapPage() {
  const state = useLifeStore((s) => s.state)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Grid3x3 className="size-6 text-orange-400" /> Lifetime heatmap
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          One square per day since you started. Green = check-in logged; rose = missed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Scroll horizontally on smaller screens. Intensity follows your daily score.</CardDescription>
        </CardHeader>
        <CardContent>
          <LifetimeHeatmap state={state} />
        </CardContent>
      </Card>
    </div>
  )
}

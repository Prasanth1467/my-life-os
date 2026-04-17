"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export function Bars({
  values,
  height = 60,
  className,
  maxValue,
  color = "bg-emerald-500/60",
  dangerColor = "bg-rose-500/70",
  dangerOver,
}: {
  values: number[]
  height?: number
  className?: string
  maxValue?: number
  color?: string
  dangerColor?: string
  dangerOver?: (v: number, idx: number) => boolean
}) {
  const max = maxValue ?? Math.max(1, ...values)
  return (
    <div className={cn("flex items-end gap-1", className)} style={{ height }}>
      {values.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * height))
        const danger = dangerOver?.(v, i) ?? false
        return <div key={i} className={cn("w-2 rounded-sm", danger ? dangerColor : color)} style={{ height: h }} />
      })}
    </div>
  )
}


"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function normalize(values: Array<number | null>) {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
  const min = Math.min(...nums, 0)
  const max = Math.max(...nums, 1)
  const span = Math.max(1e-9, max - min)
  return { min, max, span }
}

export function Sparkline({
  values,
  height = 40,
  className,
  strokeClassName = "stroke-orange-400",
  fillClassName = "fill-orange-500/10",
}: {
  values: Array<number | null>
  height?: number
  className?: string
  strokeClassName?: string
  fillClassName?: string
}) {
  const w = Math.max(1, values.length - 1)
  const { min, span } = normalize(values)

  const points = values
    .map((v, i) => {
      if (v === null || !Number.isFinite(v)) return null
      const x = (i / w) * 100
      const y = 100 - ((v - min) / span) * 100
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .filter(Boolean)
    .join(" ")

  const area = points ? `M ${points.split(" ")[0]} L ${points} L 100,100 L 0,100 Z` : ""

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} className="w-full">
        {area && <path d={area} className={fillClassName} />}
        {points && <polyline points={points} className={cn("fill-none stroke-[2.5]", strokeClassName)} />}
      </svg>
    </div>
  )
}


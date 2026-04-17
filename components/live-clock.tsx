"use client"

import * as React from "react"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function formatDateTime(d: Date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const
  const day = days[d.getDay()]
  const dd = pad2(d.getDate())
  const mon = months[d.getMonth()]
  const yyyy = d.getFullYear()
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  const ss = pad2(d.getSeconds())
  return `${day}, ${dd} ${mon} ${yyyy} • ${hh}:${mm}:${ss}`
}

export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = React.useState(() => new Date())

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(now)}</div>
    </div>
  )
}


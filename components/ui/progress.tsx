import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({
  value = 0,
  className,
  ...props
}: React.ComponentProps<"div"> & { value?: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-500"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  )
}

export { Progress }


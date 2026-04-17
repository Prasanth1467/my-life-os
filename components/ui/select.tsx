import * as React from "react"

import { cn } from "@/lib/utils"

type SelectProps = React.ComponentProps<"select"> & {
  options: Array<{ value: string; label: string }>
}

function Select({ className, options, ...props }: SelectProps) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export { Select }


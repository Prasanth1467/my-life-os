"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type TabsCtx = {
  value: string
  setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsCtx | null>(null)

function Tabs({
  value: controlled,
  defaultValue,
  onValueChange,
  className,
  children,
}: {
  value?: string
  defaultValue: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const value = controlled ?? uncontrolled
  const setValue = React.useCallback(
    (v: string) => {
      onValueChange?.(v)
      if (controlled === undefined) setUncontrolled(v)
    },
    [onValueChange, controlled]
  )
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div data-slot="tabs" className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  value,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs")
  const active = ctx.value === value
  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      data-state={active ? "active" : "inactive"}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        active ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
        className
      )}
      onClick={() => ctx.setValue(value)}
      {...props}
    />
  )
}

function TabsContent({
  className,
  value,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("TabsContent must be used within Tabs")
  if (ctx.value !== value) return null
  return <div data-slot="tabs-content" className={cn("mt-4", className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger }


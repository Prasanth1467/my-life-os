"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

type SheetSide = "left" | "right"
type SheetCtx = { open: boolean; setOpen: (v: boolean) => void }
const SheetContext = React.createContext<SheetCtx | null>(null)

function Sheet({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (v: boolean) => void
  children: React.ReactNode
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const open = controlled ?? uncontrolled
  const setOpen = React.useCallback(
    (v: boolean) => {
      onOpenChange?.(v)
      if (controlled === undefined) setUncontrolled(v)
    },
    [controlled, onOpenChange]
  )
  return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>
}

function SheetTrigger({ children }: { children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }> }) {
  const ctx = React.useContext(SheetContext)
  if (!ctx) throw new Error("SheetTrigger must be used within Sheet")
  const childOnClick = children.props.onClick
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      childOnClick?.(e)
      ctx.setOpen(true)
    },
  })
}

function SheetContent({
  side = "left",
  className,
  children,
}: {
  side?: SheetSide
  className?: string
  children: React.ReactNode
}) {
  const ctx = React.useContext(SheetContext)
  if (!ctx) throw new Error("SheetContent must be used within Sheet")
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  React.useEffect(() => {
    if (!ctx.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [ctx])
  if (!mounted || !ctx.open) return null

  const base =
    side === "left"
      ? "left-0 top-0 h-full w-[320px] translate-x-0"
      : "right-0 top-0 h-full w-[320px] translate-x-0"

  return createPortal(
    <div data-slot="sheet-portal">
      <div
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in-0"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) ctx.setOpen(false)
        }}
      />
      <div
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 border bg-card shadow-lg animate-in slide-in-from-left-5",
          base,
          "flex flex-col",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("p-4 border-b", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-title" className={cn("text-sm font-semibold", className)} {...props} />
}

function SheetClose({ children }: { children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }> }) {
  const ctx = React.useContext(SheetContext)
  if (!ctx) throw new Error("SheetClose must be used within Sheet")
  const childOnClick = children.props.onClick
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      childOnClick?.(e)
      ctx.setOpen(false)
    },
  })
}

export { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger }


"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

type DialogCtx = {
  open: boolean
  setOpen: (v: boolean) => void
}
const DialogContext = React.createContext<DialogCtx | null>(null)

function Dialog({
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
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>
}

function DialogTrigger({ children }: { children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }> }) {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("DialogTrigger must be used within Dialog")
  const childOnClick = children.props.onClick
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      childOnClick?.(e)
      ctx.setOpen(true)
    },
  })
}

function DialogContent({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("DialogContent must be used within Dialog")
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

  return createPortal(
    <div data-slot="dialog-portal">
      <div
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in-0"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) ctx.setOpen(false)
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-5 shadow-lg animate-in fade-in-0 zoom-in-95",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("mb-3 space-y-1", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-title" className={cn("text-sm font-semibold", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-description" className={cn("text-xs text-muted-foreground", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("mt-4 flex justify-end gap-2", className)} {...props} />
}

function DialogClose({ children }: { children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }> }) {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("DialogClose must be used within Dialog")
  const childOnClick = children.props.onClick
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      childOnClick?.(e)
      ctx.setOpen(false)
    },
  })
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}


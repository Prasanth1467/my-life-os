"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { NAV_ITEMS } from "@/components/shell/nav"
import { Sidebar } from "@/components/shell/sidebar"
import { Topbar } from "@/components/shell/topbar"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { actions, useLifeStore } from "@/lib/store/lifeStore"
import { isoToday, isTimeInWindow } from "@/lib/life/dates"

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const a = React.useMemo(() => actions(), [])

  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  const { autoOpenEnabled, windowStartHour, windowEndHour, maxSnoozes, snoozeMinutes } = useLifeStore(
    (s) => s.state.settings.checkIn
  )
  const checkinCompleted = useLifeStore((s) => Boolean(s.state.daily[isoToday()]?.checkIn))

  React.useEffect(() => {
    a.ensureToday()
  }, [a])

  React.useEffect(() => {
    if (!autoOpenEnabled) return
    if (pathname === "/checkin") return
    if (checkinCompleted) return

    const now = new Date()
    if (!isTimeInWindow(now, windowStartHour, windowEndHour)) return

    // If the user dismissed check-in for today, do not force redirect.
    const dismissKey = `lifeos:checkin:dismiss:${isoToday()}`
    if (window.sessionStorage.getItem(dismissKey) === "1") return

    const snoozeKey = `lifeos:snooze:${isoToday()}`
    const snoozeRaw = window.sessionStorage.getItem(snoozeKey)
    const snooze = snoozeRaw ? (JSON.parse(snoozeRaw) as { count: number; until: number }) : { count: 0, until: 0 }
    if (snooze.until && Date.now() < snooze.until) return
    if (snooze.count >= maxSnoozes) {
      router.push("/checkin")
      return
    }

    router.push("/checkin")
  }, [autoOpenEnabled, checkinCompleted, maxSnoozes, pathname, router, windowEndHour, windowStartHour, snoozeMinutes])

  function snooze() {
    const snoozeKey = `lifeos:snooze:${isoToday()}`
    const snoozeRaw = window.sessionStorage.getItem(snoozeKey)
    const snoozeState = snoozeRaw ? (JSON.parse(snoozeRaw) as { count: number; until: number }) : { count: 0, until: 0 }
    const next = { count: snoozeState.count + 1, until: Date.now() + snoozeMinutes * 60_000 }
    window.sessionStorage.setItem(snoozeKey, JSON.stringify(next))
    a.snoozeCheckin()
  }

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="md:hidden">
          <SheetHeader className="flex items-center justify-between">
            <SheetTitle>Life OS</SheetTitle>
          </SheetHeader>
          <nav className="flex-1 overflow-auto p-2">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      active ? "bg-orange-500/10 text-orange-400" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
          <div className="border-t p-3 text-xs text-muted-foreground">
            {checkinCompleted ? "Check-in completed" : (
              <button className="underline underline-offset-4" onClick={snooze}>
                Snooze check-in ({snoozeMinutes}m)
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-6xl p-4 md:p-6 animate-in fade-in-0 slide-in-from-bottom-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


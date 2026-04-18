"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Grid3x3 } from "lucide-react"

import { NAV_ITEMS } from "@/components/shell/nav"
import { Sidebar } from "@/components/shell/sidebar"
import { Topbar } from "@/components/shell/topbar"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { actions } from "@/lib/store/lifeStore"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const a = React.useMemo(() => actions(), [])

  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  React.useEffect(() => {
    a.ensureToday()
  }, [a])

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
          <div className="border-t p-3">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/heatmap" onClick={() => setMobileNavOpen(false)}>
                <Grid3x3 className="size-4 mr-2" />
                Open heatmap
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-6xl p-4 md:p-6 animate-in fade-in-0 slide-in-from-bottom-1">{children}</div>
        </main>
      </div>
    </div>
  )
}

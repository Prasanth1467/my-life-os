"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
import { ChevronLeft, Menu } from "lucide-react"

import { NAV_ITEMS } from "@/components/shell/nav"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { USER_IDENTITY } from "@/lib/life/identity"

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  className,
}: {
  collapsed: boolean
  onToggleCollapsed: () => void
  className?: string
}) {
  const pathname = usePathname()
  return (
    <aside
      className={cn(
        "hidden md:flex h-svh flex-col border-r bg-card text-card-foreground transition-[width] duration-200",
        collapsed ? "w-[64px]" : "w-[240px]",
        className
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b px-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white grid place-items-center text-xs font-extrabold">
            OS
          </div>
          {!collapsed && <div className="text-sm font-semibold tracking-tight truncate">Life OS</div>}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className={cn("ml-auto", collapsed && "mx-auto")}
          onClick={onToggleCollapsed}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <nav className="flex-1 overflow-auto p-2">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active ? "bg-orange-500/10 text-orange-400" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="border-t p-3">
        <div className={cn("flex items-center gap-2 rounded-lg bg-muted p-2", collapsed && "justify-center")}>
          <Avatar className="size-8">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-orange-500 text-white">
              {USER_IDENTITY.initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{USER_IDENTITY.fullName}</div>
              <div className="text-xs text-muted-foreground truncate">Discipline OS</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

export function MobileNavButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="icon-sm" onClick={onClick} aria-label="Open navigation">
      <Menu className="size-4" />
    </Button>
  )
}


"use client"

import * as React from "react"
import { Download, Flame, Save, Upload, User, Zap } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { actions, useLifeDerived } from "@/lib/store/lifeStore"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useLifeStore } from "@/lib/store/lifeStore"
import { dayNumber } from "@/lib/life/engine"
import { ThemeToggle } from "@/components/theme-toggle"
import { USER_IDENTITY } from "@/lib/life/identity"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { LiveClock } from "@/components/live-clock"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const a = React.useMemo(() => actions(), [])
  const derived = useLifeDerived()
  const life = useLifeStore((s) => s.state)
  const levelPct = Math.round((derived.levelCurrent / Math.max(1, derived.levelNext)) * 100)
  const dayNum = dayNumber(life, derived.today)

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card px-3 md:px-5">
      <div className="md:hidden">
        <Button variant="outline" size="icon-sm" onClick={onOpenNav} aria-label="Open navigation">
          <span className="sr-only">Open</span>
          <span className="text-sm">≡</span>
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="hidden md:flex items-center gap-2">
          <Badge variant="secondary">Day {dayNum}</Badge>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Zap className="size-4 text-orange-400" />
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            XP {derived.xp} · L{derived.level}
          </div>
          <div className="hidden sm:block w-[120px] md:w-[220px]">
            <Progress value={levelPct} />
          </div>
        </div>
        <div className="flex flex-1 justify-center min-w-0">
          <LiveClock className="rounded-md border bg-card/40 px-2.5 py-1 max-w-[190px] sm:max-w-none overflow-hidden text-ellipsis" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {derived.cloudAuth !== "disabled" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={
                    derived.cloudSync === "synced"
                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                      : derived.cloudSync === "syncing"
                        ? "border-sky-500/35 text-sky-600 dark:text-sky-300"
                        : derived.cloudSync === "error"
                          ? "border-destructive/50 text-destructive"
                          : "border-muted-foreground/30"
                  }
                >
                  {derived.cloudSync === "syncing"
                    ? "Syncing"
                    : derived.cloudSync === "synced"
                      ? derived.cloudRealtime === "live"
                        ? "Synced · Live"
                        : derived.cloudRealtime === "connecting"
                          ? "Synced · RT…"
                          : "Synced"
                      : derived.cloudSync === "error"
                        ? "Sync error"
                        : "Idle"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {derived.cloudSync === "synced"
                  ? derived.cloudRealtime === "live"
                    ? "Synced — Realtime channel is live; multi-device updates apply automatically."
                    : derived.cloudRealtime === "connecting"
                      ? "Synced — connecting Realtime channel…"
                      : derived.cloudRealtime === "error"
                        ? "Synced to DB — Realtime reconnecting. Data is still saved."
                        : "All changes are saved to Supabase."
                  : derived.cloudSync === "syncing"
                    ? "Writing to Supabase. Your UI stays responsive."
                    : derived.cloudSync === "error"
                      ? "Check NEXT_PUBLIC_SUPABASE_* env vars and enable Anonymous sign-in in Supabase."
                      : "Waiting for the next save."}
              </TooltipContent>
            </Tooltip>
          ) : null}
          <Badge
            variant={derived.streak >= 7 ? "success" : "outline"}
            className={derived.streak > 0 ? "shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_0_18px_rgba(249,115,22,0.18)]" : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <Flame className={derived.streak > 0 ? "size-3 text-orange-400 animate-in fade-in-0 zoom-in-95" : "size-3 text-muted-foreground"} />
              Streak {derived.streak}
            </span>
          </Badge>
          <Badge variant="outline">{derived.progress}%</Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Separator orientation="vertical" className="h-7" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="User menu">
              <Avatar className="size-7">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-orange-500 text-white text-[10px]">
                  {USER_IDENTITY.initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <User className="size-4 text-orange-400" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{USER_IDENTITY.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">Life OS</div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">Dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/calendar">Calendar</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/intelligence">Intelligence</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void a.createBackupNow()
                toast("Backup ready", { description: "JSON snapshot downloaded from your current state." })
              }}
            >
              Backup now
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void a.exportNow()
                toast("Export started", { description: "Your export file will download shortly." })
              }}
            >
              Export
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void a.importNow()
                toast("Import ready", { description: "Choose a JSON export to restore." })
              }}
            >
              Import
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="icon-sm" onClick={() => void a.createBackupNow()} aria-label="Backup">
          <Save className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => void a.exportNow()} aria-label="Export">
          <Download className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => void a.importNow()} aria-label="Import">
          <Upload className="size-4" />
        </Button>
      </div>
    </header>
  )
}


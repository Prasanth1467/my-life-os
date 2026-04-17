import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BookOpen,
  CalendarDays,
  Cigarette,
  ClipboardCheck,
  Cpu,
  Gauge,
  Goal,
  LayoutGrid,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Target,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: ListTodo },
  { href: "/checkin", label: "Check-In", icon: ClipboardCheck },
  { href: "/dsa", label: "DSA", icon: Cpu },
  { href: "/angular", label: "Angular", icon: BookOpen },
  { href: "/smoke", label: "Smoke", icon: Cigarette },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: Activity },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/intelligence", label: "Intelligence", icon: Gauge },
  { href: "/mission", label: "Mission", icon: Target },
  { href: "/ui-kit", label: "UI Kit", icon: LayoutGrid },
]


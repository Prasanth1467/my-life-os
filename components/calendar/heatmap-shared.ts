/** GitHub-style heatmap cell backgrounds (no emoji). */

export type HeatVisualKind = "fire" | "miss" | "neutral" | "today" | "empty"

export function heatmapCellBackground(kind: HeatVisualKind, score: number): string {
  const t = Math.max(0, Math.min(1, score / 100))
  if (kind === "empty") return "transparent"
  if (kind === "fire") {
    return `rgba(16, 185, 129, ${0.14 + t * 0.52})`
  }
  if (kind === "miss") {
    return `rgba(244, 63, 94, ${0.12 + (1 - t) * 0.38})`
  }
  if (kind === "today") {
    return "rgba(249, 115, 22, 0.22)"
  }
  return "rgba(100, 116, 139, 0.12)"
}

export function heatmapCellRing(kind: HeatVisualKind): string {
  if (kind === "fire") return "ring-1 ring-emerald-500/25"
  if (kind === "miss") return "ring-1 ring-rose-500/30"
  if (kind === "today") return "ring-1 ring-orange-400/40"
  return "ring-1 ring-border/50"
}

import type { LifeStateAny, LifeStateV1 } from "@/lib/life/types"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

function validateHeatmapCell(v: unknown): boolean {
  if (!isRecord(v)) return false
  const status = v.status
  const score = v.score
  if (status !== "fire" && status !== "miss") return false
  return typeof score === "number" && Number.isFinite(score)
}

export function validateState(input: unknown): ValidationResult<LifeStateAny> {
  if (!isRecord(input)) return { ok: false, error: "State must be an object" }
  const schemaVersion = input.schemaVersion
  if (schemaVersion !== 1 && schemaVersion !== 2) {
    return { ok: false, error: `Unsupported schemaVersion: ${String(schemaVersion)}` }
  }

  const s = input as Partial<LifeStateV1>
  if (typeof s.createdAt !== "number" || typeof s.updatedAt !== "number") {
    return { ok: false, error: "Invalid timestamps" }
  }
  if (typeof s.startDate !== "string") return { ok: false, error: "Invalid startDate" }
  if (!isRecord(s.daily)) return { ok: false, error: "Invalid daily map" }
  if (!isRecord(s.dsaDone)) return { ok: false, error: "Invalid dsaDone map" }
  if (!isRecord(s.angularDone)) return { ok: false, error: "Invalid angularDone map" }
  if (!Array.isArray(s.goals)) return { ok: false, error: "Invalid goals" }
  if (!Array.isArray(s.missions)) return { ok: false, error: "Invalid missions" }
  if (!Array.isArray(s.journal)) return { ok: false, error: "Invalid journal" }
  if (!Array.isArray(s.events)) return { ok: false, error: "Invalid events" }
  if (!isRecord(s.gamification)) return { ok: false, error: "Invalid gamification" }
  if (!isRecord(s.settings)) return { ok: false, error: "Invalid settings" }

  if (s.heatmap != null) {
    if (!isRecord(s.heatmap)) return { ok: false, error: "Invalid heatmap" }
    for (const cell of Object.values(s.heatmap)) {
      if (!validateHeatmapCell(cell)) return { ok: false, error: "Invalid heatmap cell" }
    }
  }

  return { ok: true, value: input as LifeStateV1 }
}

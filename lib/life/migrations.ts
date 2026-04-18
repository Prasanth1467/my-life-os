import type { LifeStateAny, LifeStateV1 } from "@/lib/life/types"
import { backfillHeatmapFromHistory } from "@/lib/life/heatmap"

export const CURRENT_SCHEMA_VERSION = 2 as const

export type MigrationResult =
  | { ok: true; state: LifeStateAny; migrated: boolean; fromVersion: number }
  | { ok: false; error: string }

export function migrateState(state: LifeStateAny): MigrationResult {
  if (state.schemaVersion === 1) {
    const withHeat = backfillHeatmapFromHistory({
      ...(state as LifeStateV1),
      schemaVersion: 2,
      heatmap: (state as LifeStateV1).heatmap ?? {},
    } as LifeStateV1)
    return { ok: true, state: withHeat, migrated: true, fromVersion: 1 }
  }

  if (state.schemaVersion === 2) {
    const s = state as LifeStateV1
    const normalized = backfillHeatmapFromHistory({
      ...s,
      heatmap: s.heatmap ?? {},
    })
    return { ok: true, state: normalized, migrated: false, fromVersion: 2 }
  }

  return { ok: false, error: `No migration path from schemaVersion ${state.schemaVersion}` }
}

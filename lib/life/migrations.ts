import type { LifeStateAny, LifeStateV1 } from "@/lib/life/types"

export const CURRENT_SCHEMA_VERSION = 1 as const

export type MigrationResult =
  | { ok: true; state: LifeStateAny; migrated: boolean; fromVersion: number }
  | { ok: false; error: string }

export function migrateState(state: LifeStateAny): MigrationResult {
  if (state.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return { ok: true, state, migrated: false, fromVersion: CURRENT_SCHEMA_VERSION }
  }

  if (state.schemaVersion === 1) {
    return { ok: true, state: state as LifeStateV1, migrated: false, fromVersion: 1 }
  }

  return { ok: false, error: `No migration path from schemaVersion ${state.schemaVersion}` }
}


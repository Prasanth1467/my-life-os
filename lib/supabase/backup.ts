import type { SupabaseClient } from "@supabase/supabase-js"

import { finalizeHeatmapDays } from "@/lib/life/heatmap"
import { migrateState } from "@/lib/life/migrations"
import type { LifeStateV1 } from "@/lib/life/types"
import { validateState } from "@/lib/life/validate"
import { isSupabaseBrowserConfigured } from "@/lib/supabase/env"

export type CloudAuthStatus = "disabled" | "signed_out" | "ready" | "error"

export type EnsureAnonymousSessionResult = {
  status: CloudAuthStatus
  message?: string
}

export async function ensureAnonymousSession(
  client: SupabaseClient
): Promise<EnsureAnonymousSessionResult> {
  if (!isSupabaseBrowserConfigured()) {
    return {
      status: "disabled",
      message:
        "Add NEXT_PUBLIC_SUPABASE_URL and a publishable or anon key (or SUPABASE_URL + SUPABASE_ANON_KEY in .env). Restart dev server after editing .env.",
    }
  }
  try {
    const { data: sessionData } = await client.auth.getSession()
    if (sessionData.session) return { status: "ready" }

    const { error } = await client.auth.signInAnonymously()
    if (error) {
      return {
        status: "error",
        message: `${error.message} (enable Anonymous sign-in in Supabase → Authentication → Providers)`,
      }
    }
    return { status: "ready" }
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : String(e),
    }
  }
}

export type BackupPushResult =
  | { ok: true; updatedAt: string }
  | { ok: false; message?: string }

/**
 * Primary persistence: full JSON state in `life_state` (`id` + `data` jsonb).
 */
export async function upsertLifeStateBackup(
  client: SupabaseClient,
  state: LifeStateV1
): Promise<BackupPushResult> {
  const { data: userData, error: userErr } = await client.auth.getUser()
  if (userErr || !userData.user) {
    return { ok: false, message: userErr?.message ?? "Not signed in" }
  }

  const id = userData.user.id

  const { error: upErr } = await client.from("life_state").upsert(
    {
      id,
      data: state as unknown as Record<string, unknown>,
    },
    { onConflict: "id" }
  )
  if (upErr) {
    return { ok: false, message: upErr.message }
  }

  const sel = await client.from("life_state").select("updated_at").eq("id", id).maybeSingle()
  const at = sel.data?.updated_at
  if (at) return { ok: true, updatedAt: at as string }
  return { ok: false, message: "Upsert returned no row" }
}

export type FetchLifeStateResult =
  | {
      ok: true
      state: LifeStateV1 | null
      migration?: { migrated: boolean; fromVersion: number }
    }
  | { ok: false; message: string }

/**
 * Primary load: `select data` for the signed-in user. Returns validated + migrated state, or null if no row.
 */
export async function fetchLifeStatePrimary(client: SupabaseClient): Promise<FetchLifeStateResult> {
  const { data: userData, error: userErr } = await client.auth.getUser()
  if (userErr || !userData.user) {
    return { ok: false, message: userErr?.message ?? "Not signed in" }
  }

  const { data: row, error } = await client
    .from("life_state")
    .select("data")
    .eq("id", userData.user.id)
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message }
  }

  const raw = row?.data
  if (raw == null) {
    return { ok: true, state: null }
  }

  const valid = validateState(raw)
  if (!valid.ok) {
    return { ok: false, message: `Invalid remote state: ${valid.error}` }
  }

  const migrated = migrateState(valid.value)
  if (!migrated.ok) {
    return { ok: false, message: migrated.error }
  }

  let next = migrated.state as LifeStateV1
  next = finalizeHeatmapDays(next)
  return {
    ok: true,
    state: next,
    migration: { migrated: migrated.migrated, fromVersion: migrated.fromVersion },
  }
}

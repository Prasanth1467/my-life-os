import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"

import { isSupabaseBrowserConfigured } from "@/lib/supabase/env"
import { migrateState } from "@/lib/life/migrations"
import type { LifeStateV1 } from "@/lib/life/types"
import { validateState } from "@/lib/life/validate"

/** Emitted by Realtime `subscribe()` — used for UI + reconnect hints. */
export type RealtimeSubscribeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR"

type LifeRow = {
  user_id: string
  payload: LifeStateV1
  updated_at: string
}

export type PushLifeStateResult =
  | { ok: true; updatedAt: string }
  | { ok: false; message?: string }

export function parseServerUpdatedAtMs(iso: string): number {
  return Date.parse(iso)
}

export type CloudAuthStatus = "disabled" | "signed_out" | "ready" | "error"

export type EnsureAnonymousSessionResult = {
  status: CloudAuthStatus
  /** Present when status is "error", or hints for "disabled". */
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

export async function fetchRemoteLifeState(
  client: SupabaseClient
): Promise<{ state: LifeStateV1; updatedAt: string } | null> {
  const { data: userData, error: userErr } = await client.auth.getUser()
  if (userErr || !userData.user) return null

  const { data, error } = await client.rpc("get_life_state")
  if (error) {
    const fallback = await client
      .from("life_state")
      .select("payload, updated_at")
      .eq("user_id", userData.user.id)
      .maybeSingle()
    if (fallback.error || !fallback.data?.payload) return null
    const raw = fallback.data.payload as unknown
    const valid = validateState(raw)
    if (!valid.ok) return null
    const mig = migrateState(valid.value)
    if (!mig.ok) return null
    return { state: mig.state as LifeStateV1, updatedAt: fallback.data.updated_at as string }
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!row?.payload) return null

  const raw = row.payload as unknown
  const valid = validateState(raw)
  if (!valid.ok) return null
  const mig = migrateState(valid.value)
  if (!mig.ok) return null
  return { state: mig.state as LifeStateV1, updatedAt: row.updated_at as string }
}

export async function pushLifeState(client: SupabaseClient, state: LifeStateV1): Promise<PushLifeStateResult> {
  const { data: userData, error: userErr } = await client.auth.getUser()
  if (userErr || !userData.user) {
    return { ok: false, message: userErr?.message ?? "Not signed in" }
  }

  const { data, error } = await client.rpc("update_life_state", {
    p_payload: state as unknown as Record<string, unknown>,
  })

  if (!error && Array.isArray(data) && data[0]) {
    return { ok: true, updatedAt: (data[0] as { updated_at: string }).updated_at }
  }

  const rpcMsg = error?.message

  const { error: upErr } = await client.from("life_state").upsert(
    {
      user_id: userData.user.id,
      payload: state as unknown as Record<string, unknown>,
    },
    { onConflict: "user_id" }
  )
  if (upErr) {
    return {
      ok: false,
      message: [rpcMsg, upErr.message].filter(Boolean).join(" · ") || upErr.message,
    }
  }

  const sel = await client.from("life_state").select("updated_at").eq("user_id", userData.user.id).single()
  if (sel.data?.updated_at) return { ok: true, updatedAt: sel.data.updated_at as string }
  return { ok: false, message: rpcMsg ?? "Upsert returned no row" }
}

export function subscribeLifeState(
  client: SupabaseClient,
  userId: string,
  onRow: (next: LifeStateV1, serverUpdatedAt: string) => void,
  onSubscribeStatus?: (status: RealtimeSubscribeStatus, err?: Error) => void
): RealtimeChannel {
  const channel = client.channel(`life_state:${userId}`).on(
    "postgres_changes",
    { event: "*", schema: "public", table: "life_state", filter: `user_id=eq.${userId}` },
    (payload) => {
      const row = payload.new as Partial<LifeRow> | null
      const raw = row?.payload
      const updatedAt = row?.updated_at
      if (!raw || !updatedAt) return
      const valid = validateState(raw)
      if (!valid.ok) return
      const mig = migrateState(valid.value)
      if (!mig.ok) return
      onRow(mig.state as LifeStateV1, updatedAt)
    }
  )
  channel.subscribe((status, err) => {
    onSubscribeStatus?.(status as RealtimeSubscribeStatus, err)
  })
  return channel
}

/** Call after sign-in / refresh so Realtime postgres_changes respect JWT + RLS. */
export async function syncRealtimeAuth(client: SupabaseClient): Promise<void> {
  const { data } = await client.auth.getSession()
  const token = data.session?.access_token
  if (token) client.realtime.setAuth(token)
}

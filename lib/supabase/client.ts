import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env"

export function createClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or publishable/anon key")
  }
  return createBrowserClient(url, key, {
    realtime: {
      params: { eventsPerSecond: 30 },
    },
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

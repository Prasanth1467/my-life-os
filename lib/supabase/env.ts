/** Trim and strip optional quotes from .env lines (common copy/paste issue). */
function normalizeEnvValue(raw: string | undefined): string | undefined {
  if (raw == null) return undefined
  let s = String(raw).trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s === "" ? undefined : s
}

/**
 * Supabase project URL. Set `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` in `.env`
 * (next.config bridges the latter for the browser bundle).
 */
export function getSupabaseUrl(): string | undefined {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL)
}

/** Publishable (new) or anon JWT — never use service_role in the browser. */
export function getSupabaseAnonKey(): string | undefined {
  return normalizeEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}

/** Hint when public Supabase env is missing (no secrets). */
export function supabaseEnvHint(): string | undefined {
  if (isSupabaseBrowserConfigured()) return undefined
  if (!getSupabaseUrl()) return "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL"
  return "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_ANON_KEY"
}

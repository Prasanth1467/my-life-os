import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Vercel Cron (see vercel.json). Inserts an audit row using the service role.
 * Set CRON_SECRET in Vercel and SUPABASE_SERVICE_ROLE_KEY (server-only; rotate if exposed).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, error: "missing_env" }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabase.from("cron_heartbeat").insert({ label: "vercel" })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const { error: cleanErr } = await supabase.rpc("cron_maintenance_cleanup", { p_heartbeat_days: 90 })

  return NextResponse.json({
    ok: true,
    heartbeat: true,
    cleanup: !cleanErr,
    ...(cleanErr ? { cleanupNote: cleanErr.message } : {}),
  })
}

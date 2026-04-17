import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type MaintenanceResult = {
  ok: boolean
  ranAt: string
  heartbeat: boolean
  cleanup: boolean
  cleanupNote?: string
  error?: string
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
}

function requireCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) return false
  return true
}

/**
 * Vercel Cron (see vercel.json). Set CRON_SECRET in Vercel — requests include Authorization: Bearer <CRON_SECRET>.
 * Uses service role for cron_heartbeat insert + cron_maintenance_cleanup RPC.
 */
export async function GET(request: Request) {
  if (!requireCronAuth(request)) return unauthorized()
  return runMaintenance()
}

export async function POST(request: Request) {
  if (!requireCronAuth(request)) return unauthorized()
  return runMaintenance()
}

async function runMaintenance(): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, ranAt: new Date().toISOString(), heartbeat: false, cleanup: false, error: "missing_env" } satisfies MaintenanceResult,
      { status: 500 }
    )
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const ranAt = new Date().toISOString()

  const { error: hbErr } = await supabase.from("cron_heartbeat").insert({ label: "vercel" })
  if (hbErr) {
    return NextResponse.json(
      {
        ok: false,
        ranAt,
        heartbeat: false,
        cleanup: false,
        error: hbErr.message,
      } satisfies MaintenanceResult,
      { status: 500 }
    )
  }

  const { error: cleanErr } = await supabase.rpc("cron_maintenance_cleanup", { p_heartbeat_days: 90 })

  const body: MaintenanceResult = {
    ok: true,
    ranAt,
    heartbeat: true,
    cleanup: !cleanErr,
    ...(cleanErr ? { cleanupNote: cleanErr.message } : {}),
  }

  return NextResponse.json(body)
}

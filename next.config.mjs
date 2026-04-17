import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const require = createRequire(import.meta.url)
const { loadEnvConfig } = require("@next/env")

const __dirname = dirname(fileURLToPath(import.meta.url))
// Load `.env`, `.env.local`, etc. before reading vars below (same order as `next dev` / `next build`).
loadEnvConfig(join(__dirname))

/** @type {import('next').NextConfig} */
const staticExport = process.env.NEXT_STATIC_EXPORT === "1"

function firstNonEmpty(...values) {
  for (const v of values) {
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return ""
}

// Bridge common Supabase CLI / dashboard names → NEXT_PUBLIC_* so the **browser** bundle receives them.
// Without NEXT_PUBLIC_, Next.js will not expose vars to client code — this copies them at build time.
// Use only anon / publishable keys here; never map the service_role secret.
const publicUrl = firstNonEmpty(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL)
const publicKey = firstNonEmpty(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY
)

const nextConfig = {
  ...(staticExport ? { output: "export" } : {}),
  images: { unoptimized: staticExport },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: publicUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey,
  },
}

export default nextConfig

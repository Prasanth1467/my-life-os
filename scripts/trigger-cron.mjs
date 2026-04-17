/**
 * Calls GET /api/cron/maintenance with Authorization: Bearer <CRON_SECRET>.
 *
 * Local: start the app first — `npm run dev` (listens on :3000), then `npm run cron:test`.
 * Remote: set CRON_TEST_URL in .env, e.g. https://your-app.vercel.app
 */
const base = (process.env.CRON_TEST_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "")
const secret = process.env.CRON_SECRET

if (!secret) {
  console.error("cron:test: set CRON_SECRET in .env (same value as Vercel).")
  process.exit(1)
}

const url = new URL("/api/cron/maintenance", base.endsWith("/") ? base : `${base}/`)

let res
try {
  res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  })
} catch (e) {
  const code = e && typeof e === "object" && "cause" in e && e.cause && typeof e.cause === "object" && "code" in e.cause ? e.cause.code : undefined
  if (code === "ECONNREFUSED" || (e instanceof Error && /ECONNREFUSED|fetch failed/i.test(e.message))) {
    console.error(`cron:test: nothing is listening at ${base}`)
    console.error("  → Start Next locally:  npm run dev")
    console.error("  → Or test production:     set CRON_TEST_URL=https://<your-app>.vercel.app in .env and run again")
    process.exit(1)
  }
  throw e
}

const text = await res.text()
console.log(res.status, text)
process.exit(res.ok ? 0 : 1)

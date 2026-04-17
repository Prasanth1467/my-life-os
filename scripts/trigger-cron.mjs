/**
 * Calls GET /api/cron/maintenance with Authorization: Bearer <CRON_SECRET>.
 * Run: npm run cron:test (with dev server on 3000) or CRON_TEST_URL=https://your-app.vercel.app npm run cron:test
 */
const base = (process.env.CRON_TEST_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "")
const secret = process.env.CRON_SECRET

if (!secret) {
  console.error("cron:test: set CRON_SECRET in .env (same value as Vercel).")
  process.exit(1)
}

const url = new URL("/api/cron/maintenance", base.endsWith("/") ? base : `${base}/`)
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${secret}` },
})
const text = await res.text()
console.log(res.status, text)
process.exit(res.ok ? 0 : 1)

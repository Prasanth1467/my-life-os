/** @type {import('next').NextConfig} */
// Vercel sets VERCEL=1. Static export (for Tauri → `out/`) is opt-in so API routes work for `next build` locally and on Vercel.
const staticExport = process.env.NEXT_STATIC_EXPORT === "1"

const nextConfig = {
  ...(staticExport ? { output: "export" } : {}),
  images: { unoptimized: staticExport },
}

export default nextConfig

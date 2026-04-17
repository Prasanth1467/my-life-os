import type { DailyQuote } from "@/lib/quotes/types"

const STORAGE_KEY = "lifeos:quotesCycle:v1"
const QUOTE_COUNT = 365

type QuoteCycleState = {
  cycleIndex: number
  seed: number
  order: number[] // quote ids (1..365)
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return function rand() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function randomSeed(): number {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] >>> 0
}

function defaultOrder(): number[] {
  return Array.from({ length: QUOTE_COUNT }, (_, i) => i + 1)
}

function shuffle(order: number[], seed: number): number[] {
  const rand = mulberry32(seed)
  const out = order.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function safeParse(raw: string | null): QuoteCycleState | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<QuoteCycleState>
    if (!v || typeof v !== "object") return null
    if (typeof v.cycleIndex !== "number") return null
    if (typeof v.seed !== "number") return null
    if (!Array.isArray(v.order)) return null
    if (v.order.length !== QUOTE_COUNT) return null
    return { cycleIndex: v.cycleIndex, seed: v.seed, order: v.order.map((n) => Number(n)) }
  } catch {
    return null
  }
}

function load(): QuoteCycleState | null {
  return safeParse(window.localStorage.getItem(STORAGE_KEY))
}

function save(s: QuoteCycleState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function getQuoteOfDay(opts: { quotes: DailyQuote[]; dayNumber: number }): DailyQuote {
  const dayNumber = Math.max(1, Math.floor(opts.dayNumber))
  const cycleIndex = Math.floor((dayNumber - 1) / QUOTE_COUNT)
  const dayIndex = (dayNumber - 1) % QUOTE_COUNT

  let cycle = load()
  if (!cycle || cycle.order.length !== QUOTE_COUNT) {
    cycle = { cycleIndex: 0, seed: 0, order: defaultOrder() }
    save(cycle)
  }

  if (cycle.cycleIndex !== cycleIndex) {
    const seed = randomSeed()
    const order = shuffle(defaultOrder(), seed)
    cycle = { cycleIndex, seed, order }
    save(cycle)
  }

  const quoteId = cycle.order[dayIndex] ?? 1
  const quote = opts.quotes.find((q) => q.id === quoteId) ?? opts.quotes[0]
  return quote
}


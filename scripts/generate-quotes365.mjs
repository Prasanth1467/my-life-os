import fs from "node:fs/promises"
import path from "node:path"

const ROOT = path.resolve(process.cwd())
const SOURCES = path.join(ROOT, "lib", "quotes", "sources")

const OUT_JSON = path.join(ROOT, "lib", "quotes", "quotes365.json")
const OUT_META = path.join(ROOT, "lib", "quotes", "ATTRIBUTION.md")

/** @typedef {"discipline"|"pain_struggle"|"comeback"|"ambition_growth"|"spiritual_grounding"} QuoteCategory */

function norm(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function stripBOM(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

function pickByKeywords(items, { include = [], exclude = [], maxLen = 240 } = {}) {
  const inc = include.map((s) => s.toLowerCase())
  const exc = exclude.map((s) => s.toLowerCase())
  return items.filter((q) => {
    const text = (q.text ?? q.description ?? "").toLowerCase()
    if (!text) return false
    if (norm(q.text ?? q.description).length > maxLen) return false
    if (exc.some((k) => text.includes(k))) return false
    return inc.length === 0 ? true : inc.some((k) => text.includes(k))
  })
}

function uniqByText(items) {
  const seen = new Set()
  const out = []
  for (const q of items) {
    const t = norm(q.text ?? q.description).toLowerCase()
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(q)
  }
  return out
}

function takeUnique(items, n, seen) {
  const sorted = items
    .slice()
    .sort((a, b) => norm(a.text ?? a.description).localeCompare(norm(b.text ?? b.description)))
  const out = []
  for (const q of sorted) {
    const t = norm(q.text ?? q.description).toLowerCase()
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(q)
    if (out.length >= n) break
  }
  return out
}

function mapMitQuote(q, category) {
  return {
    category,
    text: norm(q.text),
    author: norm(q.from),
    source: "MIT dataset: vinitshahdeo/inspirational-quotes (MIT License)",
    ref: null,
  }
}

function mapGitaQuote(q, verseMeta, category) {
  const v = verseMeta.get(q.verse_id)
  const ref = v ? `Bhagavad Gita ${v.chapter_number}:${v.verse_number}` : `Bhagavad Gita verse_id=${q.verse_id}`
  return {
    category,
    text: norm(q.description),
    author: norm(q.authorName),
    source: "gita/gita data (The Unlicense)",
    ref,
  }
}

async function main() {
  const mitPath = path.join(SOURCES, "inspirational-quotes.mit.json")
  const gitaTransPath = path.join(SOURCES, "gita.translation.json")
  const gitaVersePath = path.join(SOURCES, "gita.verse.json")

  const [mitRaw, transRaw, verseRaw] = await Promise.all([
    fs.readFile(mitPath, "utf8"),
    fs.readFile(gitaTransPath, "utf8"),
    fs.readFile(gitaVersePath, "utf8"),
  ])

  const mit = JSON.parse(stripBOM(mitRaw))
  const translations = JSON.parse(stripBOM(transRaw))
  const verses = JSON.parse(stripBOM(verseRaw))

  /** @type {Map<number, {chapter_number:number, verse_number:number}>} */
  const verseMeta = new Map()
  for (const v of verses) {
    if (typeof v?.id === "number") {
      verseMeta.set(v.id, { chapter_number: v.chapter_number, verse_number: v.verse_number })
    }
  }

  const mitClean = uniqByText(mit)

  const discipline = uniqByText(
    pickByKeywords(mitClean, {
      include: ["discipline", "habit", "practice", "consistency", "focus", "work", "effort", "routine", "persist", "daily", "train"],
      exclude: ["love", "romance"],
      maxLen: 220,
    })
  )
  const pain = uniqByText(
    pickByKeywords(mitClean, {
      include: ["pain", "struggle", "hard", "suffer", "failure", "wounds", "fear", "tough", "tears", "battle", "storm"],
      exclude: ["love", "romance"],
      maxLen: 220,
    })
  )
  const comeback = uniqByText(
    pickByKeywords(mitClean, {
      include: ["comeback", "again", "rise", "restart", "never", "quit", "continue", "overcome", "resilience", "courage", "strength"],
      exclude: ["love", "romance"],
      maxLen: 220,
    })
  )
  const ambition = uniqByText(
    pickByKeywords(mitClean, {
      include: ["dream", "ambition", "great", "growth", "become", "success", "goal", "future", "change", "freedom", "build", "create"],
      exclude: ["love", "romance"],
      maxLen: 220,
    })
  )

  const mitFallback = uniqByText(
    pickByKeywords(mitClean, {
      include: [],
      exclude: [],
      maxLen: 320,
    })
  )

  const gitaEnglish = translations.filter(
    (t) =>
      t?.lang === "english" &&
      typeof t?.description === "string" &&
      (t.authorName === "Swami Adidevananda" || t.authorName === "Swami Gambirananda")
  )
  const gitaSpiritual = uniqByText(
    pickByKeywords(gitaEnglish, {
      include: ["duty", "discipline", "mind", "self", "attachment", "desire", "action", "work", "stead", "yoga", "fear"],
      maxLen: 260,
    })
  )
  const gitaFallback = uniqByText(
    pickByKeywords(gitaEnglish, {
      include: [],
      maxLen: 260,
    })
  )

  const targets = /** @type {Record<QuoteCategory, number>} */ ({
    discipline: 90,
    pain_struggle: 70,
    comeback: 70,
    ambition_growth: 80,
    spiritual_grounding: 55,
  })

  const seen = new Set()
  const picked = /** @type {any[]} */ ([])
  const d1 = takeUnique(discipline, targets.discipline, seen)
  const d2 = d1.length < targets.discipline ? takeUnique(mitFallback, targets.discipline - d1.length, seen) : []
  picked.push(...d1.map((q) => mapMitQuote(q, "discipline")), ...d2.map((q) => mapMitQuote(q, "discipline")))

  const p1 = takeUnique(pain, targets.pain_struggle, seen)
  const p2 = p1.length < targets.pain_struggle ? takeUnique(mitFallback, targets.pain_struggle - p1.length, seen) : []
  picked.push(...p1.map((q) => mapMitQuote(q, "pain_struggle")), ...p2.map((q) => mapMitQuote(q, "pain_struggle")))

  const c1 = takeUnique(comeback, targets.comeback, seen)
  const c2 = c1.length < targets.comeback ? takeUnique(mitFallback, targets.comeback - c1.length, seen) : []
  picked.push(...c1.map((q) => mapMitQuote(q, "comeback")), ...c2.map((q) => mapMitQuote(q, "comeback")))

  const a1 = takeUnique(ambition, targets.ambition_growth, seen)
  const a2 = a1.length < targets.ambition_growth ? takeUnique(mitFallback, targets.ambition_growth - a1.length, seen) : []
  picked.push(...a1.map((q) => mapMitQuote(q, "ambition_growth")), ...a2.map((q) => mapMitQuote(q, "ambition_growth")))

  const s1 = takeUnique(gitaSpiritual, targets.spiritual_grounding, seen)
  const s2 =
    s1.length < targets.spiritual_grounding ? takeUnique(gitaFallback, targets.spiritual_grounding - s1.length, seen) : []
  picked.push(...s1.map((q) => mapGitaQuote(q, verseMeta, "spiritual_grounding")), ...s2.map((q) => mapGitaQuote(q, verseMeta, "spiritual_grounding")))

  if (picked.length < 365) {
    const need = 365 - picked.length
    const topup = takeUnique(mitFallback, need, seen)
    picked.push(...topup.map((q) => mapMitQuote(q, "discipline")))
  }
  if (picked.length < 365) throw new Error(`Not enough quotes picked: got ${picked.length}`)

  const out = picked.slice(0, 365).map((q, idx) => ({
    id: idx + 1,
    ...q,
  }))

  await fs.mkdir(path.dirname(OUT_JSON), { recursive: true })
  await fs.writeFile(OUT_JSON, JSON.stringify(out, null, 2) + "\n", "utf8")

  const meta = `# Quote sources (bundled offline)\n\nThis app ships quotes from these open-licensed sources:\n\n- vinitshahdeo/inspirational-quotes (MIT License)\n- gita/gita (The Unlicense)\n\nGenerated file: \`lib/quotes/quotes365.json\`\n`
  await fs.writeFile(OUT_META, meta, "utf8")

  console.log(`Wrote ${out.length} quotes to ${OUT_JSON}`)
}

await main()


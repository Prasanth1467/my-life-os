export type QuoteLane = "krishna" | "luffy" | "anime_discipline" | "long_term" | "discipline"

export type CuratedQuote = {
  id: string
  lane: QuoteLane
  text: string
  attribution: string
  source?: string | null
}

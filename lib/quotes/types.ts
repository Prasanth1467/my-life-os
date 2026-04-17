export type QuoteCategory = "discipline" | "pain_struggle" | "comeback" | "ambition_growth" | "spiritual_grounding"

export type DailyQuote = {
  id: number // 1..365
  category: QuoteCategory
  text: string
  author: string
  source: string
  ref: string | null
}


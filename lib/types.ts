export interface Product {
  id: string
  name: string
  brand: string
  category: string
  price: number
  rating: number
  summary: string
  description: string
  attributes: string[]
  highlights: string[]
  tags: string[]
  useCases: string[]
}

export type SearchMode = 'text' | 'voice' | 'image'

export type PipelineStage = 'idle' | 'retrieving' | 'ranking' | 'reasoning' | 'done'

export interface SearchState {
  query: string
  mode: SearchMode
  selectedCategories: string[]
  imageDataUrl: string
  budget: number | null
}

export interface AIRecommendation {
  shortlist: string[]
  reasoning: string
  topPick: string
  comparison: string
}

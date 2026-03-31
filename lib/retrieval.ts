import type { Product } from './types'

export function extractBudget(query: string): number | null {
  const match = query.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)|under\s+\$?(\d+)|less\s+than\s+\$?(\d+)|budget\s+(?:of\s+)?\$?(\d+)/i)
  if (!match) return null
  const raw = match[1] || match[2] || match[3] || match[4]
  return raw ? parseInt(raw.replace(',', ''), 10) : null
}

function scoreProduct(product: Product, tokens: string[], budget: number | null): number {
  if (budget !== null && product.price > budget) return -1

  const searchText = [
    product.name,
    product.brand,
    product.category,
    product.summary,
    product.description,
    ...product.tags,
    ...product.useCases,
    ...product.attributes,
    ...product.highlights,
  ].join(' ').toLowerCase()

  let score = 0

  for (const token of tokens) {
    const occurrences = (searchText.match(new RegExp(token, 'g')) || []).length
    // Weight fields differently
    if (product.name.toLowerCase().includes(token)) score += 8
    if (product.category.toLowerCase().includes(token)) score += 6
    if (product.tags.some(t => t.includes(token))) score += 4
    if (product.useCases.some(u => u.includes(token))) score += 3
    score += occurrences
  }

  // Rating quality bonus
  score += product.rating * 0.5

  return score
}

const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'in', 'on', 'with', 'me', 'my', 'i', 'want', 'need', 'find', 'show', 'get'])

export function retrieveProducts(
  catalog: Product[],
  query: string,
  selectedCategories: string[],
  budget: number | null
): Product[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t))

  let pool = catalog
  if (selectedCategories.length > 0) {
    pool = catalog.filter(p => selectedCategories.includes(p.category))
  }

  if (tokens.length === 0) {
    // No query — return pool sorted by rating, filtered by budget
    return pool
      .filter(p => budget === null || p.price <= budget)
      .sort((a, b) => b.rating - a.rating)
  }

  const scored = pool
    .map(p => ({ product: p, score: scoreProduct(p, tokens, budget) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return pool
      .filter(p => budget === null || p.price <= budget)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6)
  }

  return scored.map(({ product }) => product)
}

export function getCategories(catalog: Product[]): string[] {
  return Array.from(new Set(catalog.map(p => p.category))).sort()
}

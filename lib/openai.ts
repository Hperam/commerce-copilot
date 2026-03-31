import type { Product } from './types'

const MODEL = 'gpt-4.1-mini'

function buildPrompt(query: string, candidates: Product[], imageDataUrl?: string): string {
  const catalogSummary = candidates
    .slice(0, 8)
    .map((p, i) =>
      `${i + 1}. ${p.name} by ${p.brand} — $${p.price} — ${p.summary} — Attributes: ${p.attributes.join(', ')}`
    )
    .join('\n')

  return `You are a sharp, concise product advisor. The user asked: "${query}"

Here are the top catalog candidates retrieved for this query:
${catalogSummary}

Respond with a JSON object (no markdown, no fences) with these exact keys:
- "topPick": name of the single best product for this request (string)
- "shortlist": array of 2-3 product names that are strong matches (string[])
- "reasoning": 2-3 sentences explaining why these products match the request (string)
- "comparison": 1-2 sentences comparing the shortlisted products to help the user decide (string)`
}

export async function getAIRecommendations(
  apiKey: string,
  query: string,
  candidates: Product[],
  imageDataUrl?: string
): Promise<{ topPick: string; shortlist: string[]; reasoning: string; comparison: string }> {
  const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = []

  if (imageDataUrl) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: buildPrompt(query || 'Find products similar to this image', candidates) },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    })
  } else {
    messages.push({
      role: 'user',
      content: buildPrompt(query, candidates),
    })
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 400,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message || `OpenAI error ${response.status}`)
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  const content = data.choices[0]?.message?.content ?? '{}'

  try {
    return JSON.parse(content)
  } catch {
    return {
      topPick: '',
      shortlist: [],
      reasoning: content,
      comparison: '',
    }
  }
}

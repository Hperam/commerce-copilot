'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import catalog from '@/data/catalog.json'
import type { Product, SearchMode, PipelineStage } from '@/lib/types'
import { retrieveProducts, getCategories, extractBudget } from '@/lib/retrieval'
import { getAIRecommendations } from '@/lib/openai'

const SESSION_KEY = 'cc_api_key'

const CATEGORY_ICONS: Record<string, string> = {
  Laptop: '💻', Phone: '📱', Audio: '🎧', Monitor: '🖥️',
  Home: '🏠', Wearable: '⌚', Tablet: '📋', Accessory: '⌨️',
  Camera: '📷', Bag: '🎒', Fashion: '👟',
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Laptop: 'from-violet-600/20 to-indigo-600/20',
  Phone: 'from-cyan-600/20 to-blue-600/20',
  Audio: 'from-pink-600/20 to-rose-600/20',
  Monitor: 'from-emerald-600/20 to-teal-600/20',
  Home: 'from-amber-600/20 to-orange-600/20',
  Wearable: 'from-purple-600/20 to-fuchsia-600/20',
  Tablet: 'from-sky-600/20 to-indigo-600/20',
  Accessory: 'from-slate-600/20 to-zinc-700/20',
  Camera: 'from-red-600/20 to-rose-600/20',
  Bag: 'from-stone-600/20 to-amber-700/20',
  Fashion: 'from-orange-500/20 to-red-500/20',
}

const MODE_CONFIG = {
  text: { icon: '✦', label: 'Text' },
  voice: { icon: '◎', label: 'Voice' },
  image: { icon: '◈', label: 'Image' },
}

const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: 'retrieving', label: 'Retrieving' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'reasoning', label: 'AI Reasoning' },
  { key: 'done', label: 'Done' },
]

const SAMPLE_QUERIES = [
  { label: 'Desk lamp', query: 'Minimalist desk lamp under $80 for a clean WFH setup' },
  { label: 'Travel bag', query: 'Travel backpack for 3-day trips with a laptop compartment' },
  { label: 'Coding setup', query: 'Best keyboard and monitor combo for software engineering' },
  { label: 'Headphones', query: 'Noise-cancelling headphones for focused remote work' },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`star ${i <= Math.round(rating) ? 'filled' : ''}`}>★</span>
      ))}
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="loading-dots flex gap-1.5">
      <span /><span /><span />
    </div>
  )
}

function ShimmerCard() {
  return (
    <div className="product-card">
      <div className="flex items-start gap-4 mb-4">
        <div className="shimmer w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="shimmer h-4 w-2/3 rounded" />
          <div className="shimmer h-3 w-1/3 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="shimmer h-3 rounded w-full" />
        <div className="shimmer h-3 rounded w-4/5" />
        <div className="shimmer h-3 rounded w-3/5" />
      </div>
    </div>
  )
}

function ProductCard({
  product,
  index,
  isTopPick,
}: {
  product: Product
  index: number
  isTopPick: boolean
}) {
  const icon = CATEGORY_ICONS[product.category] || '📦'
  const gradient = CATEGORY_GRADIENTS[product.category] || 'from-slate-600/20 to-zinc-600/20'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={`product-card ${isTopPick ? 'top-pick-card' : ''}`}
    >
      {isTopPick && (
        <div className="absolute top-3 right-3">
          <span className="badge badge-violet">Top Pick</span>
        </div>
      )}
      <div className="flex items-start gap-3 mb-4">
        <div className={`product-icon-wrap bg-gradient-to-br ${gradient}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1 pr-16">
          <p className="text-white font-semibold text-sm leading-snug truncate">{product.name}</p>
          <p className="text-[var(--text-3)] text-xs mt-0.5">{product.brand}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-bold text-xl">${product.price.toLocaleString()}</span>
        <div className="flex items-center gap-1.5">
          <StarRating rating={product.rating} />
          <span className="text-[var(--text-3)] text-xs">{product.rating}</span>
        </div>
      </div>

      <p className="text-[var(--text-2)] text-xs leading-relaxed mb-4 line-clamp-2">
        {product.summary}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {product.attributes.slice(0, 3).map(attr => (
          <span
            key={attr}
            className="px-2 py-0.5 rounded-md text-[10px] font-medium text-[var(--text-2)] bg-white/[0.04] border border-white/[0.06]"
          >
            {attr}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

function ApiKeyModal({
  onSave,
  onClose,
}: {
  onSave: (key: string) => void
  onClose: () => void
}) {
  const [val, setVal] = useState('')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!val.startsWith('sk-')) {
      setError('API key must start with sk-')
      return
    }
    onSave(val.trim())
  }

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="glass w-full max-w-md rounded-2xl p-8"
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20 flex items-center justify-center text-xl">
            🔑
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">Add OpenAI API Key</h2>
            <p className="text-[var(--text-3)] text-xs mt-0.5">Stored in session only, never transmitted</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            className="api-key-input"
            placeholder="sk-..."
            value={val}
            onChange={e => { setVal(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <p className="text-[var(--text-3)] text-xs leading-relaxed">
            Your key unlocks structured AI recommendations layered on top of catalog retrieval.
            It is only used for the current browser session.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={handleSave}>
            Unlock AI
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function AIPanel({
  result,
  isLoading,
  products,
}: {
  result: { topPick: string; shortlist: string[]; reasoning: string; comparison: string } | null
  isLoading: boolean
  products: Product[]
}) {
  if (!isLoading && !result) return null

  return (
    <motion.div
      className="ai-panel mt-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="ai-panel-header">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-cyan-500/20 flex items-center justify-center text-sm">
          ✦
        </div>
        <span className="text-white font-semibold text-sm">AI Recommendation</span>
        {isLoading && <LoadingDots />}
        <div className="ml-auto">
          <span className="badge badge-cyan text-[10px]">gpt-4.1-mini</span>
        </div>
      </div>

      <div className="p-6">
        {isLoading && (
          <div className="space-y-3">
            <div className="shimmer h-4 rounded w-4/5" />
            <div className="shimmer h-4 rounded w-full" />
            <div className="shimmer h-4 rounded w-3/5" />
          </div>
        )}

        {result && !isLoading && (
          <div className="space-y-5">
            {result.topPick && (
              <div>
                <p className="text-[var(--text-3)] text-xs font-semibold uppercase tracking-wider mb-2">Top Recommendation</p>
                <p className="text-white font-semibold text-base">{result.topPick}</p>
              </div>
            )}

            {result.shortlist.length > 0 && (
              <div>
                <p className="text-[var(--text-3)] text-xs font-semibold uppercase tracking-wider mb-2">Shortlist</p>
                <div className="flex flex-wrap gap-2">
                  {result.shortlist.map(name => (
                    <span key={name} className="badge badge-violet">{name}</span>
                  ))}
                </div>
              </div>
            )}

            {result.reasoning && (
              <div>
                <p className="text-[var(--text-3)] text-xs font-semibold uppercase tracking-wider mb-2">Why these products</p>
                <p className="text-[var(--text-2)] text-sm leading-relaxed">{result.reasoning}</p>
              </div>
            )}

            {result.comparison && (
              <div>
                <div className="gradient-divider mb-4" />
                <p className="text-[var(--text-3)] text-xs font-semibold uppercase tracking-wider mb-2">How to choose</p>
                <p className="text-[var(--text-2)] text-sm leading-relaxed">{result.comparison}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function Page() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('text')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [candidates, setCandidates] = useState<Product[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [pipeline, setPipeline] = useState<PipelineStage>('idle')
  const [apiKey, setApiKey] = useState('')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [aiResult, setAiResult] = useState<{ topPick: string; shortlist: string[]; reasoning: string; comparison: string } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [imageName, setImageName] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<{ start(): void; stop(): void } | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const categories = getCategories(catalog as Product[])

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) setApiKey(saved)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    type SpeechRecognitionCtor = new () => {
      lang: string
      interimResults: boolean
      maxAlternatives: number
      start(): void
      stop(): void
      onresult: ((e: { results: SpeechRecognitionResultList }) => void) | null
      onend: (() => void) | null
      onerror: (() => void) | null
    }
    const win = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (e: { results: SpeechRecognitionResultList }) => {
      const t = Array.from(e.results).map(r => r[0]?.transcript ?? '').join(' ').trim()
      setTranscript(t)
      if (e.results[e.results.length - 1]?.isFinal) {
        setQuery(prev => (prev ? `${prev.trim()} ${t}` : t))
      }
    }
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    recognitionRef.current = rec
  }, [])

  const toggleVoice = () => {
    const rec = recognitionRef.current
    if (!rec) return
    if (isListening) {
      rec.stop()
    } else {
      setTranscript('')
      rec.start()
      setIsListening(true)
    }
  }

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      setImageDataUrl(e.target?.result as string)
      setImageName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q && !imageDataUrl) return

    setHasSearched(true)
    setAiResult(null)
    setAiError('')
    setPipeline('retrieving')

    await new Promise(r => setTimeout(r, 300))

    const budget = extractBudget(q)
    setPipeline('ranking')

    await new Promise(r => setTimeout(r, 250))

    const results = retrieveProducts(catalog as Product[], q, selectedCategories, budget)
    setCandidates(results)
    setPipeline('done')

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)

    if (apiKey && results.length > 0) {
      setPipeline('reasoning')
      setAiLoading(true)
      try {
        const rec = await getAIRecommendations(apiKey, q, results, imageDataUrl || undefined)
        setAiResult(rec)
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'AI request failed')
      } finally {
        setAiLoading(false)
        setPipeline('done')
      }
    }
  }, [query, imageDataUrl, selectedCategories, apiKey])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const saveKey = (key: string) => {
    setApiKey(key)
    sessionStorage.setItem(SESSION_KEY, key)
    setShowKeyModal(false)
  }

  const clearKey = () => {
    setApiKey('')
    sessionStorage.removeItem(SESSION_KEY)
    setAiResult(null)
  }

  const topPickName = aiResult?.topPick?.toLowerCase() ?? ''

  const stageIndex = (s: PipelineStage) => {
    if (s === 'idle') return -1
    return PIPELINE_STAGES.findIndex(p => p.key === s)
  }

  return (
    <>
      {/* Background */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />
      <div className="noise-overlay" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-900/30">
            CC
          </div>
          <div>
            <span className="text-white font-semibold text-sm">Commerce Copilot</span>
            <span className="ml-2 badge badge-violet text-[10px]">Demo</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {apiKey ? (
            <>
              <span className="badge badge-green text-[10px]">AI Active</span>
              <button className="btn-ghost text-xs py-1.5 px-3" onClick={clearKey}>
                Clear Key
              </button>
            </>
          ) : (
            <button className="btn-primary text-sm py-2 px-4" onClick={() => setShowKeyModal(true)}>
              ✦ Unlock AI
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 pb-12 text-center">
          <motion.p
            className="text-[var(--text-3)] text-xs font-semibold uppercase tracking-widest mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Multimodal Commerce Intelligence
          </motion.p>

          <motion.h1
            className="gradient-text text-4xl sm:text-5xl font-bold leading-[1.15] tracking-tight mb-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
          >
            Discovery starts with<br />grounded retrieval.
          </motion.h1>

          <motion.p
            className="text-[var(--text-2)] text-base leading-relaxed max-w-xl mx-auto mb-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Search by text, voice, or image. Candidates are ranked from the catalog first —
            then AI reasoning is layered on top.
          </motion.p>

          {/* Pipeline strip */}
          <motion.div
            className="flex items-center justify-center gap-1 flex-wrap mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <span className="pipeline-step active text-xs">Input</span>
            <span className="text-[var(--text-3)] text-xs">→</span>
            {PIPELINE_STAGES.map((s, i) => {
              const cur = stageIndex(pipeline)
              const isDone = cur > i
              const isActive = cur === i
              return (
                <span key={s.key}>
                  <span className={`pipeline-step text-xs ${isActive ? 'active' : isDone ? 'done' : ''}`}>
                    {isDone ? '✓ ' : ''}{s.label}
                  </span>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <span className="text-[var(--text-3)] text-xs mx-0.5">→</span>
                  )}
                </span>
              )
            })}
          </motion.div>

          {/* Sample chips */}
          <motion.div
            className="flex flex-wrap justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {SAMPLE_QUERIES.map(s => (
              <button
                key={s.label}
                className="chip text-xs"
                onClick={() => {
                  setQuery(s.query)
                  setMode('text')
                  textareaRef.current?.focus()
                }}
              >
                {s.label} ↗
              </button>
            ))}
          </motion.div>
        </section>

        {/* Search interface */}
        <motion.section
          className="glass rounded-2xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Mode tabs */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/[0.03] w-fit">
            {(Object.keys(MODE_CONFIG) as SearchMode[]).map(m => (
              <button
                key={m}
                className={`mode-tab ${mode === m ? 'active' : ''}`}
                onClick={() => setMode(m)}
              >
                <span>{MODE_CONFIG[m].icon}</span>
                {MODE_CONFIG[m].label}
              </button>
            ))}
          </div>

          {/* Text mode */}
          {mode === 'text' && (
            <div className="relative">
              <textarea
                ref={textareaRef}
                className="search-input"
                rows={3}
                placeholder="Find me a minimalist desk lamp under $80 for a clean WFH setup…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          {/* Voice mode */}
          {mode === 'voice' && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <button
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
                    isListening
                      ? 'bg-red-500/20 border border-red-500/40'
                      : 'bg-violet-600/20 border border-violet-500/30'
                  }`}
                  onClick={toggleVoice}
                >
                  {isListening && <div className="voice-ring" />}
                  {isListening ? '◼' : '◎'}
                </button>
                <div>
                  <p className="text-white text-sm font-medium">
                    {isListening ? 'Listening…' : 'Click to speak'}
                  </p>
                  <p className="text-[var(--text-3)] text-xs">
                    {isListening ? 'Speak your product request' : 'Voice will append to your text query'}
                  </p>
                </div>
              </div>
              {transcript && (
                <p className="text-[var(--text-2)] text-sm italic px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  "{transcript}"
                </p>
              )}
              {query && (
                <textarea
                  className="search-input"
                  rows={2}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Query from voice (editable)"
                />
              )}
            </div>
          )}

          {/* Image mode */}
          {mode === 'image' && (
            <div className="space-y-3">
              {imageDataUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={imageDataUrl}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-xl border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{imageName}</p>
                    <button
                      className="text-[var(--text-3)] text-xs hover:text-red-400 transition-colors mt-1"
                      onClick={() => { setImageDataUrl(''); setImageName('') }}
                    >
                      Remove image
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOver(false)
                    const file = e.dataTransfer.files[0]
                    if (file) handleImageFile(file)
                  }}
                >
                  <span className="text-3xl">◈</span>
                  <p className="text-[var(--text-2)] text-sm font-medium">Drop an image or click to upload</p>
                  <p className="text-[var(--text-3)] text-xs">Find visually similar products</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
                  />
                </div>
              )}
              <textarea
                className="search-input"
                rows={2}
                placeholder="Optional: describe what you're looking for…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          {/* Category filter */}
          <div className="mt-4">
            <div className="category-scroll">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`chip ${selectedCategories.includes(cat) ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {CATEGORY_ICONS[cat] || '📦'} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.05]">
            <p className="text-[var(--text-3)] text-xs">
              {apiKey
                ? '✦ AI reasoning active'
                : 'Add an OpenAI key to unlock AI recommendations'}
            </p>
            <button
              className="btn-primary"
              onClick={handleSearch}
              disabled={pipeline === 'retrieving' || pipeline === 'ranking'}
            >
              {pipeline === 'retrieving' || pipeline === 'ranking'
                ? 'Searching…'
                : '↳ Search'}
            </button>
          </div>
        </motion.section>

        {/* Results */}
        <div ref={resultsRef}>
          <AnimatePresence mode="wait">
            {hasSearched && (
              <motion.section
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-white font-semibold text-base">
                      {pipeline === 'retrieving' || pipeline === 'ranking'
                        ? 'Retrieving candidates…'
                        : `${candidates.length} result${candidates.length !== 1 ? 's' : ''}`}
                    </h2>
                    {candidates.length > 0 && pipeline === 'done' && (
                      <p className="text-[var(--text-3)] text-xs mt-0.5">
                        Ranked by relevance and quality
                      </p>
                    )}
                  </div>
                  {candidates.length > 0 && (
                    <span className="badge badge-violet">{candidates.length} matched</span>
                  )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(pipeline === 'retrieving' || pipeline === 'ranking')
                    ? Array.from({ length: 6 }).map((_, i) => <ShimmerCard key={i} />)
                    : candidates.map((product, i) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          index={i}
                          isTopPick={!!topPickName && product.name.toLowerCase().includes(topPickName)}
                        />
                      ))}
                </div>

                {candidates.length === 0 && pipeline === 'done' && (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-3">◎</p>
                    <p className="text-white font-medium mb-1">No matches found</p>
                    <p className="text-[var(--text-3)] text-sm">Try a different query or remove category filters</p>
                  </div>
                )}

                {/* AI error */}
                {aiError && (
                  <div className="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                    <p className="text-red-400 text-sm">{aiError}</p>
                  </div>
                )}

                {/* AI Panel */}
                {(aiLoading || aiResult) && (
                  <AIPanel
                    result={aiResult}
                    isLoading={aiLoading}
                    products={candidates}
                  />
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!hasSearched && (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-5xl mb-4 opacity-30">✦</div>
              <p className="text-[var(--text-3)] text-sm">
                Enter a query above to start discovering products
              </p>
            </motion.div>
          )}
        </div>
      </main>

      {/* API Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <ApiKeyModal onSave={saveKey} onClose={() => setShowKeyModal(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

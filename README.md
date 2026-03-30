# Commerce Copilot

A multimodal product discovery engine that lets shoppers find products using natural language, voice, or images — going beyond keyword search to understand intent.

---

## Problem

Traditional e-commerce search is keyword-dependent. Shoppers often can't describe what they want precisely, leading to poor results, long browse sessions, and abandoned carts. Commerce Copilot understands natural language, recognizes products from photos, and interprets voice queries.

---

## How It Works

```
User Input (text / voice / image)
          │
    ┌─────┴─────┐
    │           │
  Text/Voice  Image
    │           │
  NLP Intent  Vision API
  Extraction  (product recognition)
    │           │
    └─────┬─────┘
          │
    RAG Pipeline
    (product catalog embeddings)
          │
          ▼
    Ranked Results + Explanation
          │
          ▼
    React Storefront
```

1. **Text/Voice** — NLP intent extraction understands queries like "something warm for a winter hike under $100"
2. **Image** — Vision API identifies products, colors, styles from uploaded photos ("find me something like this")
3. **RAG** — semantic search over product catalog embeddings retrieves relevant items beyond exact keyword matches
4. **Ranking** — results ranked by relevance with plain-language explanation of why each item matches

---

## Tech Stack

- **Node.js**, **Express** (API server)
- **React**, **TypeScript** (storefront)
- **OpenAI API** (GPT-4V for vision, embeddings, intent parsing)
- **MongoDB** (product catalog)
- **FAISS** (vector search)
- **Web Speech API** (voice input)

---

## Key Features

- Text, voice, and image search from a single unified interface
- Intent understanding — handles vague, conversational queries
- Visual similarity search — upload a photo to find matching products
- RAG over product catalog — semantic search, not just keyword matching
- Explanation layer — tells the user *why* each result matches their query

---

## Setup

```bash
git clone https://github.com/Hperam/commerce-copilot
cd commerce-copilot
cp .env.example .env  # add OpenAI API key, MongoDB URI

# Backend
cd server
npm install
npm run dev

# Frontend
cd ../client
npm install
npm run dev
```

---

*Built by [Harshith Sai Peram](https://hperam.github.io)*

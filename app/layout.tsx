import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Commerce Copilot — Multimodal Product Discovery',
  description: 'AI-powered product discovery using text, voice, and image search with grounded catalog retrieval and structured AI reasoning.',
  openGraph: {
    title: 'Commerce Copilot',
    description: 'Multimodal product discovery powered by grounded AI reasoning.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}

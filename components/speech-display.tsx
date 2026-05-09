'use client'

import { useState, useCallback } from 'react'
import type { Speech } from '@/lib/schemas/speech.schema'

interface SpeechDisplayProps {
  speech: Speech
  companyName: string
}

export function SpeechDisplay({ speech, companyName }: SpeechDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(speech.full_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [speech.full_text])

  const handleDownload = useCallback(() => {
    const blob = new Blob([speech.full_text], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Speech_${companyName.trim().replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [speech.full_text, companyName])

  const sections: { key: keyof Speech['sections']; label: string }[] = [
    { key: 'introduction', label: 'Introducción' },
    { key: 'motivation', label: 'Motivación' },
    { key: 'technical_skills', label: 'Habilidades técnicas' },
    { key: 'value_proposition', label: 'Propuesta de valor' },
  ]

  return (
    <div className="space-y-5">
      {/* Sections */}
      {sections.map(({ key, label }) => (
        <section key={key}>
          <SectionTitle>{label}</SectionTitle>
          <p className="text-sm text-gray-700 leading-relaxed">{speech.sections[key]}</p>
        </section>
      ))}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleCopy}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? 'Copiado!' : 'Copiar texto'}
        </button>
        <button
          onClick={handleDownload}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Descargar .txt
        </button>
      </div>

      {/* Meta */}
      <footer className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-400">
          {speech.word_count} palabras · {speech.estimated_duration_minutes} min estimado
        </p>
      </footer>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </h4>
  )
}

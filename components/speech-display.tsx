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
      {sections.map(({ key, label }) => (
        <section key={key}>
          <SectionTitle>{label}</SectionTitle>
          <p className="text-sm text-ink-2 leading-relaxed">{speech.sections[key]}</p>
        </section>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleCopy}
          className="border border-rule px-4 py-2 text-sm font-medium text-ink-3 hover:border-ink hover:bg-paper-2 transition-colors duration-150"
        >
          {copied ? 'Copiado' : 'Copiar texto'}
        </button>
        <button
          onClick={handleDownload}
          className="border border-rule px-4 py-2 text-sm font-medium text-ink-3 hover:border-ink hover:bg-paper-2 transition-colors duration-150"
        >
          Descargar .txt
        </button>
      </div>

      <footer className="border-t border-rule-soft pt-3">
        <p className="text-xs text-ink-5">
          {speech.word_count} palabras · {speech.estimated_duration_minutes} min estimado
        </p>
      </footer>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-4">
      {children}
    </h4>
  )
}

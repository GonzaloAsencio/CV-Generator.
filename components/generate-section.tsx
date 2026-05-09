'use client'

import { useState, useCallback, useRef } from 'react'
import { GenerateForm } from './generate-form'
import { CvPreview } from './cv-preview'
import { DownloadCvButton } from './download-cv-button'
import { SpeechDisplay } from './speech-display'
import type { GenerateResult } from './generate-form'
import type { Speech } from '@/lib/schemas/speech.schema'

type SpeechState = 'idle' | 'generating' | 'error'

export function GenerateSection() {
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [speech, setSpeech] = useState<Speech | null>(null)
  const [speechState, setSpeechState] = useState<SpeechState>('idle')
  const speechKeyRef = useRef<string | null>(null)

  const handleNewResult = useCallback((r: GenerateResult) => {
    setResult(r)
    setSpeech(null)
    setSpeechState('idle')
  }, [])

  const handleGenerateSpeech = useCallback(async () => {
    if (!result || speechState === 'generating') return
    speechKeyRef.current = crypto.randomUUID()
    setSpeech(null)
    setSpeechState('generating')

    try {
      const res = await fetch('/api/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': speechKeyRef.current,
        },
        body: JSON.stringify({
          jobOffer: result.jobOffer,
          company: result.company,
          generatedCvId: result.meta.generationId,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setSpeechState('error')
        return
      }

      setSpeech((json as { speech: Speech }).speech)
      setSpeechState('idle')
    } catch {
      setSpeechState('error')
    }
  }, [result, speechState])

  return (
    <div className="space-y-6">
      <GenerateForm onSuccess={handleNewResult} />

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">CV generado</h3>
            <div className="flex items-center gap-3">
              <DownloadCvButton cv={result.cv} companyName={result.companyName} />
              <button
                onClick={() => { setResult(null); setSpeech(null) }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
          <CvPreview cv={result.cv} meta={result.meta} />
        </div>
      )}

      {result && !speech && (
        <div className="space-y-2">
          <div className="flex justify-center">
            <button
              onClick={handleGenerateSpeech}
              disabled={speechState === 'generating'}
              className="rounded-lg border border-blue-600 px-5 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {speechState === 'generating' ? 'Generando speech…' : 'Generar speech técnico'}
            </button>
          </div>
          {speechState === 'error' && (
            <p className="text-center text-sm text-red-600">
              Error al generar el speech. Intentá de nuevo.
            </p>
          )}
        </div>
      )}

      {speech && result && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Speech técnico</h3>
            <button
              onClick={() => { setSpeech(null); setSpeechState('idle') }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Limpiar
            </button>
          </div>
          <SpeechDisplay speech={speech} companyName={result.companyName} />
        </div>
      )}
    </div>
  )
}

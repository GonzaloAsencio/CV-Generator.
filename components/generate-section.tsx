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
  const [speechError, setSpeechError] = useState('')
  const speechKeyRef = useRef<string | null>(null)

  const handleNewResult = useCallback((r: GenerateResult) => {
    setResult(r)
    setSpeech(null)
    setSpeechState('idle')
    setSpeechError('')
  }, [])

  const handleGenerateSpeech = useCallback(async () => {
    if (!result || speechState === 'generating') return
    speechKeyRef.current = crypto.randomUUID()
    setSpeech(null)
    setSpeechState('generating')
    setSpeechError('')

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
        const code = json.error?.code
        const msg =
          code === 'RATE_LIMIT'
            ? 'Alcanzaste el límite de generaciones. Esperá unos minutos e intentá de nuevo.'
            : code === 'NOT_FOUND'
              ? 'No se encontró el CV generado. Generá un CV primero.'
              : json.error?.message ?? 'Error al generar el speech. Intentá de nuevo.'
        setSpeechError(msg)
        setSpeechState('error')
        return
      }

      setSpeech((json as { speech: Speech }).speech)
      setSpeechState('idle')
    } catch {
      setSpeechError('Error de red. Verificá tu conexión e intentá de nuevo.')
      setSpeechState('error')
    }
  }, [result, speechState])

  return (
    <div className="space-y-6">
      <GenerateForm onSuccess={handleNewResult} />

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
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
              {speechState === 'generating' ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Generando speech…
                </span>
              ) : (
                'Generar speech técnico'
              )}
            </button>
          </div>

          {speechState === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center">
              <p className="text-sm text-red-700">{speechError}</p>
              <button
                onClick={handleGenerateSpeech}
                className="mt-1.5 text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-800"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      )}

      {speech && result && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
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

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import type { CompanyInput } from '@/lib/schemas/api-inputs.schema'

export interface GenerateResult {
  cv: HarvardCv
  meta: { chunksUsed: number; topSimilarity: number; generationId: string }
  companyName: string
  jobOffer: string
  company: CompanyInput
}

type GenerateState =
  | { status: 'idle' }
  | { status: 'generating' }
  | { status: 'error'; message: string }

interface GenerateFormProps {
  onSuccess: (result: GenerateResult) => void
}

export function GenerateForm({ onSuccess }: GenerateFormProps) {
  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    techStack: '',
    culture: '',
    notes: '',
    jobOffer: '',
  })
  const [state, setState] = useState<GenerateState>({ status: 'idle' })
  const [elapsed, setElapsed] = useState(0)
  const idempotencyKeyRef = useRef<string | null>(null)

  const isGenerating = state.status === 'generating'

  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isGenerating])

  const handleField = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (isGenerating) return

      if (!form.companyName.trim()) {
        setState({ status: 'error', message: 'El nombre de la empresa es obligatorio.' })
        return
      }
      if (form.jobOffer.trim().length < 100) {
        setState({ status: 'error', message: 'La oferta debe tener al menos 100 caracteres.' })
        return
      }

      idempotencyKeyRef.current = crypto.randomUUID()
      setElapsed(0)
      setState({ status: 'generating' })

      const techStack = form.techStack
        ? form.techStack.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined

      const body = {
        jobOffer: form.jobOffer.trim(),
        company: {
          name: form.companyName.trim(),
          ...(form.industry.trim() && { industry: form.industry.trim() }),
          ...(techStack?.length && { techStack }),
          ...(form.culture.trim() && { culture: form.culture.trim() }),
          ...(form.notes.trim() && { notes: form.notes.trim() }),
        },
      }

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKeyRef.current,
          },
          body: JSON.stringify(body),
        })
        const json = await res.json()

        if (!res.ok) {
          const code = json.error?.code
          const message =
            code === 'NOT_FOUND'
              ? 'Todavía no subiste tu CV. Subilo en la sección "Tu CV base" más arriba.'
              : code === 'RATE_LIMIT'
                ? 'Alcanzaste el límite de generaciones. Esperá unos minutos e intentá de nuevo.'
                : json.error?.message ?? 'Error al generar el CV. Intentá de nuevo.'
          setState({ status: 'error', message })
          return
        }

        setState({ status: 'idle' })
        onSuccess({
          ...(json as Omit<GenerateResult, 'companyName' | 'jobOffer' | 'company'>),
          companyName: form.companyName.trim(),
          jobOffer: form.jobOffer.trim(),
          company: body.company,
        })
      } catch {
        setState({ status: 'error', message: 'Error de red. Verificá tu conexión e intentá de nuevo.' })
      }
    },
    [form, isGenerating, onSuccess],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Company fields */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700">Empresa</legend>

        <input
          type="text"
          placeholder="Nombre de la empresa *"
          value={form.companyName}
          onChange={handleField('companyName')}
          disabled={isGenerating}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Industria (ej: Fintech, E-commerce)"
            value={form.industry}
            onChange={handleField('industry')}
            disabled={isGenerating}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
          />
          <div>
            <FieldLabel
              htmlFor="techStack"
              label="Tech stack"
              tooltip="Tecnologías de la empresa, separadas por comas. El modelo las incorporará en tu CV y speech. Ej: React, Node.js, AWS, PostgreSQL"
            />
            <input
              id="techStack"
              type="text"
              placeholder="React, Node.js, AWS…"
              value={form.techStack}
              onChange={handleField('techStack')}
              disabled={isGenerating}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        <div>
          <FieldLabel
            htmlFor="culture"
            label="Cultura"
            tooltip="Valores o estilo de trabajo. Ej: 'startup ágil, trabajo remoto, product-led'. Personaliza el tono del CV."
          />
          <input
            id="culture"
            type="text"
            placeholder="Startup ágil, trabajo remoto, foco en producto…"
            value={form.culture}
            onChange={handleField('culture')}
            disabled={isGenerating}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        <div>
          <FieldLabel
            htmlFor="notes"
            label="Notas"
            tooltip="Contexto adicional: por qué te interesa el rol, nombre del hiring manager, proyecto específico, etc."
          />
          <input
            id="notes"
            type="text"
            placeholder="Por qué te interesa este rol, detalles del equipo…"
            value={form.notes}
            onChange={handleField('notes')}
            disabled={isGenerating}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
      </fieldset>

      {/* Job offer */}
      <div>
        <textarea
          placeholder="Pegá la oferta de trabajo completa *"
          value={form.jobOffer}
          onChange={handleField('jobOffer')}
          disabled={isGenerating}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 resize-none"
        />
        <p className="mt-1 text-xs text-gray-400">
          {form.jobOffer.trim().length} / 100 caracteres mínimo
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isGenerating}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 transition-colors"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner />
            Generando CV{elapsed > 0 ? ` · ${elapsed}s` : '…'}
          </span>
        ) : (
          'Generar CV Harvard'
        )}
      </button>

      {isGenerating && (
        <p className="text-center text-xs text-gray-400">
          El modelo analiza tu CV y la oferta. Puede tardar hasta 30 segundos.
        </p>
      )}

      {state.status === 'error' && (
        <p className="text-sm font-medium text-red-600">{state.message}</p>
      )}
    </form>
  )
}

function FieldLabel({
  htmlFor,
  label,
  tooltip,
}: {
  htmlFor: string
  label: string
  tooltip?: string
}) {
  return (
    <div className="mb-1 flex items-center gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-gray-600">
        {label}
      </label>
      {tooltip && <Tooltip text={tooltip} />}
    </div>
  )
}

function Tooltip({ text }: { text: string }) {
  return (
    <span title={text} className="group relative ml-0.5 inline-flex cursor-help">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500 transition-colors hover:bg-gray-300">
        ?
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-56 rounded-lg bg-gray-900 px-2.5 py-2 text-xs leading-relaxed text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
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

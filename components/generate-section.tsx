'use client'

import { useState } from 'react'
import { GenerateForm } from './generate-form'
import { CvPreview } from './cv-preview'
import type { GenerateResult } from './generate-form'

export function GenerateSection() {
  const [result, setResult] = useState<GenerateResult | null>(null)

  return (
    <div className="space-y-6">
      <GenerateForm onSuccess={setResult} />

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">CV generado</h3>
            <button
              onClick={() => setResult(null)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Limpiar
            </button>
          </div>
          <CvPreview cv={result.cv} meta={result.meta} />
        </div>
      )}
    </div>
  )
}

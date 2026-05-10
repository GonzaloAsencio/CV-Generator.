'use client'

import { useState, useCallback } from 'react'
import { CvUploadForm } from '@/components/cv-upload-form'
import { PersonalInfoForm } from '@/components/personal-info-form'

interface PersonalInfoData {
  fullName:    string | null
  email:       string | null
  phone:       string | null
  location:    string | null
  linkedinUrl: string | null
  githubUrl:   string | null
}

interface ProfileCvFormProps {
  cvText: string
  personalInfo: PersonalInfoData
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function ProfileCvForm({ cvText: initialCvText, personalInfo }: ProfileCvFormProps) {
  const [cvText, setCvText] = useState(initialCvText)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSave = async () => {
    setSaveState('saving')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText }),
      })
      if (!res.ok) {
        const json = await res.json()
        setErrorMessage(json.error?.message ?? 'Error al guardar.')
        setSaveState('error')
        return
      }
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 3000)
    } catch {
      setErrorMessage('Error de red. Intentá de nuevo.')
      setSaveState('error')
    }
  }

  const handleUploadSuccess = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      if (!res.ok) return
      const json = await res.json()
      if (json.cvText) setCvText(json.cvText)
    } catch {
      // silently ignore
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Datos personales */}
      <PersonalInfoForm initialData={personalInfo} />

      <hr className="border-gray-100" />

      {/* PDF import */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Importar desde PDF</h2>
        <p className="text-sm text-gray-500 mb-4">
          Subí un PDF y el texto se extraerá automáticamente al editor de abajo.
        </p>
        <CvUploadForm onSuccess={handleUploadSuccess} />
      </section>

      {/* Text editor */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold">Tu CV en texto</h2>
            <p className="text-sm text-gray-500">
              Podés editar el texto directamente. Este contenido se usa para generar tus CVs adaptados.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            {saveState === 'saving' ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        <textarea
          value={cvText}
          onChange={(e) => {
            setCvText(e.target.value)
            if (saveState === 'saved' || saveState === 'error') setSaveState('idle')
          }}
          rows={24}
          placeholder="Pegá o escribí tu CV aquí…"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm text-gray-800 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-0 resize-y"
        />

        {saveState === 'saved' && (
          <p className="mt-2 text-sm font-medium text-green-600">CV guardado correctamente.</p>
        )}
        {saveState === 'error' && (
          <p className="mt-2 text-sm font-medium text-red-600">{errorMessage}</p>
        )}
        <p className="mt-1 text-xs text-gray-400">{cvText.length.toLocaleString('es-AR')} / 50.000 caracteres</p>
      </section>
    </div>
  )
}

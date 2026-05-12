'use client'

import { useState } from 'react'

interface PersonalInfoData {
  fullName:    string | null
  email:       string | null
  phone:       string | null
  location:    string | null
  linkedinUrl: string | null
  githubUrl:   string | null
}

interface PersonalInfoFormProps {
  initialData: PersonalInfoData
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const inputClass =
  'w-full border border-rule bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-5 focus:outline-none focus:border-ink focus:ring-2 focus:ring-accent/20 transition-colors duration-150'
const labelClass = 'font-mono text-[11px] uppercase tracking-[0.15em] text-ink-4 mb-2 block'

export function PersonalInfoForm({ initialData }: PersonalInfoFormProps) {
  const [form, setForm] = useState({
    fullName:    initialData.fullName    ?? '',
    email:       initialData.email       ?? '',
    phone:       initialData.phone       ?? '',
    location:    initialData.location    ?? '',
    linkedinUrl: initialData.linkedinUrl ?? '',
    githubUrl:   initialData.githubUrl   ?? '',
  })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleField =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (saveState === 'saved' || saveState === 'error') setSaveState('idle')
    }

  const handleSave = async () => {
    setSaveState('saving')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalInfo: form }),
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

  return (
    <section>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Datos personales</h2>
          <p className="text-sm text-ink-4 mt-0.5">
            Esta información se usa directamente al generar tus CVs y tiene prioridad sobre los datos
            extraídos del PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="shrink-0 inline-flex items-center justify-center bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {saveState === 'saving' ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="pi-fullName" className={labelClass}>
            Nombre completo <span className="normal-case text-ink-5">(aparece en el CV)</span>
          </label>
          <input
            id="pi-fullName"
            type="text"
            value={form.fullName}
            onChange={handleField('fullName')}
            placeholder="Nombre Apellido"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pi-email" className={labelClass}>Email</label>
          <input
            id="pi-email"
            type="email"
            value={form.email}
            onChange={handleField('email')}
            placeholder="nombre@ejemplo.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pi-phone" className={labelClass}>Teléfono</label>
          <input
            id="pi-phone"
            type="tel"
            value={form.phone}
            onChange={handleField('phone')}
            placeholder="+54 11 1234-5678"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="pi-location" className={labelClass}>Ubicación</label>
          <input
            id="pi-location"
            type="text"
            value={form.location}
            onChange={handleField('location')}
            placeholder="Ciudad, País"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pi-linkedin" className={labelClass}>LinkedIn</label>
          <input
            id="pi-linkedin"
            type="url"
            value={form.linkedinUrl}
            onChange={handleField('linkedinUrl')}
            placeholder="https://linkedin.com/in/tu-perfil"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pi-github" className={labelClass}>GitHub</label>
          <input
            id="pi-github"
            type="url"
            value={form.githubUrl}
            onChange={handleField('githubUrl')}
            placeholder="https://github.com/tu-usuario"
            className={inputClass}
          />
        </div>
      </div>

      {saveState === 'saved' && (
        <p className="mt-3 text-sm font-medium text-positive">Datos personales guardados.</p>
      )}
      {saveState === 'error' && (
        <p className="mt-3 text-sm font-medium text-danger">{errorMessage}</p>
      )}
    </section>
  )
}

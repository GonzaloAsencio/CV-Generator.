'use client'

import { useState } from 'react'
import type { ProfileData } from '@/lib/schemas/profile-data.schema'
import { ExperienceSection } from '@/components/experience-section'
import { EducationSection } from '@/components/education-section'

interface Props {
  initialData: ProfileData
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-0'
const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

const listToText = (arr: string[]) => arr.join('\n')
const textToList = (t: string) => t.split('\n').map(l => l.replace(/^[-•·,]\s*/, '').trim()).filter(Boolean)
const csvToList  = (t: string) => t.split(',').map(s => s.trim()).filter(Boolean)
const listToCsv  = (arr: string[]) => arr.join(', ')

export function StructuredProfileForm({ initialData }: Props) {
  const [experience,     setExperience]     = useState(initialData.experience)
  const [education,      setEducation]      = useState(initialData.education)
  const [techSkills,     setTechSkills]     = useState(listToCsv(initialData.skills.technical))
  const [softSkills,     setSoftSkills]     = useState(listToCsv(initialData.skills.soft))
  const [languages,      setLanguages]      = useState(
    initialData.languages.map(l => ({ ...l, id: crypto.randomUUID() }))
  )
  const [certifications, setCertifications] = useState(listToText(initialData.certifications))
  const [saveState,      setSaveState]      = useState<SaveState>('idle')
  const [errorMessage,   setErrorMessage]   = useState('')

  const addLanguage = () =>
    setLanguages(prev => [...prev, { id: crypto.randomUUID(), language: '', level: '' }])

  const updateLanguage = (id: string, field: 'language' | 'level', value: string) =>
    setLanguages(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))

  const removeLanguage = (id: string) =>
    setLanguages(prev => prev.filter(l => l.id !== id))

  const handleSave = async () => {
    setSaveState('saving')

    const profileData: ProfileData = {
      experience,
      education,
      skills: {
        technical: csvToList(techSkills),
        soft:      csvToList(softSkills),
      },
      certifications: textToList(certifications),
      languages: languages
        .filter(l => l.language.trim())
        .map(({ language, level }) => ({ language: language.trim(), level: level.trim() })),
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData }),
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
    <div className="space-y-10">
      {/* Experiencia */}
      <ExperienceSection entries={experience} onChange={setExperience} />

      <hr className="border-gray-100" />

      {/* Educación */}
      <EducationSection entries={education} onChange={setEducation} />

      <hr className="border-gray-100" />

      {/* Skills */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Habilidades</h2>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>
              Técnicas <span className="text-gray-400">(separadas por coma)</span>
            </label>
            <input
              type="text"
              value={techSkills}
              onChange={e => setTechSkills(e.target.value)}
              placeholder="React, TypeScript, Node.js, Express.js, Supabase, PostgreSQL"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Blandas <span className="text-gray-400">(separadas por coma)</span>
            </label>
            <input
              type="text"
              value={softSkills}
              onChange={e => setSoftSkills(e.target.value)}
              placeholder="Adaptabilidad, Comunicación, Pensamiento Analítico, Trabajo en Equipo"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Idiomas */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Idiomas</h2>
          <button
            type="button"
            onClick={addLanguage}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + Agregar
          </button>
        </div>
        <div className="space-y-2">
          {languages.map(lang => (
            <div key={lang.id} className="flex items-center gap-2">
              <input
                type="text"
                value={lang.language}
                onChange={e => updateLanguage(lang.id, 'language', e.target.value)}
                placeholder="Español"
                className={`${inputClass} flex-1`}
              />
              <input
                type="text"
                value={lang.level}
                onChange={e => updateLanguage(lang.id, 'level', e.target.value)}
                placeholder="Nativo"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeLanguage(lang.id)}
                className="text-gray-400 hover:text-red-500 transition-colors px-1"
                aria-label="Eliminar idioma"
              >
                ✕
              </button>
            </div>
          ))}
          {languages.length === 0 && (
            <p className="text-sm text-gray-400">Sin idiomas cargados.</p>
          )}
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Certificaciones */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Certificaciones</h2>
        <p className="text-xs text-gray-500 mb-3">Una por línea. Dejá vacío si no tenés.</p>
        <textarea
          rows={4}
          value={certifications}
          onChange={e => setCertifications(e.target.value)}
          placeholder="Oracle Certified Associate, Java SE 8 Programmer (2020)"
          className={`${inputClass} resize-y`}
        />
      </section>

      {/* Save */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="w-full sm:w-auto rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {saveState === 'saving' ? 'Guardando…' : 'Guardar perfil estructurado'}
        </button>
        {saveState === 'saved' && (
          <p className="mt-2 text-sm font-medium text-green-600">Perfil guardado. La próxima generación usará estos datos.</p>
        )}
        {saveState === 'error' && (
          <p className="mt-2 text-sm font-medium text-red-600">{errorMessage}</p>
        )}
      </div>
    </div>
  )
}

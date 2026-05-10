'use client'

import { useState } from 'react'
import type { ProfileData } from '@/lib/schemas/profile-data.schema'
import { ExperienceSection } from '@/components/experience-section'
import { EducationSection } from '@/components/education-section'

interface Props {
  initialData: ProfileData
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const inputClass = 'w-full border border-rule bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-5 focus:outline-none focus:border-ink focus:ring-2 focus:ring-accent/20 transition-colors duration-150'
const labelClass = 'font-mono text-[11px] uppercase tracking-[0.15em] text-ink-4 mb-2 block'

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
      <ExperienceSection entries={experience} onChange={setExperience} />

      <hr className="border-rule-soft" />

      <EducationSection entries={education} onChange={setEducation} />

      <hr className="border-rule-soft" />

      <section>
        <h2 className="text-lg font-semibold text-ink mb-4">Habilidades</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              Técnicas <span className="normal-case text-ink-5">(separadas por coma)</span>
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
              Blandas <span className="normal-case text-ink-5">(separadas por coma)</span>
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

      <hr className="border-rule-soft" />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Idiomas</h2>
          <button
            type="button"
            onClick={addLanguage}
            className="shrink-0 border border-rule px-3 py-1.5 text-sm font-medium text-ink-3 hover:border-ink hover:bg-paper-2 transition-colors duration-150"
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
                className="text-ink-5 hover:text-danger transition-colors duration-150 px-1"
                aria-label="Eliminar idioma"
              >
                ✕
              </button>
            </div>
          ))}
          {languages.length === 0 && (
            <p className="text-sm text-ink-5">Sin idiomas cargados.</p>
          )}
        </div>
      </section>

      <hr className="border-rule-soft" />

      <section>
        <h2 className="text-lg font-semibold text-ink mb-2">Certificaciones</h2>
        <p className="text-xs text-ink-4 mb-3">Una por línea. Dejá vacío si no tenés.</p>
        <textarea
          rows={4}
          value={certifications}
          onChange={e => setCertifications(e.target.value)}
          placeholder="Oracle Certified Associate, Java SE 8 Programmer (2020)"
          className={`${inputClass} resize-y`}
        />
      </section>

      <div className="pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="w-full sm:w-auto inline-flex items-center justify-center bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-ink-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {saveState === 'saving' ? 'Guardando…' : 'Guardar perfil estructurado'}
        </button>
        {saveState === 'saved' && (
          <p className="mt-2 text-sm font-medium text-positive">Perfil guardado. La próxima generación usará estos datos.</p>
        )}
        {saveState === 'error' && (
          <p className="mt-2 text-sm font-medium text-danger">{errorMessage}</p>
        )}
      </div>
    </div>
  )
}

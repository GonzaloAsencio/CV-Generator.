'use client'

import type { ExperienceEntry } from '@/lib/schemas/profile-data.schema'

interface Props {
  entries: ExperienceEntry[]
  onChange: (entries: ExperienceEntry[]) => void
}

const empty = (): ExperienceEntry => ({
  id:         crypto.randomUUID(),
  title:      '',
  company:    '',
  location:   '',
  period:     '',
  highlights: [],
})

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-0'
const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

export function ExperienceSection({ entries, onChange }: Props) {
  const update = (id: string, patch: Partial<ExperienceEntry>) =>
    onChange(entries.map(e => e.id === id ? { ...e, ...patch } : e))

  const remove = (id: string) =>
    onChange(entries.filter(e => e.id !== id))

  const highlightsToText = (h: string[]) => h.join('\n')
  const textToHighlights = (t: string) =>
    t.split('\n').map(l => l.replace(/^[-•·]\s*/, '').trim()).filter(Boolean)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Experiencia laboral</h2>
          <p className="text-xs text-gray-500 mt-0.5">Un punto por línea en los highlights.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...entries, empty()])}
          className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          + Agregar
        </button>
      </div>

      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Experiencia {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(entry.id)}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelClass}>Empresa</label>
                <input
                  type="text"
                  value={entry.company}
                  onChange={e => update(entry.id, { company: e.target.value })}
                  placeholder="Radium Rocket"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Cargo / Rol</label>
                <input
                  type="text"
                  value={entry.title}
                  onChange={e => update(entry.id, { title: e.target.value })}
                  placeholder="XR Developer & Full-Stack Engineer"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Ubicación</label>
                <input
                  type="text"
                  value={entry.location}
                  onChange={e => update(entry.id, { location: e.target.value })}
                  placeholder="Rosario, Argentina"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Período</label>
                <input
                  type="text"
                  value={entry.period}
                  onChange={e => update(entry.id, { period: e.target.value })}
                  placeholder="Ago 2021 – Feb 2026"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Highlights <span className="text-gray-400">(un punto por línea)</span>
                </label>
                <textarea
                  rows={5}
                  value={highlightsToText(entry.highlights)}
                  onChange={e => update(entry.id, { highlights: textToHighlights(e.target.value) })}
                  placeholder="Desarrollé una arquitectura integral usando TypeScript..."
                  className={`${inputClass} font-mono resize-y`}
                />
              </div>
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            Sin experiencias cargadas. Hacé click en "+ Agregar" para empezar.
          </p>
        )}
      </div>
    </section>
  )
}

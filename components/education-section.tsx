'use client'

import type { EducationEntry } from '@/lib/schemas/profile-data.schema'

interface Props {
  entries: EducationEntry[]
  onChange: (entries: EducationEntry[]) => void
}

const empty = (): EducationEntry => ({
  id:          crypto.randomUUID(),
  degree:      '',
  institution: '',
  location:    '',
  year:        '',
  honors:      '',
})

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-0'
const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

export function EducationSection({ entries, onChange }: Props) {
  const update = (id: string, patch: Partial<EducationEntry>) =>
    onChange(entries.map(e => e.id === id ? { ...e, ...patch } : e))

  const remove = (id: string) =>
    onChange(entries.filter(e => e.id !== id))

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Educación</h2>
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
                Educación {idx + 1}
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
                <label className={labelClass}>Institución</label>
                <input
                  type="text"
                  value={entry.institution}
                  onChange={e => update(entry.id, { institution: e.target.value })}
                  placeholder="Universidad Abierta Interamericana (UAI)"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Título / Carrera</label>
                <input
                  type="text"
                  value={entry.degree}
                  onChange={e => update(entry.id, { degree: e.target.value })}
                  placeholder="Tecnicatura Universitaria en Desarrollo de Videojuegos"
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
                <label className={labelClass}>Año</label>
                <input
                  type="text"
                  value={entry.year}
                  onChange={e => update(entry.id, { year: e.target.value })}
                  placeholder="2020"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Mención <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={entry.honors ?? ''}
                  onChange={e => update(entry.id, { honors: e.target.value || undefined })}
                  placeholder="Distinción honorífica, promedio, etc."
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            Sin educación cargada. Hacé click en "+ Agregar" para empezar.
          </p>
        )}
      </div>
    </section>
  )
}

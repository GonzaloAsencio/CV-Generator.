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

const inputClass = 'w-full border border-rule bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-5 focus:outline-none focus:border-ink focus:ring-2 focus:ring-accent/20 transition-colors duration-150'
const labelClass = 'font-mono text-[11px] uppercase tracking-[0.15em] text-ink-4 mb-2 block'

export function EducationSection({ entries, onChange }: Props) {
  const update = (id: string, patch: Partial<EducationEntry>) =>
    onChange(entries.map(e => e.id === id ? { ...e, ...patch } : e))

  const remove = (id: string) =>
    onChange(entries.filter(e => e.id !== id))

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-ink">Educación</h2>
        <button
          type="button"
          onClick={() => onChange([...entries, empty()])}
          className="shrink-0 border border-rule px-3 py-1.5 text-sm font-medium text-ink-3 hover:border-ink hover:bg-paper-2 transition-colors duration-150"
        >
          + Agregar
        </button>
      </div>

      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={entry.id} className="border border-rule bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-4">
                Educación {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(entry.id)}
                className="text-xs text-danger hover:opacity-70 transition-opacity"
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
                  Mención <span className="normal-case text-ink-5">(opcional)</span>
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
          <p className="text-sm text-ink-5 text-center py-4">
            Sin educación cargada. Hacé click en &quot;+ Agregar&quot; para empezar.
          </p>
        )}
      </div>
    </section>
  )
}

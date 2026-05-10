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

const inputClass = 'w-full border border-rule bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-5 focus:outline-none focus:border-ink focus:ring-2 focus:ring-accent/20 transition-colors duration-150'
const labelClass = 'font-mono text-[11px] uppercase tracking-[0.15em] text-ink-4 mb-2 block'

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
          <h2 className="text-lg font-semibold text-ink">Experiencia laboral</h2>
          <p className="text-xs text-ink-4 mt-0.5">Un punto por línea en los highlights.</p>
        </div>
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
                Experiencia {idx + 1}
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
                  Highlights <span className="normal-case text-ink-5">(un punto por línea)</span>
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
          <p className="text-sm text-ink-5 text-center py-4">
            Sin experiencias cargadas. Hacé click en &quot;+ Agregar&quot; para empezar.
          </p>
        )}
      </div>
    </section>
  )
}

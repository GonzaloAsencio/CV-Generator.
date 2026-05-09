import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'

interface CvPreviewProps {
  cv: HarvardCv
  meta?: { chunksUsed: number; topSimilarity: number; generationId: string }
}

export function CvPreview({ cv, meta }: CvPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Personal */}
      <header className="border-b border-gray-200 pb-4">
        <h3 className="text-2xl font-bold text-gray-900">{cv.personal.name}</h3>
        <p className="mt-1 text-base font-medium text-gray-600">{cv.title}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>{cv.personal.email}</span>
          <span>{cv.personal.phone}</span>
          <span>{cv.personal.location}</span>
          {cv.personal.linkedin && <span>{cv.personal.linkedin}</span>}
          {cv.personal.github && <span>{cv.personal.github}</span>}
        </div>
      </header>

      {/* Summary */}
      <section>
        <SectionTitle>Resumen</SectionTitle>
        <p className="text-sm text-gray-700 leading-relaxed">{cv.summary}</p>
      </section>

      {/* Experience */}
      {cv.experience.length > 0 && (
        <section>
          <SectionTitle>Experiencia</SectionTitle>
          <div className="space-y-4">
            {cv.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-sm text-gray-900">{exp.title}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{exp.period}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {exp.company} · {exp.location}
                </p>
                <ul className="mt-1.5 space-y-1 pl-4">
                  {exp.highlights.map((h, j) => (
                    <li key={j} className="text-sm text-gray-700 list-disc">
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {cv.education.length > 0 && (
        <section>
          <SectionTitle>Educación</SectionTitle>
          <div className="space-y-2">
            {cv.education.map((edu, i) => (
              <div key={i} className="flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">{edu.degree}</span>
                  <span className="text-sm text-gray-500"> · {edu.institution}, {edu.location}</span>
                  {edu.honors && <span className="text-xs text-gray-400"> · {edu.honors}</span>}
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-2">{edu.year}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {(cv.skills.technical.length > 0 || cv.skills.soft.length > 0) && (
        <section>
          <SectionTitle>Habilidades</SectionTitle>
          <div className="space-y-1.5">
            {cv.skills.technical.length > 0 && (
              <div className="text-sm">
                <span className="font-medium text-gray-700">Técnicas: </span>
                <span className="text-gray-600">{cv.skills.technical.join(', ')}</span>
              </div>
            )}
            {cv.skills.soft.length > 0 && (
              <div className="text-sm">
                <span className="font-medium text-gray-700">Blandas: </span>
                <span className="text-gray-600">{cv.skills.soft.join(', ')}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Certifications */}
      {cv.certifications && cv.certifications.length > 0 && (
        <section>
          <SectionTitle>Certificaciones</SectionTitle>
          <ul className="space-y-1 pl-4">
            {cv.certifications.map((cert, i) => (
              <li key={i} className="text-sm text-gray-700 list-disc">
                {cert}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Languages */}
      {cv.languages.length > 0 && (
        <section>
          <SectionTitle>Idiomas</SectionTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {cv.languages.map((lang, i) => (
              <span key={i} className="text-sm text-gray-700">
                <span className="font-medium">{lang.language}</span> — {lang.level}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Meta */}
      {meta && (
        <footer className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400">
            {meta.chunksUsed} fragmentos del CV · similitud {(meta.topSimilarity * 100).toFixed(0)}%
            · ID {meta.generationId}
          </p>
        </footer>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </h4>
  )
}

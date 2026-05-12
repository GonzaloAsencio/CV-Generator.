import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import type { CvLanguage } from '@/lib/schemas/api-inputs.schema'

const LABELS = {
  es: {
    summary: 'Resumen',
    experience: 'Experiencia',
    education: 'Educación',
    skills: 'Habilidades',
    technical: 'Técnicas',
    soft: 'Blandas',
    certifications: 'Certificaciones',
    languages: 'Idiomas',
  },
  en: {
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    technical: 'Technical',
    soft: 'Soft skills',
    certifications: 'Certifications',
    languages: 'Languages',
  },
}

interface CvPreviewProps {
  cv: HarvardCv
  meta?: { chunksUsed: number; topSimilarity: number; generationId: string }
  language?: CvLanguage
}

export function CvPreview({ cv, meta, language = 'es' }: CvPreviewProps) {
  const t = LABELS[language]
  return (
    <div className="bg-white border border-rule px-12 py-16 space-y-8">
      {/* Personal */}
      <header className="border-b border-rule pb-6">
        <h3 className="font-display text-4xl font-medium tracking-tight text-ink">{cv.personal.name}</h3>
        <p className="mt-2 text-base text-ink-3">{cv.title}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-ink-4">
          <span>{cv.personal.email}</span>
          {cv.personal.phone && <span>{cv.personal.phone}</span>}
          {cv.personal.location && <span>{cv.personal.location}</span>}
          {cv.personal.linkedin && <span>{cv.personal.linkedin}</span>}
          {cv.personal.github && <span>{cv.personal.github}</span>}
        </div>
      </header>

      {/* Summary */}
      <section>
        <SectionTitle>{t.summary}</SectionTitle>
        <p className="text-sm text-ink-2 leading-relaxed">{cv.summary}</p>
      </section>

      {/* Experience */}
      {cv.experience.length > 0 && (
        <section>
          <SectionTitle>{t.experience}</SectionTitle>
          <div className="space-y-6">
            {cv.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-sm text-ink">{exp.title}</span>
                  <span className="font-mono text-[12px] text-ink-4 shrink-0 ml-2">{exp.period}</span>
                </div>
                <p className="font-mono text-[12px] text-ink-4">
                  {exp.company} · {exp.location}
                </p>
                <ul className="mt-2 space-y-1.5 pl-4">
                  {exp.highlights.map((h, j) => (
                    <li key={j} className="text-sm text-ink-2 leading-relaxed list-disc">
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
          <SectionTitle>{t.education}</SectionTitle>
          <div className="space-y-3">
            {cv.education.map((edu, i) => (
              <div key={i} className="flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-semibold text-ink">{edu.degree}</span>
                  <span className="text-sm text-ink-4"> · {edu.institution}, {edu.location}</span>
                  {edu.honors && <span className="font-mono text-[12px] text-ink-4"> · {edu.honors}</span>}
                </div>
                <span className="font-mono text-[12px] text-ink-4 shrink-0 ml-2">{edu.year}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {(cv.skills.technical.length > 0 || cv.skills.soft.length > 0) && (
        <section>
          <SectionTitle>{t.skills}</SectionTitle>
          <div className="space-y-1.5">
            {cv.skills.technical.length > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-ink">{t.technical}: </span>
                <span className="text-ink-2">{cv.skills.technical.join(', ')}</span>
              </div>
            )}
            {cv.skills.soft.length > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-ink">{t.soft}: </span>
                <span className="text-ink-2">{cv.skills.soft.join(', ')}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Certifications */}
      {cv.certifications && cv.certifications.length > 0 && (
        <section>
          <SectionTitle>{t.certifications}</SectionTitle>
          <ul className="space-y-1 pl-4">
            {cv.certifications.map((cert, i) => (
              <li key={i} className="text-sm text-ink-2 leading-relaxed list-disc">
                {cert}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Languages */}
      {cv.languages.length > 0 && (
        <section>
          <SectionTitle>{t.languages}</SectionTitle>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {cv.languages.map((lang, i) => (
              <span key={i} className="text-sm text-ink-2">
                <span className="font-semibold text-ink">{lang.language}</span> — {lang.level}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Meta */}
      {meta && (
        <footer className="border-t border-rule-soft pt-4">
          <p className="font-mono text-[11px] text-ink-5">
            {meta.chunksUsed} fragmentos · similitud {(meta.topSimilarity * 100).toFixed(0)}%
            · ID {meta.generationId}
          </p>
        </footer>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink border-b border-ink pb-1 mb-4">
      {children}
    </h4>
  )
}

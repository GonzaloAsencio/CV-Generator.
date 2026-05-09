import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { HarvardCvPdf } from './harvard-cv-pdf'
import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'

const MOCK_CV: HarvardCv = {
  personal: {
    name: 'Ana García',
    email: 'ana@example.com',
    phone: '+54 11 1234-5678',
    location: 'Buenos Aires, AR',
    linkedin: 'linkedin.com/in/anagarcia',
    github: 'github.com/anagarcia',
  },
  title: 'Senior Full Stack Developer',
  summary:
    'Desarrolladora con 5 años de experiencia en React y Node.js, especializada en sistemas de alta disponibilidad.',
  experience: [
    {
      title: 'Senior Developer',
      company: 'Acme Corp',
      location: 'Buenos Aires',
      period: '2021 – presente',
      highlights: [
        'Lideré migración a microservicios reduciendo latencia en 40%.',
        'Implementé sistema de CI/CD con GitHub Actions.',
      ],
    },
    {
      title: 'Frontend Developer',
      company: 'Startup XYZ',
      location: 'Remoto',
      period: '2019 – 2021',
      highlights: ['Desarrollé dashboard en React con 50k usuarios activos.'],
    },
  ],
  education: [
    {
      degree: 'Lic. en Sistemas',
      institution: 'UBA',
      location: 'Buenos Aires',
      year: '2018',
      honors: 'Promedio 9.1',
    },
  ],
  skills: {
    technical: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    soft: ['Liderazgo', 'Comunicación', 'Trabajo en equipo'],
  },
  certifications: ['AWS Solutions Architect Associate'],
  languages: [
    { language: 'Español', level: 'Nativo' },
    { language: 'Inglés', level: 'C1' },
  ],
}

describe('HarvardCvPdf', () => {
  it('should render a valid PDF buffer with the %PDF header', async () => {
    const buffer = await renderToBuffer(<HarvardCvPdf cv={MOCK_CV} />)
    expect(buffer.byteLength).toBeGreaterThan(0)
    expect(Buffer.from(buffer).subarray(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('should render without optional certifications field', async () => {
    const cv: HarvardCv = { ...MOCK_CV, certifications: undefined }
    const buffer = await renderToBuffer(<HarvardCvPdf cv={cv} />)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('should render with empty experience and education arrays', async () => {
    const cv: HarvardCv = { ...MOCK_CV, experience: [], education: [] }
    const buffer = await renderToBuffer(<HarvardCvPdf cv={cv} />)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('should render without optional linkedin and github fields', async () => {
    const cv: HarvardCv = {
      ...MOCK_CV,
      personal: { ...MOCK_CV.personal, linkedin: undefined, github: undefined },
    }
    const buffer = await renderToBuffer(<HarvardCvPdf cv={cv} />)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })
})

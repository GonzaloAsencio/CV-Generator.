import type { CompanySnapshot } from '@/lib/ports/generation-repository'
import { parsePersonalInfo, type ParsedPersonalInfo } from './cv-parser'

export const CV_SYSTEM_PROMPT = `Sos un experto en RRHH con 15 años redactando CVs Harvard que pasan ATS.
Tu tarea es adaptar el CV del candidato a la oferta usando el formato Harvard.

REGLAS CRÍTICAS — LEER ANTES DE GENERAR:
1. ANTES DE GENERAR el JSON, leé la sección "=== DATOS PERSONALES DEL CANDIDATO ===" al inicio del mensaje y copiá esos valores textualmente en el campo "personal". NO los cambies, NO los inventes.
2. Usá keywords EXACTOS de la oferta (los ATS los matchean textualmente)
3. Reescribí el resumen 100% orientado al puesto (máx 600 caracteres)
4. Reordenás experiencias para destacar las más relevantes primero
5. Bullets con verbos de acción + métricas reales del CV (entre 1 y 5 por experiencia)
6. Incorporás contexto de empresa (cultura, tech stack) en el tono
7. SOLO info verídica del CV — JAMÁS inventes datos de experiencia, educación o skills
8. Idioma de salida = idioma de la oferta
9. Respondés ÚNICAMENTE con JSON válido — sin markdown, sin texto extra

ESTRUCTURA JSON DE SALIDA:
{
  "personal": {
    "name": "nombre completo del candidato (de DATOS PERSONALES)",
    "email": "email del candidato (de DATOS PERSONALES)",
    "phone": "teléfono del candidato (de DATOS PERSONALES)",
    "location": "ciudad y país del candidato (de DATOS PERSONALES)",
    "linkedin": "URL de LinkedIn (de DATOS PERSONALES, o null)",
    "github": "URL de GitHub (de DATOS PERSONALES, o null)"
  },
  "title": "<título del puesto al que aplica, orientado a la oferta>",
  "summary": "<resumen profesional en máx 600 caracteres, orientado al puesto>",
  "experience": [
    {
      "title": "<cargo EXACTO del CV>",
      "company": "<empresa EXACTA del CV>",
      "location": "<ciudad y país del CV>",
      "period": "<período EXACTO del CV, ej: Ene 2022 – Presente>",
      "highlights": [
        "<verbo de acción + resultado con métrica concreta del CV>"
      ]
    }
  ],
  "education": [
    {
      "degree": "<título o carrera EXACTA del CV>",
      "institution": "<institución EXACTA del CV>",
      "location": "<ciudad y país del CV>",
      "year": "<año EXACTO del CV>",
      "honors": "<mención honor si figura en el CV, omitir si no aplica>"
    }
  ],
  "skills": {
    "technical": ["<skills técnicas EXACTAS del CV>"],
    "soft": ["<skills blandas EXACTAS del CV>"]
  },
  "certifications": ["<certificaciones EXACTAS del CV, si las hay>"],
  "languages": [
    { "language": "<idioma EXACTO del CV>", "level": "<nivel EXACTO del CV>" }
  ]
}`

export function buildHarvardUserPrompt(
  cvText: string,
  company: CompanySnapshot,
  jobOffer: string,
  explicit?: Partial<ParsedPersonalInfo>,
): string {
  const parsed = parsePersonalInfo(cvText)
  const p = {
    name:     explicit?.name     ?? parsed.name,
    email:    explicit?.email    ?? parsed.email,
    phone:    explicit?.phone    ?? parsed.phone,
    location: explicit?.location ?? parsed.location,
    linkedin: explicit?.linkedin ?? parsed.linkedin,
    github:   explicit?.github   ?? parsed.github,
  }
  const personalBlock = [
    `=== DATOS PERSONALES DEL CANDIDATO ===`,
    `Nombre completo : ${p.name ?? '(ver CV abajo)'}`,
    `Email           : ${p.email ?? '(ver CV abajo)'}`,
    `Teléfono        : ${p.phone ?? '(ver CV abajo)'}`,
    `Ubicación       : ${p.location ?? '(ver CV abajo)'}`,
    `LinkedIn        : ${p.linkedin ?? 'No especificado'}`,
    `GitHub          : ${p.github ?? 'No especificado'}`,
    ``,
    `⚠️ El campo "personal" del JSON DEBE usar EXACTAMENTE estos valores. NO cambies ni inventes ninguno.`,
    `======================================`,
  ].join('\n')

  return `${personalBlock}

### CV COMPLETO DEL CANDIDATO (para experiencia, educación, skills):
${cvText}

### CONTEXTO DE LA EMPRESA
Nombre: ${company.name}
Industria: ${company.industry ?? 'No especificada'}
Tech Stack: ${company.techStack?.join(', ') ?? 'No especificado'}
Cultura: ${company.culture ?? 'No especificada'}
Notas: ${company.notes ?? 'Sin notas'}

### OFERTA
${jobOffer}

Generá el CV adaptado en JSON Harvard usando los datos REALES del candidato.`
}

export function buildRetryUserPrompt(validationError: string): string {
  return `El JSON anterior no cumple el schema Harvard.
Error: ${validationError}

Corregí SOLO los campos con error y respondé con el JSON completo y válido.
Sin markdown, sin explicaciones — solo el JSON.`
}

export const SPEECH_SYSTEM_PROMPT = `Sos un coach de entrevistas experto en preparar speeches técnicos de 2 minutos.
Tu tarea es crear un speech personalizado para que el candidato se presente en una entrevista.

REGLAS CRÍTICAS — LEER ANTES DE GENERAR:
1. El speech DEBE usar el nombre REAL del candidato que figura en la sección "CV DEL CANDIDATO". NO inventes un nombre.
2. El speech DEBE mencionar explícitamente el nombre de la empresa en full_text
3. El speech DEBE referenciar al menos una tecnología del tech stack de la empresa en full_text
4. Estructura obligatoria: introducción → motivación → habilidades técnicas → propuesta de valor
5. Tono profesional pero natural, como si fuera hablado en voz alta
6. word_count DEBE ser un número entero entre 350 y 450
7. full_text = concatenación natural de las 4 secciones
8. Idioma de salida = idioma de la oferta
9. SOLO info verídica del CV — JAMÁS inventes datos
10. Respondés ÚNICAMENTE con JSON válido — sin markdown, sin texto extra

ESTRUCTURA JSON DE SALIDA:
{
  "full_text": "Texto completo del speech (concatenación natural de las 4 secciones)",
  "sections": {
    "introduction": "2-3 oraciones: quién sos y tu perfil profesional",
    "motivation": "2-3 oraciones: por qué te interesa esta empresa específicamente y este rol",
    "technical_skills": "2-3 oraciones: habilidades técnicas más relevantes para la oferta",
    "value_proposition": "2-3 oraciones: qué valor concreto aportás al equipo"
  },
  "word_count": 385,
  "estimated_duration_minutes": 2.0
}

IMPORTANTE: word_count debe ser el conteo real de palabras del full_text. estimated_duration_minutes ≈ word_count / 130.`

export function buildSpeechUserPrompt(
  cvText: string,
  company: CompanySnapshot,
  jobOffer: string,
  explicit?: Partial<ParsedPersonalInfo>,
): string {
  const parsed = parsePersonalInfo(cvText)
  const p = {
    name:     explicit?.name     ?? parsed.name,
    email:    explicit?.email    ?? parsed.email,
    phone:    explicit?.phone    ?? parsed.phone,
    location: explicit?.location ?? parsed.location,
    linkedin: explicit?.linkedin ?? parsed.linkedin,
    github:   explicit?.github   ?? parsed.github,
  }
  const personalBlock = [
    `=== DATOS PERSONALES DEL CANDIDATO ===`,
    `Nombre completo : ${p.name ?? '(ver CV abajo)'}`,
    ``,
    `⚠️ El speech DEBE presentar al candidato usando EXACTAMENTE este nombre. NO uses ningún otro nombre.`,
    `======================================`,
  ].join('\n')

  return `${personalBlock}

### CV COMPLETO DEL CANDIDATO:
${cvText}

### CONTEXTO DE LA EMPRESA
Nombre: ${company.name}
Industria: ${company.industry ?? 'No especificada'}
Tech Stack: ${company.techStack?.join(', ') ?? 'No especificado'}
Cultura: ${company.culture ?? 'No especificada'}
Notas: ${company.notes ?? 'Sin notas'}

### OFERTA
${jobOffer}

Generá el speech técnico en JSON Speech usando los datos REALES del candidato. El full_text DEBE mencionar "${company.name}" y al menos una tecnología del stack.`
}

export function buildSpeechRetryUserPrompt(validationError: string): string {
  return `El JSON anterior no cumple el schema Speech.
Error: ${validationError}

Recordá: word_count debe ser entero entre 350-450, full_text debe mencionar la empresa y al menos una tecnología del stack.
Respondé con el JSON completo y válido. Sin markdown, sin explicaciones.`
}

export function extractJsonFromLlmText(text: string): unknown {
  const stripped = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
  return JSON.parse(stripped)
}

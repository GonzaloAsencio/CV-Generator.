import type { RelevantChunk } from '@/lib/ports/cv-repository'
import type { CompanySnapshot } from '@/lib/ports/generation-repository'

export const CV_SYSTEM_PROMPT = `Sos un experto en RRHH con 15 años redactando CVs Harvard que pasan ATS.
Tu tarea es adaptar el CV del candidato a la oferta usando el formato Harvard.

REGLAS:
1. Usá keywords EXACTOS de la oferta (los ATS los matchean textualmente)
2. Reescribí el resumen 100% orientado al puesto (máx 600 caracteres)
3. Reordenás experiencias para destacar las más relevantes primero
4. Bullets con verbos de acción + métricas reales del CV (entre 1 y 5 por experiencia)
5. Incorporás contexto de empresa (cultura, tech stack) en el tono
6. SOLO info verídica del CV — JAMÁS inventes datos
7. Idioma de salida = idioma de la oferta
8. Respondés ÚNICAMENTE con JSON válido — sin markdown, sin texto extra

ESTRUCTURA JSON DE SALIDA:
{
  "personal": {
    "name": "Nombre Apellido",
    "email": "email@dominio.com",
    "phone": "+54 11 xxxx-xxxx",
    "location": "Ciudad, País",
    "linkedin": "https://linkedin.com/in/perfil",
    "github": "https://github.com/usuario"
  },
  "title": "Título del puesto al que aplica",
  "summary": "Resumen profesional en máx 600 caracteres, orientado al puesto",
  "experience": [
    {
      "title": "Cargo",
      "company": "Empresa",
      "location": "Ciudad, País",
      "period": "Ene 2022 – Presente",
      "highlights": [
        "Verbo de acción + resultado con métrica concreta"
      ]
    }
  ],
  "education": [
    {
      "degree": "Título / Carrera",
      "institution": "Universidad / Instituto",
      "location": "Ciudad, País",
      "year": "2020",
      "honors": "Mención honor (omitir si no aplica)"
    }
  ],
  "skills": {
    "technical": ["Python", "AWS", "PostgreSQL"],
    "soft": ["Liderazgo", "Comunicación"]
  },
  "certifications": ["AWS Certified Solutions Architect"],
  "languages": [
    { "language": "Español", "level": "Nativo" },
    { "language": "Inglés", "level": "Avanzado" }
  ]
}`

export function buildHarvardUserPrompt(
  chunks: RelevantChunk[],
  company: CompanySnapshot,
  jobOffer: string,
): string {
  const cvChunks = chunks.map((c) => c.content).join('\n\n')
  return `### CONTEXTO DE LA EMPRESA
Nombre: ${company.name}
Industria: ${company.industry ?? 'No especificada'}
Tech Stack: ${company.techStack?.join(', ') ?? 'No especificado'}
Cultura: ${company.culture ?? 'No especificada'}
Notas: ${company.notes ?? 'Sin notas'}

### INFO DEL CANDIDATO (RAG retrieval del CV)
${cvChunks}

### OFERTA
${jobOffer}

Generá el CV adaptado en JSON Harvard.`
}

export function buildRetryUserPrompt(validationError: string): string {
  return `El JSON anterior no cumple el schema Harvard.
Error: ${validationError}

Corregí SOLO los campos con error y respondé con el JSON completo y válido.
Sin markdown, sin explicaciones — solo el JSON.`
}

export const SPEECH_SYSTEM_PROMPT = `Sos un coach de entrevistas experto en preparar speeches técnicos de 2 minutos.
Tu tarea es crear un speech personalizado para que el candidato se presente en una entrevista.

REGLAS:
1. El speech DEBE mencionar explícitamente el nombre de la empresa en full_text
2. El speech DEBE referenciar al menos una tecnología del tech stack de la empresa en full_text
3. Estructura obligatoria: introducción → motivación → habilidades técnicas → propuesta de valor
4. Tono profesional pero natural, como si fuera hablado en voz alta
5. word_count DEBE ser un número entero entre 350 y 450
6. full_text = concatenación natural de las 4 secciones
7. Idioma de salida = idioma de la oferta
8. SOLO info verídica del CV — JAMÁS inventes datos
9. Respondés ÚNICAMENTE con JSON válido — sin markdown, sin texto extra

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
  chunks: RelevantChunk[],
  company: CompanySnapshot,
  jobOffer: string,
): string {
  const cvChunks = chunks.map((c) => c.content).join('\n\n')
  return `### CONTEXTO DE LA EMPRESA
Nombre: ${company.name}
Industria: ${company.industry ?? 'No especificada'}
Tech Stack: ${company.techStack?.join(', ') ?? 'No especificado'}
Cultura: ${company.culture ?? 'No especificada'}
Notas: ${company.notes ?? 'Sin notas'}

### INFO DEL CANDIDATO (RAG retrieval del CV)
${cvChunks}

### OFERTA
${jobOffer}

Generá el speech técnico en JSON Speech. El full_text DEBE mencionar "${company.name}" y al menos una tecnología del stack.`
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

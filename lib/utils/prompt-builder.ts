import type { RelevantChunk } from '@/lib/ports/cv-repository'
import type { CompanySnapshot } from '@/lib/ports/generation-repository'

export const CV_SYSTEM_PROMPT = `Sos un experto en RRHH con 15 años redactando CVs Harvard que pasan ATS.
Tu tarea es adaptar el CV del candidato a la oferta usando el formato Harvard.

REGLAS:
1. Usá keywords EXACTOS de la oferta (los ATS los matchean textualmente)
2. Reescribí el resumen 100% orientado al puesto
3. Reordenás experiencias para destacar las más relevantes primero
4. Bullets con verbos de acción + métricas reales del CV
5. Incorporás contexto de empresa (cultura, tech stack) en el tono
6. SOLO info verídica del CV — JAMÁS inventes
7. Idioma de salida = idioma de la oferta
8. Respondés ÚNICAMENTE con JSON válido del schema Harvard — sin markdown, sin texto extra`

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
  return `Tu respuesta anterior no fue JSON válido del schema Harvard.
Error de validación: ${validationError}

Respondé de nuevo SOLO con el JSON correcto. Sin markdown, sin explicación.`
}

export function extractJsonFromLlmText(text: string): unknown {
  const stripped = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
  return JSON.parse(stripped)
}

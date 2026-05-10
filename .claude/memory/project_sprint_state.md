---
name: Sprint progress and next steps
description: Estado actual del sprint, HUs completadas y próximas a implementar
type: project
---

Sprint 1 completo (HU-01 a HU-05 mergeados).
Sprint 2 completo (HU-06, HU-07, HU-08 mergeados).
Sprint 3 en curso: HU-09 mergeado, pendiente HU-10 a HU-12.

**Why:** Proyecto CV Tailor AI — web app que genera CV Harvard + speech técnico via RAG + Gemini.

**How to apply:** Al retomar, arrancar directamente con HU-10.

## HUs completadas

- HU-01: Setup Next.js + Vitest + estructura SOLID
- HU-02: Supabase + migraciones + RLS
- HU-03: Auth Google OAuth + middleware
- HU-04: CI/CD GitHub Actions + Vercel
- HU-05: Ports, Zod schemas, composition container
- HU-06: UploadCvUseCase (unpdf + chunker + GeminiEmbeddingProvider)
- HU-07: POST /api/upload route + CvUploadForm (drag & drop)
- HU-08: Rate limiter — UpstashRateLimiter + MemoryRateLimiter fallback
- HU-09: GenerateTailoredCvUseCase (7 ciclos TDD — RAG + LLM + retry + persist)

## HU-10 (próxima)

**Título:** API Route /api/generate
**Tareas:**
- SupabaseGenerationRepository (implements GenerationRepository) → lib/adapters/supabase-generation-repository.ts
- Idempotency cache in-memory con TTL 5min → lib/utils/idempotency.ts
- Route delgada: auth → Zod → idempotency check → rate limit → use-case → respond
- maxDuration = 60s
- Responde { cv: HarvardCv, meta: { chunksUsed, topSimilarity, generationId } }
- Errores: 401, 400, 429, 404 (NoCvUploadedError), 422 (LlmInvalidOutputError), 500

## HU-11 (después de HU-10)

UI generate-form + preview:
- GenerateForm (empresa inline + oferta + Idempotency-Key en cliente)
- CvPreview mostrando los datos del JSON Harvard
- Loading state largo (~30s) con feedback visual

## HU-12 (después de HU-11)

Template Harvard PDF (@react-pdf/renderer):
- Tipografía serif, márgenes 1 pulgada, B&N
- Botón descarga con naming CV_Harvard_{Nombre}_{Empresa}.pdf

## Arquitectura clave (no derivable del código fácilmente)

- `lib/ports/` — interfaces puras, el use-case solo depende de esto
- `lib/adapters/` — implementaciones concretas (SDKs acá, nunca en use-cases)
- `lib/use-cases/` — lógica de negocio, deps inyectadas
- `lib/composition/container.ts` — único lugar que sabe qué adapter va con qué port
- `lib/composition/test-container.ts` — mocks vi.fn() para tests unitarios
- Error format API: `{ error: { code: string, message: string } }` con códigos VALIDATION_ERROR/UNAUTHORIZED/RATE_LIMIT/etc.
- Zod v4 instalado (usar `.issues` no `.errors` en ZodError)
- `tests/e2e/` excluido del tsconfig principal (Playwright tiene su propio config)
- GenerationRepository en container.ts tiene un stub hasta que HU-10 lo complete

## Stack

Next.js 15 (App Router), TypeScript, Supabase (pgvector), Gemini (text-embedding-004 + gemini-2.0-flash), Upstash Redis, unpdf, Zod v4, Vitest, shadcn/ui

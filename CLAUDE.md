# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start dev server on :3000
npm run build        # production build (tsc errors suppressed — run typecheck separately)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest run (unit + integration)
npm run test:watch   # vitest interactive
npm run test:coverage # vitest with v8 coverage
npm run test:e2e     # playwright (requires running dev server or sets one up)
npm run test:e2e:auth # playwright auth flow only
```

Run a single test file: `npx vitest run lib/use-cases/generate-tailored-cv.test.ts`

E2E auth setup (first time): `npx playwright test tests/e2e/global.setup.ts`

## Architecture

The codebase follows a **hexagonal / ports-and-adapters** pattern:

- `lib/ports/` — interfaces only (CvRepository, LlmProvider, EmbeddingProvider, GenerationRepository, PdfExtractor, RateLimiter, LlmCallLogger)
- `lib/adapters/` — concrete implementations wiring Supabase, Gemini, Upstash, unpdf
- `lib/use-cases/` — pure business logic; depend only on ports
- `lib/composition/container.ts` — production DI wiring; `lib/composition/test-container.ts` — vitest mocks for all ports
- `lib/schemas/` — Zod schemas that are the source of truth for data shapes (`HarvardCvSchema`, `ProfileDataSchema`, `SpeechSchema`)
- `lib/utils/prompt-builder.ts` — all LLM prompts live here (system prompts + user prompt builders)

## CV Generation: two modes

The generate endpoint (`app/api/generate/route.ts`) switches between two paths:

1. **Structured profile** (preferred, no hallucination risk): user has filled `profile_data` in `user_profiles` table. The use case overlays experience/education/skills/languages directly from `ProfileData` after LLM runs — LLM only writes `title`, `summary`, and `highlights`.
2. **CV text fallback**: user has only uploaded a PDF. The full CV text is sent to the LLM which must extract everything.

`useStructured` flag is `true` when `profileData.experience.length > 0`.

## Key data flows

**Upload**: PDF → `UnpdfExtractor` → text → `chunker` → `GeminiEmbeddingProvider` (gemini-embedding-2 / text-embedding-004) → `SupabaseCvRepository.saveChunks` (pgvector)

**Generate CV**: auth → validate input → fetch profile → idempotency cache check → rate limit → `GenerateTailoredCvUseCase.execute` → Gemini LLM with retry → `HarvardCvSchema` validation → overlay personal info + structured data → save to `generations` table → return JSON

**Rate limiting**: `UpstashRateLimiter` (Redis) in production; `MemoryRateLimiter` automatically used as fallback when `UPSTASH_REDIS_REST_URL` is absent.

## Environment variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
GOOGLE_API_KEY
```
Optional (rate limiting falls back to in-memory without these):
```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

## Testing conventions

- Tests live alongside source files (`*.test.ts` / `*.test.tsx`) or in `tests/unit/` and `tests/integration/`
- Always use `createTest*` factories from `lib/composition/test-container.ts` — never mock ports inline
- Coverage thresholds enforced: 80% lines/functions/statements, 75% branches (scoped to `lib/use-cases`, `lib/schemas`, `lib/utils`)
- E2E tests in `tests/e2e/`; authenticated tests need `playwright/.auth/user.json`

## Next.js version note

This project runs Next.js **16.2.5** with React 19. APIs and conventions differ significantly from what training data contains. Read `node_modules/next/dist/docs/` before writing any Next.js-specific code.

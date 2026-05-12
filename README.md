# CV Generator

**Generá CVs estilo Harvard adaptados a cada oferta laboral con IA.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)]()

---

## Qué hace

Subís tu CV en PDF, pegás la descripción del puesto y la app genera un CV tailored en formato Harvard listo para descargar. La IA reescribe el título, resumen y highlights para que se alineen con la oferta, manteniendo tus datos reales intactos.

---

## Características

- **Generación inteligente** — Gemini AI adapta tu CV al puesto sin inventar datos
- **Formato Harvard** — output validado por schema Zod, estructura profesional garantizada
- **Dos modos de generación** — perfil estructurado (sin alucinaciones) o fallback desde texto del PDF
- **PDF upload con embeddings** — tus chunks de CV se indexan con pgvector para búsqueda semántica
- **Rate limiting** — Upstash Redis en producción, in-memory automático como fallback
- **LM Studio** — soporte para modelos locales gratuitos (sin costo de API)
- **Autenticación completa** — login, sesión y perfil de usuario vía Supabase Auth
- **Idempotencia** — misma entrada = misma respuesta cacheada, sin re-generar innecesariamente

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.5 + React 19 |
| Lenguaje | TypeScript 5 |
| Base de datos | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth (SSR) |
| LLM | Google Gemini (`gemini-2.0-flash`) / LM Studio |
| Embeddings | Gemini Embedding (`text-embedding-004`) |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` |
| PDF parse | `unpdf` |
| PDF render | `@react-pdf/renderer` |
| Validación | Zod 4 |
| Estilos | Tailwind CSS 4 |
| Tests unitarios | Vitest + Testing Library |
| Tests E2E | Playwright |

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/GonzaloAsencio/Cv-Generator.git
cd Cv-Generator

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorn
cp .env.local.example .env.local

# 4. Levantar el servidor de desarrollo
npm run dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

---

## Variables de entorno

Creá un archivo `.env.local` en la raíz con las siguientes claves.  
**No subas este archivo al repo.** Para obtener los valores contactá al autor en [gestorgonzalo@gmail.com](mailto:gestorgonzalo@gmail.com).

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Google Gemini
GOOGLE_API_KEY=

# Upstash Redis (opcional — fallback in-memory si no se configura)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Comandos

```bash
npm run dev           # servidor de desarrollo en :3000
npm run build         # build de producción
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run test          # vitest (unit + integration)
npm run test:watch    # vitest en modo interactivo
npm run test:coverage # cobertura con v8
npm run test:e2e      # playwright (requiere servidor corriendo)
```

---

## Arquitectura

El proyecto sigue el patrón **hexagonal / ports-and-adapters**:

```
lib/
├── ports/        # interfaces (contratos): CvRepository, LlmProvider, RateLimiter…
├── adapters/     # implementaciones concretas: Supabase, Gemini, Upstash, unpdf
├── use-cases/    # lógica de negocio pura; solo depende de ports
├── schemas/      # Zod schemas (fuente de verdad): HarvardCvSchema, ProfileDataSchema
├── utils/        # prompt-builder.ts (todos los prompts del LLM viven acá)
└── composition/
    ├── container.ts       # DI wiring producción
    └── test-container.ts  # mocks para vitest
```

---

## Contribuir

Este es un proyecto privado. Si encontrás un bug o querés proponer algo, abrí un issue o contactá directamente al autor.

---

## Autor

**Gonzalo Asencio** — [gestorgonzalo@gmail.com](mailto:gestorgonzalo@gmail.com)

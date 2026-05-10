/**
 * Script de prueba de generación de CVs y speeches.
 * Genera 10 CVs y 8 speeches con ofertas diversas y reporta resultados.
 *
 * Prerequisitos:
 *   - CV del usuario ya subido a Supabase
 *   - Variables de entorno en .env.local
 *
 * Uso:
 *   npx tsx scripts/test-generations.ts <userId>
 */

try {
  // Node 20.12+: carga .env.local sin dependencias extra
  ;(process as NodeJS.Process & { loadEnvFile?: (path: string) => void }).loadEnvFile?.('.env.local')
} catch {
  // env vars deben estar seteadas externamente
}

import { createGenerateTailoredCvUseCase, createGenerateSpeechUseCase } from '@/lib/composition/container'
import type { CompanySnapshot } from '@/lib/ports/generation-repository'

interface TestCase {
  company: CompanySnapshot
  jobOffer: string
}

const TEST_CASES: TestCase[] = [
  {
    company: {
      name: 'Mercado Libre',
      industry: 'E-commerce',
      techStack: ['Node.js', 'TypeScript', 'AWS', 'React', 'Kafka'],
      culture: 'Scale tech para millones de usuarios en LATAM.',
    },
    jobOffer: `Backend Engineer - Pagos
Construís APIs de alto rendimiento para nuestra plataforma de pagos con millones de transacciones diarias.
Requisitos: Node.js, TypeScript, AWS, PostgreSQL, sistemas distribuidos.
Nice to have: Kafka, Redis, Kubernetes.`,
  },
  {
    company: {
      name: 'Ualá',
      industry: 'Fintech',
      techStack: ['Go', 'Python', 'PostgreSQL', 'Kubernetes', 'AWS'],
      culture: 'Inclusión financiera para toda América Latina.',
    },
    jobOffer: `Senior Backend Developer - Core Banking
Desarrollás microservicios financieros críticos para nuestra billetera digital.
Req: Go o Python avanzado, PostgreSQL, arquitectura de microservicios, AWS/GCP.`,
  },
  {
    company: {
      name: 'Despegar',
      industry: 'Travel Tech',
      techStack: ['Java', 'Spring Boot', 'React', 'AWS', 'MongoDB'],
      culture: 'Simplificamos viajes para millones de latinoamericanos.',
    },
    jobOffer: `Full Stack Developer
Desarrollarás features para nuestra plataforma de reservas de vuelos y hoteles.
Tecnologías: Java 17, Spring Boot, React 18, PostgreSQL, Docker.`,
  },
  {
    company: {
      name: 'Rappi',
      industry: 'Delivery Tech',
      techStack: ['Kotlin', 'React Native', 'Python', 'GCP', 'PostgreSQL'],
      culture: 'Delivery de todo en minutos para +30M de usuarios.',
    },
    jobOffer: `React Native Mobile Developer
Construís la experiencia mobile para nuestra app con millones de usuarios activos.
Req: React Native avanzado, TypeScript, Redux, REST APIs, experiencia con apps a escala.`,
  },
  {
    company: {
      name: 'Accenture',
      industry: 'Consulting',
      techStack: ['AWS', 'Terraform', 'Python', 'Azure', 'Kubernetes'],
      culture: 'Tecnología e innovación para empresas globales.',
    },
    jobOffer: `Cloud & DevOps Engineer
Implementarás infraestructura como código para clientes enterprise multinacionales.
Req: AWS/Azure, Terraform, CI/CD pipelines, Kubernetes, Python/Bash scripting.`,
  },
  {
    company: {
      name: 'Auth0 by Okta',
      industry: 'Identity & Security',
      techStack: ['Node.js', 'Go', 'PostgreSQL', 'AWS', 'Redis'],
      culture: 'Identity platform trusted by 18,000+ companies worldwide.',
    },
    jobOffer: `Staff Software Engineer - Identity Platform
Lead technical direction for our authentication and authorization services.
Requirements: 8+ years, distributed systems, Node.js or Go, OAuth2/OIDC/SAML protocols.`,
  },
  {
    company: {
      name: 'Vercel',
      industry: 'Developer Tools',
      techStack: ['Next.js', 'TypeScript', 'Rust', 'AWS', 'Edge Runtime'],
      culture: 'The frontend cloud — deploy the web.',
    },
    jobOffer: `Senior Frontend Engineer
Build the developer experience for millions of Next.js deployments worldwide.
Stack: Next.js, TypeScript, React, Rust, AWS edge infrastructure, CDN.`,
  },
  {
    company: {
      name: 'Datadog',
      industry: 'Observability',
      techStack: ['Python', 'Go', 'Kubernetes', 'AWS', 'Kafka', 'Spark'],
      culture: 'Monitoring and analytics for cloud-scale infrastructure.',
    },
    jobOffer: `Data Engineer - Metrics Pipeline
Design and build high-throughput pipelines processing billions of metrics daily.
Tech: Python, Go, Kafka, Spark, AWS, Kubernetes, TimescaleDB.`,
  },
  {
    company: {
      name: 'Hugging Face',
      industry: 'AI/ML',
      techStack: ['Python', 'PyTorch', 'Transformers', 'CUDA', 'FastAPI'],
      culture: 'Building the AI community. Open source ML for everyone.',
    },
    jobOffer: `ML Engineer - LLM Inference
Optimize and deploy large language models at scale for production workloads.
Requirements: Python, PyTorch, CUDA, quantization, MLOps, Transformer architectures.`,
  },
  {
    company: {
      name: 'Atlassian',
      industry: 'Enterprise SaaS',
      techStack: ['Java', 'React', 'AWS', 'PostgreSQL', 'Kubernetes'],
      culture: 'Collaboration software for teams that work differently.',
    },
    jobOffer: `Platform Engineer
Build the internal developer platform powering Jira, Confluence, and Bitbucket at global scale.
Requirements: Java, Kubernetes, Terraform, AWS, platform engineering experience.`,
  },
]

const SPEECH_CASES = TEST_CASES.slice(0, 8)

interface Result {
  company: string
  ok: boolean
  detail: string
}

async function main(): Promise<void> {
  const userId = process.argv[2]
  if (!userId) {
    console.error('Uso: npx tsx scripts/test-generations.ts <userId>')
    process.exit(1)
  }

  const required = ['GOOGLE_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error(`Faltan variables de entorno: ${missing.join(', ')}`)
    process.exit(1)
  }

  const cvText = process.argv[3] ?? 'CV de prueba — reemplazá con texto real del candidato.'
  const cvUseCase = createGenerateTailoredCvUseCase()
  const speechUseCase = createGenerateSpeechUseCase()

  // ── CVs ────────────────────────────────────────────────────────────────────
  console.log(`\n▶ Generando ${TEST_CASES.length} CVs...\n`)
  const cvResults: Result[] = []

  for (let i = 0; i < TEST_CASES.length; i++) {
    const { company, jobOffer } = TEST_CASES[i]
    process.stdout.write(`  [${i + 1}/${TEST_CASES.length}] ${company.name.padEnd(20)} `)
    try {
      const out = await cvUseCase.execute({
        userId,
        cvText,
        jobOffer,
        company,
        idempotencyKey: `test-cv-${i}-${Date.now()}`,
      })
      const detail = `chunks=${out.chunksUsed} sim=${out.topSimilarity.toFixed(3)}`
      console.log(`✓  ${detail}`)
      cvResults.push({ company: company.name, ok: true, detail })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.log(`✗  ${detail}`)
      cvResults.push({ company: company.name, ok: false, detail })
    }
  }

  // ── Speeches ───────────────────────────────────────────────────────────────
  console.log(`\n▶ Generando ${SPEECH_CASES.length} speeches...\n`)
  const speechResults: Result[] = []

  for (let i = 0; i < SPEECH_CASES.length; i++) {
    const { company, jobOffer } = SPEECH_CASES[i]
    process.stdout.write(`  [${i + 1}/${SPEECH_CASES.length}] ${company.name.padEnd(20)} `)
    try {
      const out = await speechUseCase.execute({
        userId,
        cvText,
        jobOffer,
        company,
        idempotencyKey: `test-speech-${i}-${Date.now()}`,
      })
      const detail = `words=${out.speech.word_count} chunks=${out.chunksUsed}`
      console.log(`✓  ${detail}`)
      speechResults.push({ company: company.name, ok: true, detail })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.log(`✗  ${detail}`)
      speechResults.push({ company: company.name, ok: false, detail })
    }
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  const cvOk = cvResults.filter((r) => r.ok).length
  const speechOk = speechResults.filter((r) => r.ok).length

  console.log('\n─────────────────────────────────────────')
  console.log('RESUMEN')
  console.log('─────────────────────────────────────────')
  console.log(`CVs:     ${cvOk}/${TEST_CASES.length} exitosos`)
  console.log(`Speeches: ${speechOk}/${SPEECH_CASES.length} exitosos`)

  console.log('\n─────────────────────────────────────────')
  console.log('QUERY RETRY RATE — pegar en Supabase SQL Editor')
  console.log('─────────────────────────────────────────')
  console.log(`
SELECT
  kind,
  COUNT(*)                                                                   AS total,
  SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END)                         AS retried,
  ROUND(100.0 * SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0), 1)                                           AS retry_pct,
  ROUND(AVG(latency_ms) / 1000.0, 1)                                       AS avg_latency_s
FROM llm_calls
WHERE user_id = '${userId}'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY kind;
`)
  console.log('Objetivo: retry_pct < 5 para ambos kinds.\n')
}

main().catch(console.error)

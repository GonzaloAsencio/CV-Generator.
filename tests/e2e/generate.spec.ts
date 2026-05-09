import { test, expect } from '@playwright/test'
import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'

// Requires: playwright/.auth/user.json (run global.setup.ts once to generate it)
// Run with: npx playwright test tests/e2e/generate.spec.ts

const MOCK_CV: HarvardCv = {
  personal: {
    name: 'Ana García',
    email: 'ana@test.com',
    phone: '+54 11 1234-5678',
    location: 'Buenos Aires, AR',
  },
  title: 'Senior Full Stack Developer',
  summary: 'Desarrolladora con 5 años de experiencia en React y Node.js.',
  experience: [
    {
      title: 'Senior Developer',
      company: 'Acme Corp',
      location: 'Buenos Aires',
      period: '2021 – presente',
      highlights: ['Lideré migración a microservicios reduciendo latencia en 40%.'],
    },
  ],
  education: [
    { degree: 'Lic. en Sistemas', institution: 'UBA', location: 'Buenos Aires', year: '2018' },
  ],
  skills: {
    technical: ['React', 'TypeScript', 'Node.js'],
    soft: ['Liderazgo', 'Comunicación'],
  },
  languages: [{ language: 'Español', level: 'Nativo' }],
}

const GENERATE_RESPONSE = {
  cv: MOCK_CV,
  meta: { chunksUsed: 4, topSimilarity: 0.91, generationId: 'test-gen-001' },
}

const LONG_JOB_OFFER =
  'Buscamos un Senior Developer con experiencia en React, TypeScript y Node.js. ' +
  'El candidato debe tener al menos 5 años de experiencia construyendo aplicaciones web escalables. ' +
  'Se valoran habilidades de liderazgo y trabajo en equipo.'

test.describe('Generate CV flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  // ── Client-side validation ─────────────────────────────────────────────────

  test('shows error when company name is empty', async ({ page }) => {
    await page.getByPlaceholder(/nombre de la empresa/i).clear()
    await page.getByRole('button', { name: /generar cv harvard/i }).click()

    await expect(page.getByText(/nombre de la empresa es obligatorio/i)).toBeVisible()
  })

  test('shows error when job offer is too short', async ({ page }) => {
    await page.getByPlaceholder(/nombre de la empresa/i).fill('Acme Corp')
    await page.getByPlaceholder(/pegá la oferta/i).fill('Muy corta')
    await page.getByRole('button', { name: /generar cv harvard/i }).click()

    await expect(page.getByText(/al menos 100 caracteres/i)).toBeVisible()
  })

  test('character counter updates as user types job offer', async ({ page }) => {
    const textarea = page.getByPlaceholder(/pegá la oferta/i)
    await textarea.fill('Hola')

    await expect(page.getByText(/4 \/ 100/i)).toBeVisible()
  })

  // ── Success flow (API mocked) ──────────────────────────────────────────────

  test('shows CV preview and download button after successful generation', async ({ page }) => {
    await page.route('/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(GENERATE_RESPONSE),
      })
    })

    await page.getByPlaceholder(/nombre de la empresa/i).fill('Acme Corp')
    await page.getByPlaceholder(/pegá la oferta/i).fill(LONG_JOB_OFFER)
    await page.getByRole('button', { name: /generar cv harvard/i }).click()

    await expect(page.getByText('CV generado')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Ana García')).toBeVisible()
    await expect(page.getByText('Senior Full Stack Developer')).toBeVisible()
    await expect(page.getByRole('button', { name: /descargar pdf/i })).toBeVisible()
  })

  test('speech button appears after CV is generated', async ({ page }) => {
    await page.route('/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(GENERATE_RESPONSE),
      })
    })

    await page.getByPlaceholder(/nombre de la empresa/i).fill('Acme Corp')
    await page.getByPlaceholder(/pegá la oferta/i).fill(LONG_JOB_OFFER)
    await page.getByRole('button', { name: /generar cv harvard/i }).click()

    await expect(page.getByRole('button', { name: /generar speech técnico/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('shows error message when API returns NOT_FOUND', async ({ page }) => {
    await page.route('/api/generate', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'No CV uploaded' } }),
      })
    })

    await page.getByPlaceholder(/nombre de la empresa/i).fill('Acme Corp')
    await page.getByPlaceholder(/pegá la oferta/i).fill(LONG_JOB_OFFER)
    await page.getByRole('button', { name: /generar cv harvard/i }).click()

    await expect(page.getByText(/primero subí tu cv/i)).toBeVisible({ timeout: 10_000 })
  })

  test('limpiar button resets the result', async ({ page }) => {
    await page.route('/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(GENERATE_RESPONSE),
      })
    })

    await page.getByPlaceholder(/nombre de la empresa/i).fill('Acme Corp')
    await page.getByPlaceholder(/pegá la oferta/i).fill(LONG_JOB_OFFER)
    await page.getByRole('button', { name: /generar cv harvard/i }).click()

    await expect(page.getByText('CV generado')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /limpiar/i }).first().click()

    await expect(page.getByText('CV generado')).not.toBeVisible()
  })
})

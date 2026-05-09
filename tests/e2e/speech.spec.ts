import { test, expect } from '@playwright/test'
import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import type { Speech } from '@/lib/schemas/speech.schema'

// Requires: playwright/.auth/user.json (run global.setup.ts once to generate it)
// Run with: npx playwright test tests/e2e/speech.spec.ts

const MOCK_CV: HarvardCv = {
  personal: { name: 'Ana García', email: 'ana@test.com', phone: '+54111', location: 'BA' },
  title: 'Senior Developer',
  summary: 'Desarrolladora con 5 años de experiencia.',
  experience: [
    {
      title: 'Dev',
      company: 'Acme Corp',
      location: 'BA',
      period: '2020-2025',
      highlights: ['Lideré migración a microservicios.'],
    },
  ],
  education: [{ degree: 'Lic. Sistemas', institution: 'UBA', location: 'BA', year: '2020' }],
  skills: { technical: ['React'], soft: ['Liderazgo'] },
  languages: [{ language: 'Español', level: 'Nativo' }],
}

const MOCK_SPEECH: Speech = {
  full_text:
    'Me llamo Ana García. Estoy muy interesada en unirme a Acme Corp como desarrolladora React. ' +
    'Tengo 5 años de experiencia construyendo aplicaciones web escalables. ' +
    'Lideré equipos de 4 personas y reduje la latencia en 30%. ' +
    'Creo que puedo aportar gran valor al equipo de Acme Corp.',
  sections: {
    introduction: 'Me llamo Ana García, desarrolladora Full Stack con 5 años de experiencia.',
    motivation: 'Quiero unirme a Acme Corp porque es referente en el sector tecnológico.',
    technical_skills: 'Domino React, TypeScript y Node.js, con experiencia en alta disponibilidad.',
    value_proposition: 'Aportaré mi experiencia liderando equipos y mi foco en métricas de performance.',
  },
  word_count: 400,
  estimated_duration_minutes: 2.5,
}

const GENERATE_RESPONSE = {
  cv: MOCK_CV,
  meta: { chunksUsed: 3, topSimilarity: 0.89, generationId: 'test-gen-002' },
}

const SPEECH_RESPONSE = {
  speech: MOCK_SPEECH,
  meta: { chunksUsed: 3, topSimilarity: 0.89, generationId: 'test-speech-001' },
}

const LONG_JOB_OFFER =
  'Buscamos un Senior Developer con experiencia en React, TypeScript y Node.js. ' +
  'El candidato debe tener al menos 5 años de experiencia construyendo aplicaciones web escalables. ' +
  'Se valoran habilidades de liderazgo y trabajo en equipo.'

async function generateCvAndWait(page: import('@playwright/test').Page) {
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
}

test.describe('Speech generation flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await generateCvAndWait(page)
  })

  test('clicking speech button shows speech display with sections', async ({ page }) => {
    await page.route('/api/speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SPEECH_RESPONSE),
      })
    })

    await page.getByRole('button', { name: /generar speech técnico/i }).click()

    await expect(page.getByText('Speech técnico')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/introducción/i)).toBeVisible()
    await expect(page.getByText(/motivación/i)).toBeVisible()
    await expect(page.getByText(/habilidades técnicas/i)).toBeVisible()
    await expect(page.getByText(/propuesta de valor/i)).toBeVisible()
  })

  test('copy button shows Copiado! feedback', async ({ page }) => {
    await page.route('/api/speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SPEECH_RESPONSE),
      })
    })

    await page.getByRole('button', { name: /generar speech técnico/i }).click()
    await expect(page.getByText('Speech técnico')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: /copiar texto/i }).click()
    await expect(page.getByRole('button', { name: /copiado!/i })).toBeVisible()
  })

  test('download button triggers .txt file download', async ({ page }) => {
    await page.route('/api/speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SPEECH_RESPONSE),
      })
    })

    await page.getByRole('button', { name: /generar speech técnico/i }).click()
    await expect(page.getByText('Speech técnico')).toBeVisible({ timeout: 10_000 })

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /descargar .txt/i }).click(),
    ])

    expect(download.suggestedFilename()).toMatch(/Speech_.*\.txt$/)
  })

  test('speech error shows retry message when API fails', async ({ page }) => {
    await page.route('/api/speech', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL', message: 'Failed' } }),
      })
    })

    await page.getByRole('button', { name: /generar speech técnico/i }).click()

    await expect(page.getByText(/error al generar el speech/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /generar speech técnico/i })).toBeVisible()
  })

  test('limpiar on speech resets and shows speech button again', async ({ page }) => {
    await page.route('/api/speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SPEECH_RESPONSE),
      })
    })

    await page.getByRole('button', { name: /generar speech técnico/i }).click()
    await expect(page.getByText('Speech técnico')).toBeVisible({ timeout: 10_000 })

    await page.getByText('Speech técnico').locator('..').getByRole('button', { name: /limpiar/i }).click()

    await expect(page.getByText('Speech técnico')).not.toBeVisible()
    await expect(page.getByRole('button', { name: /generar speech técnico/i })).toBeVisible()
  })
})

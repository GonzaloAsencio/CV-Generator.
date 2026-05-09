import { test, expect } from '@playwright/test'
import path from 'path'

// Requires: authenticated session + Supabase local + real PDF fixture
// Run with: npx playwright test tests/e2e/upload.spec.ts

test.describe('CV Upload flow', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes storageState with an authenticated Google session is configured
    await page.goto('/dashboard')
  })

  test('uploads a valid PDF and shows chunk count', async ({ page }) => {
    const dropZone = page.getByRole('button', { name: /zona de carga/i })
    await expect(dropZone).toBeVisible()

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'sample-cv.pdf'))

    await expect(page.getByText(/procesando/i)).toBeVisible()
    await expect(page.getByText(/chunk/i)).toBeVisible({ timeout: 30_000 })
  })

  test('shows error for non-PDF file', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    // Playwright can bypass the accept attribute to test the client guard
    await fileInput.setInputFiles({
      name: 'notapdf.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    })

    await expect(page.getByText(/solo se aceptan archivos pdf/i)).toBeVisible()
  })

  test('shows error for oversized file', async ({ page }) => {
    const sixMB = Buffer.alloc(6 * 1024 * 1024, 'a')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'big.pdf',
      mimeType: 'application/pdf',
      buffer: sixMB,
    })

    await expect(page.getByText(/menos de 5mb/i)).toBeVisible()
  })
})

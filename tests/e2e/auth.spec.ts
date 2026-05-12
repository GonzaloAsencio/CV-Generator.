import { test, expect } from '@playwright/test'

test.describe('Auth flows (unauthenticated)', () => {
  test('login page shows heading and Google sign-in button', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'CV Generator' })).toBeVisible()
    await expect(page.getByRole('button', { name: /continuar con google/i })).toBeVisible()
  })

  test('login page with error param shows error message', async ({ page }) => {
    await page.goto('/login?error=access_denied')

    await expect(page.getByText(/error al iniciar sesión/i)).toBeVisible()
  })

  test('/dashboard without session redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'CV Generator' })).toBeVisible()
  })
})

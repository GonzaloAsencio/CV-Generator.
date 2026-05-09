import { chromium } from '@playwright/test'
import path from 'path'

// One-time auth setup. Run once, then reuse the saved session:
//   npx playwright test tests/e2e/global.setup.ts
//
// Prerequisites:
//   1. App running at http://localhost:3000 (npm run dev)
//   2. A Google account that can sign in to the app
//
// After running this, `playwright/.auth/user.json` will be saved
// and the authenticated E2E tests will use it automatically.

const AUTH_FILE = path.join('playwright', '.auth', 'user.json')

async function globalSetup() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('http://localhost:3000/login')

  // Click Google sign-in and complete OAuth manually in the opened browser.
  // The script waits until the dashboard is reached (up to 2 minutes).
  await page.getByRole('button', { name: /continuar con google/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 120_000 })

  await context.storageState({ path: AUTH_FILE })
  console.log(`Auth state saved to ${AUTH_FILE}`)

  await browser.close()
}

export default globalSetup

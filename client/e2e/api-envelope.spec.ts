import { test, expect } from './fixtures'

/**
 * `apiClient`'s response-envelope rule, driven through a real screen.
 *
 * ⚠️ WHY THIS EXISTS. The interceptor rejects bodies that are not the API's
 * envelope, so a captive portal's HTML never reaches a destructuring call.
 * It once also rejected `{ success: true, message }` — the shape every
 * no-payload success has, because `data: undefined` is dropped by
 * JSON.stringify — and "Password changed", "Draft discarded" and the G4
 * "Override recorded" were all shown as unreadable responses while they had
 * succeeded on the server. Nothing caught it, because no test had ever sent
 * a success without `data`.
 *
 * Both halves are asserted on the reset-password screen with stubbed
 * responses, so no account and no reset limiter is touched.
 */

test.use({ storageState: { cookies: [], origins: [] } })

const TOKEN = 'b'.repeat(64)

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/verify-reset-token', (r) =>
    r.fulfill({ json: { success: true, message: 'ok', data: { valid: true } } }),
  )
})

async function submitNewPassword(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(`/reset-password?token=${TOKEN}`)
  await page.getByLabel('New password', { exact: true }).fill('Envelope#Test26')
  await page.getByLabel('Confirm new password').fill('Envelope#Test26')
  await page.getByRole('button', { name: /reset password/i }).click()
}

test('a success with no data payload is a success', async ({ page }) => {
  // Exactly what the server sends: `data` is absent, not null.
  await page.route('**/api/v1/auth/reset-password', (r) =>
    r.fulfill({ json: { success: true, message: 'Password reset successfully.' } }),
  )
  await submitNewPassword(page)
  await expect(page.getByRole('heading', { name: /^password reset$/i })).toBeVisible()
  await expect(page.getByText(/could not read/i)).toHaveCount(0)
})

test('an HTML page answering instead of the API is still refused, in words', async ({ page }) => {
  await page.route('**/api/v1/auth/reset-password', (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Wi-Fi login</body></html>' }),
  )
  await submitNewPassword(page)
  await expect(page.getByRole('alert')).toContainText(/could not read/i)
  // And no JavaScript internals leaked into the message.
  await expect(page.getByText(/cannot destructure|undefined/i)).toHaveCount(0)
})

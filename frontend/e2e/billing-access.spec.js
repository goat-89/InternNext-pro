import {
  expect,
  test,
} from '@playwright/test'

import {
  hasCredentials,
  loginEmployer,
  loginStudent,
} from './support/auth'
import {
  installSafeFailureArtifacts,
} from './support/safeArtifacts'

installSafeFailureArtifacts(test)

test('student billing loads without starting checkout', async ({
  page,
}) => {
  test.skip(
    !hasCredentials('student'),
    'Staging student credentials are not configured.'
  )

  await loginStudent(page)
  await page.goto('/student/billing')

  await expect(
    page.getByRole('heading', {
      name: 'Payments and billing',
    })
  ).toBeVisible()
})

test('employer billing loads without starting checkout', async ({
  page,
}) => {
  test.skip(
    !hasCredentials('employer'),
    'Staging employer credentials are not configured.'
  )

  await loginEmployer(page)
  await page.goto('/employer/billing')

  await expect(
    page.getByRole('heading', {
      name: 'Billing history',
    })
  ).toBeVisible()
})

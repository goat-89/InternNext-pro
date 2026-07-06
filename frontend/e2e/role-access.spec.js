import {
  expect,
  test,
} from '@playwright/test'

import {
  hasCredentials,
  loginAdmin,
  loginEmployer,
  loginStudent,
  stagingCredentials,
} from './support/auth'
import {
  installSafeFailureArtifacts,
} from './support/safeArtifacts'

installSafeFailureArtifacts(test)

test('student reaches the student dashboard', async ({
  page,
}) => {
  test.skip(
    !hasCredentials('student'),
    'Staging student credentials are not configured.'
  )

  await loginStudent(page)
  await expect(page).toHaveURL(
    /\/student\//
  )

  await page.goto('/employer/dashboard')
  await expect(page).not.toHaveURL(
    /\/employer\/dashboard/
  )
})

test('employer reaches employer tools', async ({
  page,
}) => {
  test.skip(
    !hasCredentials('employer'),
    'Staging employer credentials are not configured.'
  )

  await loginEmployer(page)
  await expect(page).toHaveURL(
    /\/employer\//
  )

  await page.goto('/student/dashboard')
  await expect(page).not.toHaveURL(
    /\/student\/dashboard/
  )
})

test('administrator reaches system health', async ({
  page,
}) => {
  test.skip(
    !hasCredentials('admin'),
    'Staging administrator credentials are not configured.'
  )

  await loginAdmin(page)
  await page.goto('/admin/system-health')

  await expect(
    page.getByRole('heading', {
      name: 'System health',
    })
  ).toBeVisible()
})

test('employer credentials are rejected by student login', async ({
  page,
}) => {
  test.skip(
    !hasCredentials('employer'),
    'Staging employer credentials are not configured.'
  )

  await page.goto('/login')
  await page
    .getByRole('tab', {
      name: 'Password',
    })
    .click()
  await page
    .getByLabel('Email address')
    .fill(stagingCredentials.employer.email)
  await page
    .getByLabel('Password', {
      exact: true,
    })
    .fill(
      stagingCredentials.employer
        .password
    )
  await page
    .getByRole('button', {
      name: 'Sign in securely',
    })
    .click()

  await expect(
    page.getByText(
      'Employer accounts cannot use Student login. Please use Employer login.',
      { exact: true }
    )
  ).toBeVisible()
})

test('student credentials are rejected by employer login', async ({
  page,
}) => {
  test.skip(
    !hasCredentials('student'),
    'Staging student credentials are not configured.'
  )

  await page.goto('/login/employer')
  await page
    .getByLabel('Email', {
      exact: true,
    })
    .fill(stagingCredentials.student.email)
  await page
    .getByLabel('Password', {
      exact: true,
    })
    .fill(
      stagingCredentials.student
        .password
    )
  await page
    .getByRole('button', {
      name: 'Sign in',
      exact: true,
    })
    .click()

  await expect(
    page.getByText(
      'Student accounts cannot use Employer login. Please use Student login.',
      { exact: true }
    )
  ).toBeVisible()
})

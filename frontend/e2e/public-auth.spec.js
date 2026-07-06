import {
  expect,
  test,
} from '@playwright/test'

import {
  installSafeFailureArtifacts,
} from './support/safeArtifacts'

installSafeFailureArtifacts(test)

test('public opportunity routes load', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', {
      name:
        'Launch your career with opportunities that actually fit.',
    })
  ).toBeVisible()

  await page.goto('/internships')
  await expect(
    page.getByRole('heading', {
      name: 'Find your next internship',
    })
  ).toBeVisible()

  await page.goto('/pricing')
  await expect(
    page.getByRole('heading', {
      name:
        'Choose support that matches your goals',
    })
  ).toBeVisible()
})

test('public trust and resource pages are usable', async ({
  page,
}) => {
  await page.goto('/privacy')
  await expect(
    page.getByRole('heading', {
      name: 'Privacy Policy',
    })
  ).toBeVisible()
  await expect(
    page.getByText(
      'Pending professional legal approval',
      {
        exact: true,
      }
    )
  ).toBeVisible()

  await page.goto('/help')
  const search =
    page.getByPlaceholder(
      'Search help articles'
    )
  await search.fill('billing')
  await expect(
    page.getByRole('heading', {
      name:
        'Understand payment and plan status',
    })
  ).toBeVisible()
  await expect(
    page.getByText('1 article', {
      exact: true,
    })
  ).toBeVisible()

  await page.goto('/blog')
  await expect(
    page.getByRole('link', {
      name:
        'Build an internship-ready resume',
    })
  ).toHaveAttribute(
    'href',
    '#resume'
  )

  await page
    .getByRole('link', {
      name: 'Privacy',
      exact: true,
    })
    .last()
    .click()
  await expect(page).toHaveURL(/\/privacy$/)
})

test('login switches between student and employer access', async ({
  page,
}) => {
  await page.goto('/login')

  await expect(
    page.getByRole('heading', {
      name: 'Student sign in',
    })
  ).toBeVisible()

  await page
    .getByRole('tab', {
      name: 'Employer',
    })
    .click()

  await expect(
    page.getByRole('heading', {
      name: 'Employer sign in',
    })
  ).toBeVisible()
})

test('protected role routes redirect to login', async ({
  page,
}) => {
  const protectedRoutes = [
    '/student/dashboard',
    '/employer/dashboard',
    '/admin/system-health',
  ]

  for (const route of protectedRoutes) {
    await page.goto(route)
    await expect(page).toHaveURL(
      /\/login/
    )
  }
})

export const stagingCredentials = {
  student: {
    email:
      process.env.E2E_STUDENT_EMAIL ||
      '',
    password:
      process.env
        .E2E_STUDENT_PASSWORD || '',
  },
  employer: {
    email:
      process.env.E2E_EMPLOYER_EMAIL ||
      '',
    password:
      process.env
        .E2E_EMPLOYER_PASSWORD || '',
  },
  admin: {
    email:
      process.env.E2E_ADMIN_EMAIL || '',
    password:
      process.env.E2E_ADMIN_PASSWORD ||
      '',
  },
}

export function hasCredentials(role) {
  const credentials =
    stagingCredentials[role]

  return Boolean(
    credentials?.email &&
      credentials?.password
  )
}

export async function loginStudent(
  page,
  credentials =
    stagingCredentials.student
) {
  await page.goto('/login')

  await page
    .getByRole('tab', {
      name: 'Password',
    })
    .click()

  await page
    .getByLabel('Email address')
    .fill(credentials.email)
  await page
    .getByLabel('Password', {
      exact: true,
    })
    .fill(credentials.password)
  await page
    .getByRole('button', {
      name: 'Sign in securely',
    })
    .click()

  await page.waitForURL(
    '**/student/**'
  )
}

export async function loginEmployer(
  page,
  credentials =
    stagingCredentials.employer
) {
  await page.goto('/login/employer')

  await page
    .getByLabel('Email', {
      exact: true,
    })
    .fill(credentials.email)
  await page
    .getByLabel('Password', {
      exact: true,
    })
    .fill(credentials.password)
  await page
    .getByRole('button', {
      name: 'Sign in',
      exact: true,
    })
    .click()

  await page.waitForURL(
    '**/employer/**'
  )
}

export async function loginAdmin(
  page,
  credentials =
    stagingCredentials.admin
) {
  await page.goto('/internal/access')

  await page
    .getByLabel('Approved email')
    .fill(credentials.email)
  await page
    .getByLabel('Password', {
      exact: true,
    })
    .fill(credentials.password)
  await page
    .getByRole('button', {
      name: 'Continue securely',
    })
    .click()

  await page.waitForURL('**/admin/**')
}

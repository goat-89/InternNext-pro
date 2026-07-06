import {
  expect,
  test,
} from '@playwright/test'

import {
  installSafeFailureArtifacts,
} from './support/safeArtifacts'

installSafeFailureArtifacts(test)

async function expectNoHorizontalOverflow(
  page
) {
  const dimensions = await page.evaluate(
    () => ({
      clientWidth:
        document.documentElement
          .clientWidth,
      scrollWidth:
        document.documentElement
          .scrollWidth,
    })
  )

  expect(
    dimensions.scrollWidth
  ).toBeLessThanOrEqual(
    dimensions.clientWidth
  )
}

test('@responsive public and login layouts fit the viewport', async ({
  page,
}) => {
  await page.goto('/')
  await expectNoHorizontalOverflow(page)

  await page.goto('/internships')
  await expectNoHorizontalOverflow(page)

  await page.goto('/pricing')
  await expectNoHorizontalOverflow(page)

  await page.goto('/login')
  await expectNoHorizontalOverflow(page)
})

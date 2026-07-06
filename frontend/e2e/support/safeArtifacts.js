export function installSafeFailureArtifacts(
  test
) {
  test.afterEach(
    async ({ page }, testInfo) => {
      if (
        testInfo.status ===
        testInfo.expectedStatus
      ) {
        return
      }

      try {
        const screenshot =
          await page.screenshot({
            fullPage: true,
            mask: [
              page.locator('input'),
              page.locator('textarea'),
            ],
          })

        await testInfo.attach(
          'failure-screenshot',
          {
            body: screenshot,
            contentType: 'image/png',
          }
        )
      } catch {
        // Preserve the original test failure.
      }
    }
  )
}

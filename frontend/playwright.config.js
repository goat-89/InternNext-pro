import {
  defineConfig,
} from '@playwright/test'

const externalBaseUrl =
  process.env.E2E_BASE_URL
const baseURL =
  externalBaseUrl ||
  'http://127.0.0.1:5173'

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder:
          'playwright-report',
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command:
          'npm run dev -- --host 127.0.0.1',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          VITE_SUPABASE_URL:
            process.env
              .VITE_SUPABASE_URL ||
            'http://127.0.0.1:54321',
          VITE_SUPABASE_PUBLISHABLE_KEY:
            process.env
              .VITE_SUPABASE_PUBLISHABLE_KEY ||
            process.env
              .VITE_SUPABASE_ANON_KEY ||
            'e2e-local-publishable-key',
        },
      },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: {
          width: 1280,
          height: 720,
        },
      },
    },
    {
      name: 'mobile-chromium',
      testMatch:
        /responsive\.spec\.js/,
      use: {
        browserName: 'chromium',
        viewport: {
          width: 390,
          height: 844,
        },
      },
    },
  ],
})

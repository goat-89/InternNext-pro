# InternNext Pro End-to-End Testing

The Playwright smoke suite verifies public routes, authentication surfaces,
protected-route behavior, role separation, administrator health access, billing
access, and responsive layout.

## Install Browser

Install the Chromium runtime once:

```text
npx playwright install chromium
```

## Safe Default Run

Without staging credentials, public, route-guard, and responsive tests run while
authenticated tests are skipped:

```text
npm run test:e2e
```

The configuration starts the local Vite server automatically unless
`E2E_BASE_URL` is provided. For local public-route tests only, Playwright
supplies an unreachable local Supabase URL and a non-secret placeholder
publishable key when real browser configuration is absent. This lets startup,
fallback, and route behavior run without committing credentials.

## Staging Variables

Configure these only in the local shell or CI secret store:

- `E2E_BASE_URL`
- `E2E_STUDENT_EMAIL`
- `E2E_STUDENT_PASSWORD`
- `E2E_EMPLOYER_EMAIL`
- `E2E_EMPLOYER_PASSWORD`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`

Use synthetic staging accounts. Never use personal accounts, production
credentials, or production data.

## Safety

- The suite does not submit Razorpay checkout.
- Billing checks are read-only.
- Each test receives an isolated browser context.
- Automatic traces and videos are disabled because they can retain credentials.
- Failure screenshots mask all inputs and textareas.
- Reports, results, and browser session paths are gitignored.

## CI

Run these commands in order:

```text
npm ci
npx playwright install --with-deps chromium
npm run test -- --run
npm run build
npm run test:e2e
```

Keep staging secrets in the CI provider's encrypted secret store. Restrict job
logs and artifacts to authorized maintainers.

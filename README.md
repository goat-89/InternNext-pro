# InternNext Pro

InternNext Pro is a Vite + React + Supabase internship platform for students, employers, and administrators.

## Repository Structure

```text
frontend/          React, Vite, browser tests, and frontend configuration
backend/supabase/  PostgreSQL migrations, Edge Functions, and SQL tests
docs/              Architecture, deployment, security, and operations guides
```

## Stack

- React + Vite
- React Router
- Supabase Auth
- Supabase PostgreSQL with RLS
- Supabase Storage
- Supabase Edge Functions
- Razorpay Checkout through server-side order creation and verification
- Tailwind CSS
- React Hook Form
- Zod

## Run

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
cd frontend
npm run build
```

Run automated checks from `frontend/`:

```bash
npm run test -- --run
npm run test:e2e
```

Run Edge Function helper tests separately:

```bash
cd backend
npm install
npm test
```

## Supabase

Database schema, RLS policies, storage policies, RPCs, and payment/support migrations are kept in `backend/supabase/migrations`.

Edge Functions are kept in `backend/supabase/functions`.

Notification worker scheduling is documented in
`docs/NOTIFICATION_WORKER_SCHEDULE.md`.

Required browser environment variable names:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do not place service-role keys, Razorpay key secrets, or webhook secrets in frontend environment variables.

## Razorpay

Razorpay integration uses Supabase Edge Functions for:

- creating orders
- verifying Checkout signatures
- processing signed webhooks

Required Supabase Function secret names:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Notification worker

Notification delivery uses the
`notification-delivery-worker` Edge Function.

Required Supabase Function secret names:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTIFICATION_WORKER_SECRET`
- `RESEND_API_KEY` when email delivery is enabled
- `NOTIFICATION_EMAIL_FROM` when email delivery is enabled
- `PUBLIC_SITE_URL` or `SITE_URL` or `APP_BASE_URL`

The database schedule uses Supabase Vault secret names:

- `notification_worker_project_url`
- `notification_worker_publishable_key`
- `notification_worker_secret`

## Notes

- Do not commit `.env` files.
- Keep Row Level Security enabled.
- Use `frontend/src/lib/supabase.js` as the shared frontend Supabase client.
- Run frontend commands from `frontend/`.
- Apply backend migrations in filename order through the reviewed deployment process.

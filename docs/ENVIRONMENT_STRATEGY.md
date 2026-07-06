# InternNext Pro Environment Strategy

InternNext Pro uses separate development, staging, and production
configurations. Never reuse production credentials, payment accounts, test
users, or private documents in another environment.

## Environment Matrix

| Concern | Development | Staging | Production |
| --- | --- | --- | --- |
| Frontend URL | Localhost | Dedicated staging domain | Public production domain |
| Supabase | Development project | Dedicated staging project | Dedicated production project |
| Razorpay | Test mode | Test mode | Live mode |
| Resend/email | Test sender or disabled | Verified staging sender | Verified production sender |
| Auth redirects | Localhost only | Staging URLs only | Production URLs only |
| Webhooks | Development endpoint | Staging endpoint | Production endpoint |
| User data | Synthetic | Synthetic | Real user data |

Separate Supabase projects are preferred. If temporary isolation is unavoidable,
do not share auth users, Storage objects, payment records, or webhook secrets.

## Browser Variables

Only publishable values may use the `VITE_` prefix:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_APP_URL`
- `VITE_ENABLE_WHATSAPP_OTP`

`VITE_SUPABASE_ANON_KEY` remains a legacy fallback. Prefer the publishable key.
Every `VITE_` value is bundled into browser code and must be treated as public.

## Edge Function Secrets

Configure these in the matching Supabase project, never in frontend variables:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by Supabase.
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `PAYMENT_ALLOWED_ORIGINS`
- `NOTIFICATION_WORKER_SECRET`
- `RESEND_API_KEY`
- `NOTIFICATION_EMAIL_FROM`
- `PUBLIC_SITE_URL`

The notification worker also accepts `SITE_URL` or `APP_BASE_URL` as a fallback,
but `PUBLIC_SITE_URL` is the preferred explicit setting.

Database Vault stores the notification scheduler values named:

- `notification_worker_project_url`
- `notification_worker_publishable_key`
- `notification_worker_secret`

The worker secret in Vault must match `NOTIFICATION_WORKER_SECRET`.

## Authentication URLs

Configure the Supabase Site URL for the active frontend domain. Allow only the
environment's required redirects:

- `/auth/callback`
- `/reset-password`

Google OAuth JavaScript origins must contain the matching frontend origin.
Google's provider callback must be the Supabase callback shown in the
Authentication provider settings. Do not add broad wildcard redirects in
production.

## Razorpay Separation

Development and staging use Razorpay test credentials and test webhooks.
Production uses live credentials in the production Supabase project only.

The webhook endpoint format is:

```text
https://PROJECT_REF.supabase.co/functions/v1/razorpay-webhook
```

Create a different webhook secret for each environment. Enable only the events
handled by the deployed function. Never treat the browser checkout callback as
proof of payment; subscription activation remains server-verified.

## CORS And Domains

Set `PAYMENT_ALLOWED_ORIGINS` to a comma-separated list of exact frontend
origins, without paths or wildcards. Example value shapes are
`http://localhost:5173` for local development and
`https://staging.example.com,https://example.com` when one Edge Function
deployment intentionally serves both approved domains.

The Razorpay order and verification functions reflect an origin only when it
is on this allowlist. Requests without an `Origin` header remain available to
trusted server and mobile clients. The signed Razorpay webhook does not use
browser CORS.

## Data And Backups

- Use synthetic data outside production.
- Verify automated production database backups before launch.
- Export a schema snapshot before high-risk migrations.
- Test restore procedures in a non-production project.
- Never copy production resumes or identity documents into staging.
- Define retention owners for payment, notification, support, and audit data.
- Define retention for operational events and restrict health access to administrators.

## Operational Monitoring

Use the administrator System health screen together with Supabase database,
Edge Function, Auth, Storage, cron, and provider logs. Preserve request
reference IDs across support and incident workflows. External uptime or error
monitoring credentials, when introduced, must remain server-side and
environment-specific.

## Configuration Ownership

Restrict dashboard access to named operators. Rotate a secret immediately if it
is exposed, remove it from logs and history, redeploy affected functions, and
invalidate related sessions or webhook credentials where applicable.

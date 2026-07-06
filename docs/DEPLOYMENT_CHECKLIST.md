# InternNext Pro Deployment Checklist

Use this checklist for staging and production. Replace placeholders locally;
never paste secret values into source control, screenshots, tickets, or logs.

## 1. Release Preparation

- [ ] Confirm the target environment and Supabase project reference.
- [ ] Confirm `git status` contains only intended release files.
- [ ] Run `npm ci`.
- [ ] Run `npm run test -- --run`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test:e2e` against staging with isolated test accounts.
- [ ] Review the generated bundle for accidental secret names or private data.
- [ ] Record the current application version and migration boundary.

## 2. Environment Configuration

- [ ] Set `VITE_SUPABASE_URL` for the target project.
- [ ] Set `VITE_SUPABASE_PUBLISHABLE_KEY`; never use a service-role key.
- [ ] Set `VITE_APP_URL` to the exact deployed frontend origin.
- [ ] Enable `VITE_ENABLE_WHATSAPP_OTP` only after provider verification.
- [ ] Confirm production URLs use HTTPS.
- [ ] Confirm no production credentials are used in staging.

## 3. Supabase Authentication

- [ ] Set the Site URL to the deployed frontend origin.
- [ ] Allow the exact `/auth/callback` and `/reset-password` URLs.
- [ ] Verify email templates use the intended environment branding and links.
- [ ] Verify Google OAuth origin and callback configuration.
- [ ] Verify phone/WhatsApp providers and rate limits when enabled.
- [ ] Confirm CAPTCHA and abuse controls for production.
- [ ] Test student, employer, and administrator role mismatch rejection.

## 4. Database Migrations

- [ ] Verify a recent backup exists before applying migrations.
- [ ] Link the CLI to the intended project: `npx supabase link --project-ref PROJECT_REF`.
- [ ] Review pending migration SQL and rollback implications.
- [ ] Apply migrations in filename order with the approved deployment process.
- [ ] Record every applied migration.
- [ ] Never paste a migration filename alone into the SQL Editor; execute its SQL contents.
- [ ] Confirm no table or production data was deleted.

Rollback normally means deploying a reviewed forward migration. For a failed
high-risk release, stop writes to the affected workflow, preserve logs, restore
from the verified backup only when necessary, and document reconciliation work.

## 5. RLS And RPC Verification

- [ ] Apply the latest authorization-hardening migration.
- [ ] Run `supabase/tests/authorization_catalog_verification.sql`.
- [ ] Run `supabase/tests/authorization_behavior_verification.sql` in staging only.
- [ ] Confirm RLS remains enabled on every application table.
- [ ] Confirm students cannot access another student's private profile, resume, application, or saved rows.
- [ ] Confirm employers cannot access unrelated companies, internships, applications, or candidate notes.
- [ ] Confirm non-admin users cannot call administrator RPCs.
- [ ] Confirm users cannot forge payments, subscriptions, entitlements, or notifications.
- [ ] Confirm suspended and deleted accounts cannot perform protected writes.
- [ ] Confirm administrator changes create audit records where required.

See `docs/SUPABASE_AUTHORIZATION_VERIFICATION.md` for execution and rollback
guidance.

## 6. Storage

- [ ] Verify the `student-avatars` bucket is public with image-only limits.
- [ ] Verify the `student-resumes` bucket is private and PDF-only.
- [ ] Verify the `company-assets` bucket is public with image-only limits.
- [ ] Test owner path restrictions for upload, update, and delete.
- [ ] Test resume access as owner, authorized employer, unrelated user, and admin.

## 7. Edge Functions

- [ ] Configure Razorpay secrets in the target Supabase project.
- [ ] Set `PAYMENT_ALLOWED_ORIGINS` to the exact approved frontend origins.
- [ ] Configure notification worker and email provider secrets.
- [ ] Deploy each function to the intended project.
- [ ] Confirm function logs do not contain tokens, secrets, signatures, or private documents.
- [ ] Verify safe error responses for malformed and unauthorized requests.
- [ ] Confirm production browser origins are explicitly approved before launch.

Functions currently deployed by this repository:

```text
razorpay-create-order
razorpay-verify-payment
razorpay-webhook
notification-delivery-worker
platform-health
```

## 8. Razorpay

- [ ] Confirm test credentials in development/staging and live credentials only in production.
- [ ] Confirm unapproved browser origins receive no CORS access.
- [ ] Confirm approved preflight responses reflect only the requesting approved origin.
- [ ] Configure the environment-specific webhook URL.
- [ ] Confirm webhook signature verification and duplicate-event handling.
- [ ] Confirm malformed requests return safe codes and request reference IDs without internal errors.
- [ ] Test successful, failed, duplicate, and invalid-signature paths.
- [ ] Confirm a verified payment creates an active subscription.
- [ ] Confirm plan limits are enforced server-side.

## 9. Notification Worker

- [ ] Create the required Vault entries for the target project.
- [ ] Confirm the Vault worker secret matches the Edge Function secret.
- [ ] Install and verify the cron schedule.
- [ ] Invoke one smoke-test run.
- [ ] Confirm delivery jobs, run history, retry state, and retention cleanup.
- [ ] Confirm email links use the correct public frontend URL.

See `docs/NOTIFICATION_WORKER_SCHEDULE.md` for the scheduler commands.

## 10. Smoke Tests

- [ ] Public internship browsing and details work.
- [ ] Student signup, login, onboarding, save, apply, and withdraw work.
- [ ] Employer signup, onboarding, company management, posting, and applicant review work.
- [ ] Administrator moderation, settings, audit, support, payment, subscription, and delivery screens work.
- [ ] Password reset and email verification links return to the correct domain.
- [ ] Razorpay test checkout activates the expected plan.
- [ ] Notification events reach the in-app channel and configured email channel.
- [ ] Loading, empty, error, retry, suspended, and deleted-account states work.
- [ ] Mobile layouts have no horizontal overflow.
- [ ] Playwright role-mismatch, protected-route, billing, and administrator smoke tests pass.
- [ ] `platform-health` returns `200` for both `GET` and `HEAD`.
- [ ] A forced staging health failure returns a generic `503` without internal details.
- [ ] The external frontend and health monitors send test failure and recovery alerts.
- [ ] Operational retention preview matches the expected status and age boundaries.
- [ ] The operational-event cleanup cron job is installed and active.

## 11. Release And Monitoring

- [ ] Deploy the frontend only after database and function verification.
- [ ] Purge stale CDN assets if required.
- [ ] Check frontend, Supabase, Edge Function, webhook, cron, and email logs.
- [ ] Confirm the last successful notification worker run.
- [ ] Monitor authentication failures, payment failures, and authorization denials.
- [ ] Verify `/admin/system-health` is accessible only to administrators.
- [ ] Trigger a staging client error and confirm only a safe code and reference ID are stored.
- [ ] Confirm operational event payloads contain no raw error, stack, token, OTP, signature, or document data.
- [ ] Assign an operational event retention owner and review interval.
- [ ] Confirm the latest operational-event cleanup completed successfully.
- [ ] Confirm the external health monitor is green and alert routing is current.
- [ ] Keep the previous frontend artifact available for rollback.
- [ ] Record the release result, operator, time, and known limitations.

## 12. Production Sign-Off

- [ ] Backup and restore process verified.
- [ ] Domain, TLS, callback, OAuth, webhook, and email sender verified.
- [ ] RLS and Storage authorization matrix passed.
- [ ] Payment and subscription flow passed.
- [ ] Notification delivery flow passed.
- [ ] Legal entity name, registered office, and required identifiers are approved.
- [ ] Support, privacy, billing, and grievance contacts are configured and monitored.
- [ ] Retention and deletion schedules are approved for each data category.
- [ ] Cookie inventory, consent behavior, and analytics disclosures are verified.
- [ ] Terms, privacy, refunds, employer terms, safety, community, deletion,
      grievance, and acceptable-use drafts have professional legal approval.
- [ ] Legal versions, effective dates, change notices, and approval records are retained.
- [ ] The checks in `docs/LEGAL_REVIEW_CHECKLIST.md` are complete.
- [ ] Rollback owner and incident contact assigned.

# InternNext Pro Advanced Platform Audit

Date: 2026-06-25

## Scope

This Phase 0 audit is documentation-only. It reviews the current repository state for production readiness across authentication, authorization, student workflows, employer workflows, administrator workflows, payments, webhooks, notifications, storage, database migrations, RLS, secure RPC usage, Edge Functions, tests, error handling, logging, performance, accessibility, responsive design, and deployment configuration.

No application code, migrations, Edge Functions, or environment files were changed for this audit.

## Evidence Reviewed

- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/AUTH_SETUP.md`
- `package.json`
- `supabase/migrations/*`
- `supabase/functions/razorpay-create-order/index.ts`
- `supabase/functions/razorpay-verify-payment/index.ts`
- `supabase/functions/razorpay-webhook/index.ts`
- Existing tests under `src/lib/*.test.js`
- Authentication modules under `src/context`, `src/pages/auth`, and `src/lib/auth*`
- Payment, notification, application, employer, admin, storage, route guard, and platform settings modules under `src/lib`, `src/components`, and `src/pages`

## Executive Summary

InternNext Pro is already a strong functional prototype with meaningful production-oriented pieces in place: centralized Supabase access, role-separated auth, secure RPC direction, RLS migrations, storage policies, Razorpay Edge Functions, support tickets, notifications UI, admin moderation, audit logs, route-level code splitting, and a growing automated test suite.

The largest production gaps are not basic feature absence. The main gaps are verification depth, defense-in-depth, entitlement enforcement, notification event generation, deployment controls, and end-to-end security testing.

The first implementation milestone should be a P0 deployment and security verification package: create environment/deployment checklists, `.env.example` with safe placeholders, and a repeatable Supabase verification checklist before adding more product features.

## Severity Key

- Critical: likely production blocker or data/security failure if unaddressed.
- High: significant security, reliability, or business risk.
- Medium: meaningful quality, scale, or maintainability risk.
- Low: polish, documentation, or future hardening.

## Current Strengths

### Architecture

- Vite + React + React Router app with lazy-loaded major routes.
- Central Supabase client in `src/lib/supabase.js`.
- Auth provider verifies sessions with `supabase.auth.getUser()`.
- Platform settings provider gates maintenance mode and public internship browsing.
- Role-based route guards exist for student, employer, and admin areas.

### Authentication

- Supabase PKCE, persisted sessions, auto refresh, and URL session detection are configured.
- Student auth supports email OTP, phone OTP, optional WhatsApp OTP, Google OAuth, and password login.
- Employer auth supports email/password login and signup.
- Role mismatch flows sign out wrong-role users and show safe messages.
- Admin access is moved to an unlisted operational route.
- Email verification, reset password, suspended account, and deleted account routes exist.

### Database And Security Direction

- Core schema exists in `supabase/migrations/202606240001_create_core_schema.sql`.
- RLS is enabled for core tables in `202606240002_enable_core_rls_policies.sql`.
- Storage buckets and policies exist for student avatars, student resumes, and company assets.
- Secure RPCs exist for onboarding, profile updates, storage path updates, admin moderation, reports, support tickets, employer invites, and account deletion.
- Payment tables and webhook event tables exist with RLS enabled.

### Product Workflows

- Student applications, saved internships, dashboard, profile, storage, payments, interviews, and recommendations entry points exist.
- Employer company setup, internships, listings, applicants, status updates, interview scheduling, analytics, support, billing, and invites exist.
- Admin dashboards, moderation, settings, payments, support tickets, reports, and audit logs exist.

### Tests

- Existing Vitest coverage includes:
  - auth routes
  - formatting
  - account deletion helpers
  - applications
  - saved internships
  - employer applicant status and interview scheduling helpers
  - payments API helpers
  - support ticket helpers
  - admin audit CSV helpers
  - admin report helpers

## Critical Findings

### C1. Production deployment safety is not yet formalized

Severity: Critical

Evidence:
- `package.json` only exposes `dev`, `build`, `test`, and `preview`.
- `docs/AUTH_SETUP.md` documents auth setup, but no full environment/deployment checklist exists.
- Edge Functions depend on `SUPABASE_SERVICE_ROLE_KEY`, Razorpay secrets, and webhook secret, but no repository checklist tracks environment-specific secret verification.

Risk:
- Staging and production may accidentally share Supabase, Razorpay, OAuth, webhook, or callback settings.
- A production deploy could miss RLS, storage buckets, Edge Function secrets, webhook URLs, or callback URLs.

Recommendation:
- Add `docs/ENVIRONMENT_STRATEGY.md`, `docs/DEPLOYMENT_CHECKLIST.md`, and `.env.example` with names and safe placeholders only.
- Make launch require a manual Supabase and Edge Function verification checklist.

### C2. RLS is present but not regression-tested against real unauthorized actors

Severity: Critical

Evidence:
- RLS policies exist in migrations.
- Current automated tests mainly mock frontend API helpers. They do not exercise real Supabase policies with multiple users.

Risk:
- A policy regression could expose private student profiles, applications, employer notes, payment rows, support tickets, or storage objects.

Recommendation:
- Add a local/staging Supabase RLS test plan with seeded users.
- Add policy tests for each role and table before production.

### C3. Entitlements are not enforced beyond payment order recording

Severity: Critical

Evidence:
- Razorpay order creation, verification, webhook handling, and payment history exist.
- `docs/PROJECT_STATUS.md` states plan entitlement enforcement beyond recorded payment orders is limited.

Risk:
- Users may pay but not receive consistent plan limits, or users may access paid capabilities without active entitlements.

Recommendation:
- Implement subscriptions/entitlements after deployment and RLS verification.
- Enforce limits server-side, not only in UI.

## High Findings

### H1. Payment Edge Functions return some upstream/internal error strings

Severity: High

Evidence:
- `razorpay-create-order` can return `error?.message` or Razorpay failure descriptions directly.
- `razorpay-webhook` can return database insert error messages when webhook event storage fails.

Risk:
- Users or webhook callers may see implementation details or provider-specific internals.

Recommendation:
- Return safe error codes and generic messages externally.
- Log internal details in structured logs without secrets.

### H2. Razorpay create/verify functions allow broad CORS

Severity: High

Evidence:
- `Access-Control-Allow-Origin: *` is configured for create-order and verify-payment functions.

Risk:
- Auth is still required, but production should limit browser origins to approved app domains where feasible.

Recommendation:
- Add environment-specific allowed origins.
- Reject browser requests from unknown origins while preserving webhook behavior separately.

### H3. Webhook processing is idempotent but has limited outcome logging

Severity: High

Evidence:
- `payment_webhook_events` stores raw payload and `processed_at`.
- It does not store processing status, failure reason, retry count, or affected order ID.

Risk:
- Failed webhook processing may be hard to diagnose.
- Admin health screens cannot distinguish success, duplicate, ignored, and failed processing.

Recommendation:
- Extend webhook logging in a future migration with status, error_code, error_message, affected_order_id, and retry metadata.

### H4. Notifications UI exists, but event production is incomplete

Severity: High

Evidence:
- `notificationsApi.js` supports list, read, delete, and realtime subscription.
- Admin moderation migrations create some notifications.
- `docs/PROJECT_STATUS.md` states broader notification creation/delivery workflows are limited.

Risk:
- Users may miss important changes such as interview updates, application transitions, support updates, payment failures, and plan limits.

Recommendation:
- Build a notification event engine with typed events, preferences, dedupe, delivery status, and retry handling.

### H5. Frontend API modules perform role checks, but final security depends on deployed RLS/RPC behavior

Severity: High

Evidence:
- Many frontend modules check current user role before calling data operations.
- Route guards check `profile.role`, `account_status`, and onboarding state.
- RLS/RPC migrations exist, but real policy tests are not present.

Risk:
- Frontend checks can improve UX but cannot be the security boundary.

Recommendation:
- Treat frontend checks as UX only.
- Verify database policies and RPCs under real users.

### H6. Storage signed URL authorization requires stronger regression testing

Severity: High

Evidence:
- Student resumes are private and signed URLs are generated by student and employer modules.
- Storage RLS policies attempt to restrict paths and application ownership.
- No automated storage policy tests exist.

Risk:
- Private resumes are sensitive and must never be accessible to unrelated users.

Recommendation:
- Add storage policy tests for owner student, authorized employer, unrelated employer, unrelated student, anon, and admin.

### H7. Admin direct table reads and RPCs need real non-admin denial tests

Severity: High

Evidence:
- Admin modules read tables and call admin RPCs.
- Migrations include admin RLS and RPC guards.
- Existing tests mostly validate helper behavior and CSV generation, not real non-admin denial.

Risk:
- A missing or misapplied policy could expose admin data.

Recommendation:
- Add Supabase integration tests for every admin table and RPC.

## Medium Findings

### M1. Environment validation exists but is minimal

Severity: Medium

Evidence:
- `src/lib/environment.js` validates Supabase URL and publishable/anon key names.
- No validation covers app URL, Razorpay public key, optional WhatsApp flag, production mode expectations, or allowed callback settings.

Risk:
- Misconfigured deployments can fail at runtime.

Recommendation:
- Expand safe frontend environment validation.
- Document environment-specific required variables without exposing values.

### M2. Error handling is inconsistent across modules

Severity: Medium

Evidence:
- Auth has `getAuthErrorMessage`.
- Many API modules throw raw Supabase errors directly.
- Some UI catches show generic messages; others may expose `error.message`.

Risk:
- Users may see raw database/provider messages.

Recommendation:
- Add a shared safe error normalization layer domain by domain.

### M3. Public search and listings need explicit pagination and query review

Severity: Medium

Evidence:
- Public internship listing supports approved/non-expired filtering.
- Advanced search, saved searches, and server-side pagination are not yet production-grade.

Risk:
- Larger datasets may cause slow queries or high browser load.

Recommendation:
- Add server-side filtering, pagination, URL-synced filters, and index review in a later search milestone.

### M4. Notification realtime subscriptions require scale review

Severity: Medium

Evidence:
- Each user opens a unique realtime channel filtered by `user_id`.
- Subscriptions are cleaned up by returned unsubscribe functions.

Risk:
- Many concurrent users can increase realtime resource usage.

Recommendation:
- Keep subscriptions only where needed, add fallback polling/retry behavior, and monitor channel errors.

### M5. Account status handling is good but not complete across every helper

Severity: Medium

Evidence:
- Route guards handle suspended/deleted accounts.
- Some modules check suspended status, while lightweight modules rely on RLS/RPC.

Risk:
- UX may be inconsistent for suspended/deleted users.

Recommendation:
- Ensure all protected RPCs and policies reject suspended/deleted users consistently.

### M6. Legal and public content are not production-final

Severity: Medium

Evidence:
- `docs/PROJECT_STATUS.md` lists legal/blog/help content as mostly static.

Risk:
- Launch compliance and user trust are affected.

Recommendation:
- Replace placeholders with reviewed content and mark legal pages as requiring professional review.

### M7. Accessibility and responsive behavior need formal checklist coverage

Severity: Medium

Evidence:
- Many forms use labels and focusable controls.
- No automated accessibility checks are configured.

Risk:
- Accessibility regressions can enter unnoticed.

Recommendation:
- Add manual and automated accessibility verification to each milestone.

## Low Findings

### L1. Some files have inconsistent formatting style

Severity: Low

Evidence:
- Several modules use unusual line wrapping and semicolon inconsistency.

Risk:
- Maintainability cost and harder review diffs.

Recommendation:
- Add formatting conventions later. Do not mass-format during feature work.

### L2. Documentation is improving but spread across several files

Severity: Low

Evidence:
- Project status, auth setup, migrations, and implementation notes are separate.

Risk:
- New contributors may miss operational steps.

Recommendation:
- Add a launch index or operations README after Phase 1.

## Security Risk Matrix

| ID | Area | Risk | Severity | Current Control | Gap | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- |
| SR-01 | Deployment | Wrong Supabase/Razorpay/OAuth/webhook environment used in production | Critical | Some env validation and auth docs | No full deployment/environment checklist | Phase 1 environment strategy and checklist |
| SR-02 | RLS | Unauthorized table reads/writes if policies are incomplete or not applied | Critical | RLS migrations exist | No real RLS regression tests | Add Supabase integration policy tests |
| SR-03 | Payments | Paid features not tied to verified entitlement records | Critical | Payment orders and webhook processing | No full subscription/entitlement model | Phase 3 entitlement enforcement |
| SR-04 | Webhooks | Failed webhook processing hard to diagnose | High | Webhook event table, duplicate detection | Limited status/failure logging | Add processing status and admin health view |
| SR-05 | Edge Functions | Internal/provider errors returned to clients | High | Some generic messages | Some raw `error.message` paths remain | Safe error code mapping |
| SR-06 | CORS | Payment functions allow all origins | High | Auth required | No domain allowlist | Environment-specific origin checks |
| SR-07 | Storage | Resume signed URL or storage policy leak | High | Private bucket, path policies, signed URLs | No policy tests | Storage policy test suite |
| SR-08 | Admin | Non-admin could access admin data if policy misapplied | High | Admin checks and RLS/RPCs | No real non-admin denial tests | Admin RLS/RPC tests |
| SR-09 | Notifications | Missing critical notifications | High | Notification UI and some inserts | No event engine | Typed notification event pipeline |
| SR-10 | Error UX | Raw Supabase/provider errors in UI | Medium | Auth-specific mapper | Domain errors inconsistent | Shared safe error handling |
| SR-11 | Realtime | Subscription scale and failure visibility | Medium | Channel cleanup exists | Limited retry/fallback/monitoring | Observability and fallback plan |
| SR-12 | Legal | Placeholder legal/public content | Medium | Static pages exist | Not production reviewed | Legal content milestone |

## Missing RLS And Policy Verification Matrix

This matrix lists policy verification still needed. It does not claim every item is missing from migrations; it identifies missing proof through automated or manual regression checks.

| Table/Resource | Current Evidence | Verification Gap | Severity | Test Needed |
| --- | --- | --- | --- | --- |
| `profiles` | RLS policies exist | Student cannot read another private profile except allowed public/admin cases | High | Student A vs Student B read/write tests |
| `student_profiles` | RLS policies exist | Employer visibility must respect privacy fields and application relationship | High | Student, unrelated employer, related employer, admin tests |
| `employer_profiles` | RLS policies exist | Student and unrelated employer reads/writes need proof | Medium | Cross-role denial tests |
| `companies` | Owner/admin policies exist | Employer cannot modify another company | High | Employer A vs Employer B write tests |
| `internships` | Public approved reads and employer/admin policies exist | Draft/pending/rejected visibility needs proof | High | Public, student, owner employer, unrelated employer tests |
| `applications` | Student/employer/admin policies exist | Employer notes and unrelated applications need proof | Critical | Student cannot see employer-only notes; unrelated employer cannot read/update |
| `saved_internships` | Owner policies exist | Duplicate protection and approved/non-expired save constraints need proof | Medium | Save/remove as owner and non-owner tests |
| `notifications` | Owner/admin policies exist | Browser clients cannot forge notifications | High | Authenticated insert denial and owner read/update/delete tests |
| `platform_settings` | Admin policy/RPC exists | Public read through RPC vs table direct access needs proof | High | Anon/auth direct table denial and RPC allow tests |
| `admin_audit_logs` | Admin policies exist | Non-admin denial needs proof | High | Non-admin select/insert denial tests |
| `employer_access_invites` | Admin policies and validation RPC exist | Token validation should expose limited safe fields only | High | Anon token validation and admin-only list/revoke tests |
| `support_tickets` | RLS and secure RPCs exist | Public ticket creation must not expose ticket list | High | Anon create via RPC, anon select denial, admin select/update tests |
| `payment_orders` | Owner/admin select policies exist | Browser clients cannot insert/update/mark paid | Critical | Insert/update/delete denial; owner/admin select tests |
| `payment_webhook_events` | Admin select policy exists | Browser clients cannot insert webhook events | Critical | Insert/update/delete denial tests |
| `student-avatars` | Public read and owner write policies exist | Path ownership proof needed | Medium | Owner upload/update/delete, non-owner denial |
| `student-resumes` | Private bucket with authorized read policies | Resume privacy proof needed | Critical | Owner, related employer, unrelated employer, anon tests |
| `company-assets` | Public read and owner write policies exist | Company ownership proof needed | Medium | Owner upload/update/delete, non-owner denial |

## Missing Test Matrix

| Domain | Existing Coverage | Missing Coverage | Priority |
| --- | --- | --- | --- |
| Auth | Route helper tests | UI-level role mismatch, OTP flow, callback failures, suspended/deleted route tests | P0 |
| RLS | None against real DB | Multi-user policy integration tests | P0 |
| Storage | File helper validation partly covered indirectly by code | Real storage policy tests and signed URL denial tests | P0 |
| Payments | Frontend helper tests | Edge Function tests for invalid signature, duplicate webhook, failed payment, order ownership | P0 |
| Entitlements | None | Subscription activation, expiry, limits, overrides | P0/P1 |
| Notifications | API exists, limited tests | Event mapping, dedupe, preferences, delivery status | P1 |
| Student workflows | Applications and saved helpers | Onboarding, profile update, resume upload, full apply timeline | P1 |
| Employer workflows | Applicant helper tests | Internship create/edit/lifecycle, ownership denial, limits | P1 |
| Admin workflows | Audit/report helpers | Admin moderation RPC authorization, support queue, payments review | P1 |
| Accessibility | None | Auth, forms, dashboards, modals, tables | P1 |
| E2E | None | Playwright flows for auth, student, employer, admin, payments | P1 |
| Performance | None | Large listing/search pagination and query behavior | P2 |

## High-Risk Query And Function List

| File/Function | Risk | Severity | Notes |
| --- | --- | --- | --- |
| `supabase/functions/razorpay-create-order/index.ts` | Uses service role and creates payment rows | Critical | Must keep auth, role checks, safe errors, CORS restrictions |
| `supabase/functions/razorpay-verify-payment/index.ts` | Marks orders paid after signature verification | Critical | Must be idempotent and owner-bound |
| `supabase/functions/razorpay-webhook/index.ts` | Uses service role and updates payment status | Critical | Needs richer processing logs and failure visibility |
| `public.complete_student_onboarding(jsonb)` | Security definer profile writes | High | Must reject wrong/suspended/deleted users |
| `public.complete_employer_onboarding(jsonb)` | Security definer company/profile writes | High | Must preserve ownership and verification status |
| `public.update_admin_platform_settings(jsonb)` | Platform-wide settings | High | Admin-only, audited |
| Admin moderation RPCs | Company/internship/account status changes | High | Admin-only, audited, notification side effects |
| `public.create_support_ticket(jsonb)` | Anon callable RPC | High | Must validate, rate-limit, avoid abuse |
| `public.accept_employer_access_invite(text)` | Invite token flow | High | Must bind invited email and prevent reuse |
| `public.request_account_deletion()` | Account state changing RPC | High | Must prevent irreversible accidental deletes without policy clarity |
| `createApplicantResumeSignedUrl` | Sensitive resume access | Critical | Depends on application ownership and storage policy |
| `getEmployerApplicants` | Candidate data aggregation | High | Must not expose unrelated student data |
| `getAdminPaymentOrders` | Billing/admin data | High | Must be admin-only by RLS |
| `subscribeToNotifications` | Realtime user data | Medium | Monitor channel errors and scale |

## Area Audit

### Authentication Flows

Status: Strong functional coverage, needs production verification.

Implemented:
- Email/password auth.
- Student OTP/passwordless auth.
- Google OAuth for student flow.
- Role mismatch blocking and local sign-out.
- Suspended/deleted routes.
- Password reset and email verification.

Gaps:
- No E2E tests for auth flows.
- OTP and OAuth rely on Supabase dashboard configuration not verifiable from repo alone.
- CAPTCHA/abuse protection is documented but not integrated in frontend.

### Role Authorization

Status: Good frontend and database direction, incomplete regression proof.

Implemented:
- Role route guards.
- Expected-role login checks.
- RLS policies and secure RPCs in migrations.

Gaps:
- No real multi-user RLS regression suite.
- Frontend module role checks should not be treated as final authorization.

### Student Workflows

Status: Substantially implemented.

Implemented:
- Onboarding, applications, saved internships, dashboard data, profile settings, avatar/resume storage, payments and recommendations entry points.

Gaps:
- Full profile strength, timeline, resume builder/analyzer, and advanced recommendations are future work.
- Storage policy verification is required.

### Employer Workflows

Status: Substantially implemented.

Implemented:
- Signup/onboarding, company profile/assets, internship management, applicant review, status updates, interview scheduling, analytics, support, billing, invites.

Gaps:
- Professional ATS features, team access, bulk actions, saved filters, fraud detection, and entitlement-gated limits remain future work.
- Employer team authorization model does not yet exist.

### Administrator Workflows

Status: Broadly implemented, needs stronger security tests.

Implemented:
- Dashboards, moderation, support, payments, settings, reports, audit logs.

Gaps:
- Admin operations require real non-admin denial tests.
- Admin health/observability screen is not present.

### Payments And Webhooks

Status: Functional Razorpay flow, not yet full subscription system.

Implemented:
- Create order Edge Function.
- Verify payment Edge Function.
- Signed webhook processing.
- Payment order and webhook event tables.
- User/admin payment history UI.

Gaps:
- Entitlements/subscriptions not enforced.
- No refund/renewal/cancellation/grace-period model.
- Webhook logging is limited.
- CORS should be environment-restricted.

### Notifications

Status: UI and realtime API exist, event engine incomplete.

Implemented:
- Notification list, unread count, mark read/all read, delete, and realtime subscription.
- Some admin moderation notification inserts.

Gaps:
- Typed event catalogue, preferences, dedupe, delivery status, email/push/SMS channels, retries, templates, and correlation IDs are not implemented.

### Storage

Status: Buckets and frontend helper flows exist, requires policy verification.

Implemented:
- Public student avatars.
- Private student resumes with signed URLs.
- Public company assets.
- Storage path update RPCs.

Gaps:
- No storage-policy test suite.
- No malware scanning or content inspection for uploaded files.

### Database Migrations

Status: Meaningful migration set exists.

Implemented:
- Core schema.
- RLS policies.
- Storage buckets/policies.
- Employer/company review updates.
- Admin moderation/audit/notifications.
- Support tickets.
- Razorpay payments.
- Employer access invites.
- Account deletion.
- Passwordless auth hardening.

Gaps:
- Need production migration deployment procedure and rollback guidance.
- Need verification that migrations are applied in the target Supabase project.

### Edge Function Security

Status: Good secret separation, needs production hardening.

Implemented:
- Secrets are read from Deno environment variables.
- Service role key is not used in frontend.
- Payment signature verification exists.
- Webhook signature verification exists.
- Duplicate webhook event detection exists.

Gaps:
- CORS allowlist for browser-callable functions.
- Safe external error code mapping.
- Structured logs and request/correlation IDs.
- Integration tests.

### Error Handling And Logging

Status: Mixed.

Implemented:
- Auth error mapping exists.
- Many user-facing errors are safe.

Gaps:
- Several API/Edge paths can surface raw provider/database messages.
- Console logging is not structured and may not include reference IDs.
- No production observability strategy.

### Performance

Status: Acceptable for current scale, needs production review.

Implemented:
- Route-level code splitting.
- Server-side filtering exists in many queries.
- Useful indexes exist in migrations.

Gaps:
- Advanced search and large admin lists need pagination/query plans.
- Realtime subscription scale requires monitoring.
- No performance budget or bundle review policy.

### Accessibility And Responsive Design

Status: Good direction, not formally verified.

Implemented:
- Many forms include labels and semantic buttons.
- Recent auth pages are compact and mobile-friendly.

Gaps:
- No automated a11y tests.
- No documented keyboard/screen-reader checklist.
- Complex dashboards/tables need manual verification.

### Deployment Configuration

Status: Incomplete.

Implemented:
- Build/test commands.
- Auth setup guide.
- Environment validation for Supabase URL/key.

Gaps:
- No `.env.example`.
- No deployment checklist.
- No environment strategy.
- No Edge Function secret checklist.
- No backup/rollback procedure.

## Recommended First Implementation Milestone

Recommended next milestone: P0 Production Environment And Deployment Safety.

Why first:
- It reduces launch risk before adding new product complexity.
- It does not require schema changes.
- It creates the checklist needed to verify Supabase migrations, RLS, storage policies, Edge Function secrets, callback URLs, OAuth settings, Razorpay credentials, CORS, and rollback procedures.

Expected deliverables:
- `docs/ENVIRONMENT_STRATEGY.md`
- `docs/DEPLOYMENT_CHECKLIST.md`
- `.env.example` with safe placeholder names only

Do not proceed to feature-heavy milestones until this baseline exists.


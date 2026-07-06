# InternNext Pro Advanced Roadmap

Date: 2026-06-25

## Purpose

This roadmap turns the Phase 0 audit into small, reviewable production milestones. It intentionally avoids one large uncontrolled rewrite. Each milestone should follow the approval gate from the master plan before editing:

1. Analyze current implementation.
2. Reuse existing code.
3. List exact files to modify and create.
4. Identify database, migration, RLS, Storage, and Edge Function impact.
5. Identify security risks.
6. Define acceptance criteria.
7. Define automated tests and manual tests.
8. Wait for approval.

## Priority Key

- P0: production blockers
- P1: core product improvements
- P2: differentiation
- P3: future expansion

## Effort Key

- S: 0.5 to 1 day
- M: 2 to 4 days
- L: 1 to 2 weeks
- XL: multi-week

## Risk Key

- Low: mostly docs/UI/tests, small blast radius
- Medium: touches shared frontend/API behavior
- High: touches security, database policies, payments, or private data
- Critical: high-impact production security or money movement

## Roadmap Summary

| Order | Priority | Milestone | Effort | Risk | Business Value | Depends On |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | Production environment and deployment safety | M | Medium | High | Phase 0 audit |
| 2 | P0 | Supabase RLS, RPC, Storage verification suite | L | Critical | High | Milestone 1 |
| 3 | P0 | Edge Function payment hardening | M | Critical | High | Milestone 1 |
| 4 | P0 | Safe error handling and observability baseline | M | High | High | Milestones 1, 3 |
| 5 | P1 | Subscription and entitlement foundation | L | Critical | High | Milestones 2, 3 |
| 6 | P1 | Employer entitlement enforcement | L | High | High | Milestone 5 |
| 7 | P1 | Notification event engine foundation | L | High | High | Milestones 2, 4 |
| 8 | P1 | Notification preferences and delivery status | L | High | Medium | Milestone 7 |
| 9 | P1 | Automated test expansion phase 1 | L | Medium | High | Milestones 2-4 |
| 10 | P1 | Playwright E2E smoke flows | L | Medium | High | Milestone 9 |
| 11 | P1 | Advanced internship search foundation | L | Medium | High | Milestones 2, 9 |
| 12 | P1 | Application timeline foundation | L | High | High | Milestones 7, 9 |
| 13 | P1 | Employer ATS foundation | XL | High | High | Milestones 6, 12 |
| 14 | P1 | Company and employer verification | L | High | High | Milestones 2, 7 |
| 15 | P1 | Legal, privacy, and compliance pages | M | Medium | High | Milestone 1 |
| 16 | P2 | Transparent recommendation engine | L | Medium | Medium | Milestone 11 |
| 17 | P2 | Student profile strength and career profile | L | Medium | Medium | Milestones 11, 16 |
| 18 | P2 | Calendar and interview management | XL | High | Medium | Milestones 7, 12, 13 |
| 19 | P2 | Resume builder and analyzer | XL | High | Medium | Milestone 17 |
| 20 | P2 | Monitoring/admin health screen | L | High | High | Milestone 4 |
| 21 | P2 | Product analytics | L | Medium | Medium | Milestones 1, 15 |
| 22 | P3 | Skills assessments | XL | High | Medium | Milestones 12, 13 |
| 23 | P3 | Secure student-employer messaging | XL | High | Medium | Milestones 7, 12, 13 |
| 24 | P3 | PWA and push notifications | L | Medium | Medium | Milestones 7, 8 |
| 25 | P3 | Gradual TypeScript migration | XL | Medium | Medium | Stable P0/P1 base |
| 26 | P3 | College and placement-cell portal | XL | Critical | Future | Stable role model |
| 27 | P3 | AI-assisted features | XL | Critical | Future | Security, consent, privacy, test base |

## Milestone Details

### 1. P0 - Production Environment And Deployment Safety

Goal:
Create a verified environment and deployment strategy before additional production features.

Deliverables:
- `docs/ENVIRONMENT_STRATEGY.md`
- `docs/DEPLOYMENT_CHECKLIST.md`
- `.env.example` with safe placeholder names only

Key tasks:
- Define development, staging, and production environment separation.
- Document Supabase project separation or isolation.
- Document Razorpay test/production separation.
- Document callback URL, OAuth redirect, webhook URL, and CORS requirements.
- Document Edge Function secret checklist.
- Document storage bucket verification.
- Document migration deployment and rollback procedure.
- Document backup verification.

Dependencies:
- Phase 0 audit.

Risk:
- Medium. Documentation and safe placeholder file only.

Business value:
- High. Reduces launch risk and prevents secret/environment mixups.

Acceptance:
- No real secrets.
- No `.env` modification.
- `npm run build` passes.
- `npm run test -- --run` passes.

### 2. P0 - Supabase RLS, RPC, Storage Verification Suite

Goal:
Prove authorization boundaries with repeatable tests and manual verification.

Deliverables:
- RLS verification documentation.
- Supabase test fixture plan.
- Policy test scripts or documented manual SQL verification.
- Storage access verification matrix.

Key tasks:
- Test student vs student private data.
- Test employer vs unrelated employer data.
- Test public vs private internships.
- Test application visibility and employer notes.
- Test payment row insert/update denial.
- Test notification forging denial.
- Test admin-only RPC denial.
- Test resume storage access.

Dependencies:
- Milestone 1.

Risk:
- Critical. Touches production security assumptions.

Business value:
- High. Proves privacy and authorization.

Acceptance:
- Unauthorized reads/writes are denied.
- Authorized reads/writes succeed.
- Storage policies are verified.
- RLS remains enabled.

### 3. P0 - Edge Function Payment Hardening

Goal:
Make Razorpay Edge Functions safer for production.

Deliverables:
- Safe error response mapping.
- Environment-specific CORS allowlist.
- Structured response codes.
- Webhook processing status improvements, if schema is approved.
- Edge Function tests or documented local test procedure.

Key tasks:
- Replace raw `error.message` responses with safe error codes.
- Restrict browser-callable function origins.
- Preserve webhook signature verification.
- Preserve duplicate-event protection.
- Improve webhook event status logging.

Dependencies:
- Milestone 1.

Risk:
- Critical. Affects payment flow.

Business value:
- High. Protects revenue and trust.

Acceptance:
- Valid payment flow still works.
- Invalid signatures fail safely.
- Duplicate webhooks are idempotent.
- No secrets or raw stack traces are returned.

### 4. P0 - Safe Error Handling And Observability Baseline

Goal:
Create consistent safe user-facing errors and structured operational diagnostics.

Deliverables:
- Shared safe error utilities by domain.
- Reference ID pattern for user-facing critical errors.
- Logging guidance for frontend and Edge Functions.
- Production observability checklist.

Key tasks:
- Normalize Supabase, Edge Function, and payment errors.
- Avoid displaying SQL/provider internals.
- Define safe structured log fields.
- Document what must never be logged.

Dependencies:
- Milestones 1 and 3.

Risk:
- High. Changes shared error behavior.

Business value:
- High. Improves support and reduces information leakage.

Acceptance:
- User-facing errors are safe.
- Internal details are not exposed.
- Build and tests pass.

### 5. P1 - Subscription And Entitlement Foundation

Goal:
Turn recorded payments into verified subscription state.

Possible data models:
- `subscription_plans`
- `plan_features`
- `subscriptions`
- `subscription_entitlements`
- `billing_invoices`
- `payment_refunds`
- `entitlement_overrides`

Key tasks:
- Model plans and active subscriptions.
- Activate entitlement only after server-side verification.
- Add expiry, grace period, cancellation, upgrade, downgrade, and failed-payment states.
- Add admin override with audit log.

Dependencies:
- Milestones 2 and 3.

Risk:
- Critical. Money and authorization.

Business value:
- High. Enables paid business model.

Acceptance:
- Frontend cannot forge entitlement.
- Expired/unpaid states are enforced server-side.
- Admin overrides are audited.

### 6. P1 - Employer Entitlement Enforcement

Goal:
Enforce paid employer limits in product workflows.

Key limits:
- Active internship limit
- Monthly posting limit
- Applicant-view limit
- Resume-download limit
- Team-member limit
- Analytics access
- Featured-listing access
- Support priority

Dependencies:
- Milestone 5.

Risk:
- High.

Business value:
- High.

Acceptance:
- Limits are enforced by trusted backend/RPC/database logic.
- UI shows clear usage indicators.
- Limit reached states are safe and actionable.

### 7. P1 - Notification Event Engine Foundation

Goal:
Move from notification table UI to typed event-driven notifications.

Key tasks:
- Add typed event catalogue.
- Add event creation helper/RPC.
- Add dedupe keys and correlation IDs.
- Create notifications for application, interview, approval, payment, and support events.

Dependencies:
- Milestones 2 and 4.

Risk:
- High.

Business value:
- High.

Acceptance:
- Critical workflow events create notifications reliably.
- Duplicate events are prevented.
- Failed notification creation is logged safely.

### 8. P1 - Notification Preferences And Delivery Status

Goal:
Add user preferences and reliable delivery tracking.

Key tasks:
- Add notification preferences.
- Add channel preferences and quiet hours.
- Add delivery status and retry metadata.
- Preserve mandatory security notifications where appropriate.

Dependencies:
- Milestone 7.

Risk:
- High.

Business value:
- Medium.

Acceptance:
- Users can manage preferences.
- Critical notifications remain protected.
- Delivery failures are visible to admins.

### 9. P1 - Automated Test Expansion Phase 1

Goal:
Expand unit and integration coverage around the most sensitive existing workflows.

Key tasks:
- Add tests for validation schemas.
- Add tests for auth mismatch helpers.
- Add tests for employer internship lifecycle.
- Add tests for storage helper validation.
- Add tests for admin moderation helpers.
- Add tests for notification API helpers.

Dependencies:
- Milestones 2 through 4.

Risk:
- Medium.

Business value:
- High.

Acceptance:
- Existing tests remain green.
- New tests cover meaningful risk.

### 10. P1 - Playwright E2E Smoke Flows

Goal:
Add end-to-end confidence for critical user journeys.

Key flows:
- Student signup/login
- Employer login
- Role mismatch
- Password reset
- Student apply/save/withdraw
- Employer post/review/schedule
- Admin moderation/settings/support
- Payment happy/failure path with test mode

Dependencies:
- Milestone 9.

Risk:
- Medium.

Business value:
- High.

Acceptance:
- E2E tests run only against safe test/staging data.
- No destructive production tests.

### 11. P1 - Advanced Internship Search Foundation

Goal:
Add production-grade server-side internship discovery.

Key tasks:
- Keyword, skill, location, work mode, stipend, duration, start date, industry, verified company, deadline filters.
- Server-side pagination.
- URL-synced filters.
- Empty/error/loading states.
- Query and index review.

Dependencies:
- Milestones 2 and 9.

Risk:
- Medium.

Business value:
- High.

Acceptance:
- No full-table browser loading.
- Back button and sharable URLs work.

### 12. P1 - Application Timeline Foundation

Goal:
Create historical application lifecycle tracking.

Key tasks:
- Add timeline event model.
- Validate status transitions.
- Hide employer internal notes from students.
- Create notification events on key transitions.
- Audit admin interventions.

Dependencies:
- Milestones 7 and 9.

Risk:
- High.

Business value:
- High.

Acceptance:
- Historical events cannot be overwritten casually.
- Students see safe public notes only.

### 13. P1 - Employer ATS Foundation

Goal:
Upgrade applicant management to a professional applicant tracking workflow.

Key tasks:
- Pipeline stages.
- Table and Kanban views.
- Candidate tags, ratings, internal notes.
- Bulk actions with auditing.
- Resume preview and candidate comparison.

Dependencies:
- Milestones 6 and 12.

Risk:
- High.

Business value:
- High.

Acceptance:
- Candidate data is visible only to authorized company users.
- Internal notes are never visible to students.

### 14. P1 - Company And Employer Verification

Goal:
Improve trust, verification, and fraud-prevention workflows.

Key tasks:
- Verification levels.
- Document review.
- Admin approve/reject/request changes.
- Fraud signal queue.
- Audit every action.

Dependencies:
- Milestones 2 and 7.

Risk:
- High.

Business value:
- High.

Acceptance:
- Verification decisions are auditable.
- Risk indicators are explainable and not accusatory.

### 15. P1 - Legal, Privacy, And Compliance Pages

Goal:
Replace placeholder public/legal content with production-ready structure.

Required pages:
- Terms of Service
- Privacy Policy
- Cookie Policy
- Refund and Cancellation Policy
- Employer Terms
- Student Safety Guidelines
- Community Guidelines
- Data Deletion Policy
- Grievance and Support Information
- Acceptable Use Policy

Dependencies:
- Milestone 1.

Risk:
- Medium.

Business value:
- High.

Acceptance:
- Pages are complete enough for legal review.
- Content is marked as requiring professional legal review before launch.

### 16. P2 - Transparent Recommendation Engine

Goal:
Build explainable recommendations before AI ranking.

Key tasks:
- Skills, location, work mode, availability, stipend, duration, profile completeness signals.
- Match score.
- Explanation and missing skills.
- Feedback and hide recommendation.

Dependencies:
- Milestone 11.

Risk:
- Medium.

Business value:
- Medium.

Acceptance:
- Recommendations do not include expired/ineligible internships.
- Score does not guarantee selection.

### 17. P2 - Student Profile Strength And Career Profile

Goal:
Make the student profile more useful and transparent.

Key tasks:
- Projects, experience, certifications, achievements, languages, career interests.
- Completeness score.
- Missing sections and next action.
- Privacy controls.

Dependencies:
- Milestones 11 and 16.

Risk:
- Medium.

Business value:
- Medium.

Acceptance:
- Profile strength is transparent and non-manipulative.
- Privacy controls are enforced.

### 18. P2 - Calendar And Interview Management

Goal:
Move interview scheduling toward calendar-grade reliability.

Key tasks:
- Student/employer availability.
- Time zones.
- Rescheduling/cancellation.
- Confirmation/reminders.
- Feedback/scorecards.
- Prepare for Google/Outlook integration.

Dependencies:
- Milestones 7, 12, and 13.

Risk:
- High.

Business value:
- Medium.

Acceptance:
- Time-zone behavior is tested.
- External calendar secrets are never stored in frontend.

### 19. P2 - Resume Builder And Analyzer

Goal:
Add resume creation and feedback tools while preserving privacy.

Key tasks:
- Templates.
- Live preview.
- PDF export.
- Drafts and versions.
- ATS-friendly checks.
- Resume analysis without false guarantees.

Dependencies:
- Milestone 17.

Risk:
- High.

Business value:
- Medium.

Acceptance:
- User documents remain private.
- No external AI processing without consent and documented privacy handling.

### 20. P2 - Monitoring And Admin Health Screen

Goal:
Provide operational visibility.

Key tasks:
- Edge Function failure summaries.
- Failed webhook summaries.
- Notification delivery failures.
- Database/storage/payment status indicators.
- Error trends.

Dependencies:
- Milestone 4.

Risk:
- High.

Business value:
- High.

Acceptance:
- Admin health screen exposes safe operational data only.
- No secrets or sensitive infrastructure details.

### 21. P2 - Product Analytics

Goal:
Add privacy-respecting product analytics.

Key tasks:
- Consent-aware tracking.
- Signup/onboarding/search/application/payment funnel events.
- No sensitive fields.
- Event schema docs.
- Retention policy.

Dependencies:
- Milestones 1 and 15.

Risk:
- Medium.

Business value:
- Medium.

Acceptance:
- No OTP/password/private document tracking.
- Analytics respect consent.

### 22. P3 - Skills Assessments

Goal:
Build assessment workflows after ATS and application timelines stabilize.

Key tasks:
- MCQ, written, file submission, coding, manual grading.
- Question banks.
- Time/attempt limits.
- Audit trail.

Dependencies:
- Milestones 12 and 13.

Risk:
- High.

Business value:
- Medium.

Acceptance:
- Untrusted code is never executed in the frontend or primary app server.

### 23. P3 - Secure Student-Employer Messaging

Goal:
Add relationship-gated messaging.

Key tasks:
- Conversations, messages, read status, attachments, reporting, blocking, archive, search.
- Message retention and abuse reporting.

Dependencies:
- Milestones 7, 12, and 13.

Risk:
- High.

Business value:
- Medium.

Acceptance:
- Messaging exists only after eligible relationship.
- Private emails/phones are not revealed automatically.

### 24. P3 - PWA And Push Notifications

Goal:
Improve mobile and notification reach.

Key tasks:
- Manifest.
- Service worker.
- Offline shell.
- Push notifications.
- Network status.

Dependencies:
- Milestones 7 and 8.

Risk:
- Medium.

Business value:
- Medium.

Acceptance:
- No tokens, resumes, admin data, or sensitive employer information are cached.

### 25. P3 - Gradual TypeScript Migration

Goal:
Increase type safety without a rewrite.

Priority order:
1. Auth helpers
2. Role and permission models
3. Payment modules
4. Subscription and entitlement modules
5. Application status logic
6. Notification event types
7. Supabase response types
8. Edge Function request/response types

Dependencies:
- Stable P0/P1 base.

Risk:
- Medium.

Business value:
- Medium.

Acceptance:
- One domain at a time.
- No broad app rewrite.

### 26. P3 - College And Placement-Cell Portal

Goal:
Add institutional workflows after role model stability.

Key tasks:
- College role.
- TPO/coordinator role.
- Student batch management.
- Bulk imports.
- Campus drives.
- Placement analytics.

Dependencies:
- Stable role model and authorization tests.

Risk:
- Critical.

Business value:
- Future expansion.

Acceptance:
- College staff can access only authorized students.
- Student consent and visibility are respected.

### 27. P3 - AI-Assisted Features

Goal:
Add AI only after security, payments, notifications, and testing are stable.

Potential features:
- Resume feedback.
- Cover-letter draft.
- Skill-gap analysis.
- Internship-match explanation.
- Candidate summary.
- Internship-description improvement.

Dependencies:
- Security, privacy, consent, observability, and test foundations.

Risk:
- Critical.

Business value:
- Future differentiation.

Acceptance:
- Human review for hiring decisions.
- No automatic rejection solely from AI.
- User consent and data minimization.
- Prompt-injection and sensitive-data handling.

## Recommended First Implementation Milestone

Start with Milestone 1: P0 Production Environment And Deployment Safety.

Reason:
- It creates the operational guardrails required before running destructive migrations, testing real RLS policies, deploying Edge Functions, or adding subscription logic.
- It is low implementation risk because it is documentation plus `.env.example` placeholders.
- It directly addresses the top Critical finding from the audit.

Suggested acceptance criteria for Milestone 1:
- `docs/ENVIRONMENT_STRATEGY.md` exists and covers development, staging, and production.
- `docs/DEPLOYMENT_CHECKLIST.md` exists and covers Supabase, Razorpay, OAuth, callbacks, webhooks, CORS, storage, migrations, backups, rollback, and Edge Function secrets.
- `.env.example` exists with variable names and safe placeholders only.
- No real `.env` values are printed or modified.
- `npm run test -- --run` passes.
- `npm run build` passes.


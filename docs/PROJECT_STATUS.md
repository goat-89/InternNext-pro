# InternNext Pro Project Status

## Project Architecture

InternNext Pro is a Vite + React + Supabase internship management platform with role-separated student, employer, and administrator workflows.

- Entry point: `src/main.jsx`
- Router: `src/App.jsx`
- Authentication state: `src/context/AuthContext.jsx`
- Platform settings state: `src/context/PlatformSettingsContext.jsx`
- App UI state for theme and saved internships: `src/context/AppContext.jsx`
- Shared Supabase client: `src/lib/supabase.js`
- API modules: `src/lib`
- Public layout and dashboard shell: `src/components/Layout.jsx`

Current provider hierarchy is:

```text
BrowserRouter
  AuthProvider
    PlatformSettingsProvider
      AppProvider
        MaintenanceGate
          App
      Toaster
```

`AppProvider` is mounted around the application inside `PlatformSettingsProvider`, so public pages, saved-internship controls, and theme state can use `useApp()` safely.

## Completed Features

- Supabase client is centralized in `src/lib/supabase.js`.
- Supabase Auth uses PKCE, persisted sessions, automatic refresh, and URL session detection.
- Auth context loads and verifies the current user with `supabase.auth.getUser()`.
- Student and employer signup forms use React Hook Form and Zod validation.
- Login supports expected role checks for student, employer, and admin login routes.
- Email verification resend flow exists.
- Password reset request and password update flows exist.
- Student onboarding calls `complete_student_onboarding`.
- Employer onboarding calls `complete_employer_onboarding`.
- Public internship listing/detail queries approved, non-expired internships.
- Student applications support apply, list, withdraw, and delete withdrawn application.
- Saved internships API supports list, save, unsave, and saved-state lookup.
- Employer dashboard, listings, post internship, edit internship, lifecycle actions, analytics, applicants, application status updates, and interview scheduling are substantially implemented.
- Admin dashboard, student management, company review, internship review, audit logs, reports, and platform settings screens exist.
- Notifications support list, unread count, mark read, mark all read, delete, and realtime subscriptions.
- Maintenance mode and public internship browsing gates are implemented through platform settings.
- Core Supabase schema, RLS, secure RPCs, storage buckets, and storage policies are tracked in `supabase/migrations`.
- Razorpay order creation, Checkout verification, payment history, admin payment review, and signed webhook processing are implemented through Supabase Edge Functions and payment migrations.
- Contact and employer support forms create persistent support tickets, with an admin support queue for ticket review and status updates.
- Employer access invite creation, validation, acceptance, and revocation are implemented, including the `/employer-access/:token` route.
- Student and employer account deletion requests are implemented through a secure RPC and deleted-account route handling.
- Route-level code splitting is implemented for major public, auth, student, employer, and admin routes.
- Automated tests exist for formatting and auth-route behavior.
- Public, pricing, and dashboard pages no longer depend on `src/data/mockData.js` for production-routed flows.
- Development, staging, and production environment separation is documented.
- A deployment checklist covers callbacks, migrations, RLS, Storage, Edge Functions, Razorpay, notification scheduling, backups, smoke tests, and rollback.
- Public startup configuration is validated centrally, and `.env.example` contains names and safe placeholders only.
- Paid subscriptions and employer entitlements are activated from verified Razorpay payments and enforced server-side.
- Notification events, preferences, delivery jobs, retries, provider settings, monitoring, retention, scheduling, and digest delivery are implemented.
- Repeatable catalog and behavior verification covers core RLS, RPC, role, payment, subscription, notification, and Storage authorization boundaries.
- Application private notes and owner writes are hardened against cross-role and suspended-account access.
- Razorpay browser functions enforce environment-specific origin allowlists and return safe structured errors with request reference IDs.
- Razorpay webhook parsing, signature verification, and duplicate-event races are hardened without exposing database or provider errors.
- Authenticated frontend failures use safe reference IDs and privacy-limited, rate-limited operational event reporting.
- Administrators have a system health screen for operational events, payment failures, webhook failures, notification jobs, and worker status.
- Playwright smoke coverage exists for public routes, authentication surfaces, protected routes, role separation, administrator health, billing access, and responsive layouts.
- Structured terms, privacy, cookies, refunds, employer terms, student safety, community, deletion, grievance, and acceptable-use pages are implemented.
- Public help search, career and employer resources, configured contact details, and working footer navigation are implemented.
- A public privacy-safe health probe, administrator-managed operational-event retention, cleanup previews, audited cleanup, and `pg_cron` scheduling support are implemented.

## Partially Implemented Features

- Legal drafts require professional review, final operator details, approved contacts, and effective dates before public launch.
- Student and employer profile/storage flows are implemented, but production deployment still depends on applying the storage migrations and verifying bucket policies in Supabase.
- Production authorization verification must still be run against staging and the read-only catalog check run against production before launch.
- External frontend/health monitors and alert destinations must still be configured and tested separately for staging and production.

## Missing Features

- Expanded automated test coverage for critical student, employer, admin, payment, and support workflows.
- Production provisioning of external uptime monitors and incident alert routing.
- Professional legal approval and final operator configuration for public legal documents.

## Known Bugs

- Legal drafts must not be treated as approved legal advice until professional review is recorded.
- Test coverage is still narrow relative to the size of the platform.


## Expected Supabase Tables

### `profiles`

Expected columns:

- `id`
- `email`
- `full_name`
- `phone`
- `avatar_path`
- `role`
- `account_status`
- `email_verified`
- `onboarding_completed`
- `created_at`
- `updated_at`

Relationships:

- `id` references `auth.users.id`.

### `student_profiles`

Expected columns:

- `user_id`
- `college`
- `university`
- `degree`
- `specialization`
- `passing_year`
- `bio`
- `skills`
- `preferred_categories`
- `preferred_locations`
- `preferred_work_modes`
- `available_immediately`
- `portfolio_url`
- `github_url`
- `linkedin_url`
- `primary_resume_path`
- `created_at`
- `updated_at`

Relationships:

- `user_id` references `profiles.id`.

### `employer_profiles`

Expected columns:

- `user_id`
- `designation`
- `department`
- `linkedin_url`
- `created_at`
- `updated_at`

Relationships:

- `user_id` references `profiles.id`.

### `companies`

Expected columns:

- `id`
- `owner_id`
- `name`
- `slug`
- `legal_name`
- `description`
- `industry`
- `company_type`
- `company_size`
- `founded_year`
- `website`
- `business_email`
- `phone`
- `headquarters`
- `gst_number`
- `registration_number`
- `logo_path`
- `cover_path`
- `status`
- `rejection_reason`
- `verified_at`
- `created_at`
- `updated_at`

Relationships:

- `owner_id` references `profiles.id`.

### `internships`

Expected columns:

- `id`
- `employer_id`
- `company_id`
- `title`
- `department`
- `category`
- `location`
- `work_mode`
- `experience_level`
- `duration_months`
- `compensation_type`
- `stipend_min`
- `stipend_max`
- `currency`
- `stipend_period`
- `openings`
- `skills_required`
- `preferred_skills`
- `description`
- `responsibilities`
- `eligibility`
- `perks`
- `screening_steps`
- `start_date`
- `deadline`
- `status`
- `featured`
- `featured_until`
- `rejection_reason`
- `published_at`
- `created_at`
- `updated_at`

Relationships:

- `employer_id` references `profiles.id`.
- `company_id` references `companies.id`.

### `applications`

Expected columns:

- `id`
- `internship_id`
- `student_id`
- `resume_path`
- `cover_letter`
- `screening_answers`
- `status`
- `interview_at`
- `interview_mode`
- `interview_location`
- `meeting_link`
- `interview_notes`
- `employer_notes`
- `rejection_reason`
- `created_at`
- `updated_at`

Relationships:

- `internship_id` references `internships.id`.
- `student_id` references `profiles.id`.
- Unique constraint expected on `(student_id, internship_id)`.

### `saved_internships`

Expected columns:

- `student_id`
- `internship_id`
- `created_at`

Relationships:

- `student_id` references `profiles.id`.
- `internship_id` references `internships.id`.
- Unique constraint expected on `(student_id, internship_id)`.

### `notifications`

Expected columns:

- `id`
- `user_id`
- `title`
- `message`
- `link`
- `read_at`
- `created_at`

Relationships:

- `user_id` references `profiles.id`.

### `platform_settings`

Expected columns:

- `id`
- `platform_name`
- `support_email`
- `maintenance_mode`
- `allow_student_registration`
- `allow_employer_registration`
- `require_company_approval`
- `require_internship_approval`
- `allow_public_internship_browsing`
- `application_withdrawal_enabled`
- `default_report_days`
- `max_active_internships_per_employer`
- `updated_at`
- `updated_by`

### `admin_audit_logs`

Expected columns:

- `id`
- `admin_user_id`
- `entity_type`
- `entity_id`
- `action`
- `old_values`
- `new_values`
- `created_at`

Relationships:

- `admin_user_id` references `profiles.id`.

### `employer_access_invites`

Expected columns inferred from API usage:

- `id`
- `invited_email`
- `company_name`
- `access_path`
- `token`
- `expires_at`
- `used_at`
- `revoked_at`
- `created_at`
- `status`

### `support_tickets`

Expected columns:

- `id`
- `requester_user_id`
- `full_name`
- `email`
- `phone`
- `category`
- `subject`
- `message`
- `status`
- `admin_notes`
- `resolved_at`
- `created_at`
- `updated_at`

Relationships:

- `requester_user_id` references `profiles.id`.

### `payment_orders`

Expected columns:

- `id`
- `user_id`
- `plan_key`
- `plan_name`
- `role_scope`
- `amount`
- `currency`
- `receipt`
- `razorpay_order_id`
- `razorpay_payment_id`
- `status`
- `failure_reason`
- `billing_name`
- `billing_email`
- `billing_phone`
- `billing_gst_number`
- `metadata`
- `created_at`
- `updated_at`
- `paid_at`

Relationships:

- `user_id` references `profiles.id`.

### `payment_webhook_events`

Expected columns:

- `id`
- `razorpay_event_id`
- `event_type`
- `payload`
- `processed_at`
- `created_at`

### `operational_events`

Expected columns:

- `id`
- `source`
- `event_type`
- `severity`
- `code`
- `request_id`
- `correlation_id`
- `user_id`
- `route`
- `safe_message`
- `metadata`
- `status`
- `occurred_at`
- `resolved_at`
- `resolved_by`
- `created_at`

### `operational_event_retention_settings`

Expected columns:

- `id`
- `enabled`
- `resolved_event_days`
- `ignored_event_days`
- `open_noncritical_event_days`
- `updated_at`
- `updated_by`

## Expected Storage Buckets

- `student-avatars`: public student avatar images.
- `student-resumes`: private student resume PDFs, accessed through signed URLs.
- `company-assets`: public company logo and cover images.

## Security Concerns

- Frontend route guards are not sufficient authorization. Every role-specific operation must be enforced by RLS or secure RPCs.
- Admin screens directly update sensitive tables; RLS must restrict those writes to admin profiles.
- Employer applicant queries must only expose applications for internships owned by that employer.
- Student application and saved-internship writes must only affect the authenticated student's own rows.
- Resume signed URLs must only be issued to the owning student, authorized employer, or authorized admin.
- Public internship reads should expose only approved, published, non-expired internships.
- Platform settings updates must be admin-only.
- Registration settings must be enforced server-side, not only in the frontend.
- Storage object paths should be constrained by authenticated user id or company ownership.
- No service-role or secret key should ever be used in frontend code.

## Prioritized Implementation Roadmap

1. Obtain professional legal approval and configure final operator and grievance details.
2. Configure staging and production uptime monitors and verify failure/recovery alert routing.
3. Expand Playwright coverage into mutation workflows with disposable staging fixtures.

## Acceptance Criteria For Highest-Priority Unfinished Feature

Highest-priority unfinished feature: professional legal approval and final
operator configuration.

Acceptance criteria:

- A qualified professional approves every public legal document.
- The legal entity, registered office, grievance officer, and monitored contact
  channels are published.
- Effective dates, versions, retention periods, cookie behavior, billing terms,
  and dispute handling are approved and recorded.
- `docs/LEGAL_REVIEW_CHECKLIST.md` and the legal items in
  `docs/DEPLOYMENT_CHECKLIST.md` are complete.

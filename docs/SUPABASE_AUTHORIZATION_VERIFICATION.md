# Supabase Authorization Verification

This package verifies database authorization independently of React route
guards. Run the catalog test in any environment. Run the behavior test only in
a dedicated development or staging Supabase project.

## Files

- `supabase/tests/authorization_catalog_verification.sql`
- `supabase/tests/authorization_behavior_verification.sql`
- `supabase/migrations/202606270001_authorization_verification_hardening.sql`

## Required Order

1. Back up the target database.
2. Apply all repository migrations through
   `202606270001_authorization_verification_hardening.sql`.
3. Run the catalog verification.
4. In staging only, run the behavior verification.
5. Confirm the final result and inspect Supabase logs for unexpected errors.

Open each SQL file locally and execute its SQL contents in the Supabase SQL
Editor. Do not paste a filename or CLI command into the SQL Editor.

## Catalog Verification

The catalog verifier is read-only. It checks:

- RLS is enabled on core, support, payment, subscription, and notification tables.
- Required ownership and administrator policies exist.
- Required Storage buckets exist.
- `authenticated` cannot directly select `applications.employer_notes`.
- Browser clients cannot write payment orders or subscriptions.

Success emits:

```text
Authorization catalog verification passed.
```

## Behavior Verification

The behavior verifier creates synthetic auth users, companies, internships,
applications, and Storage metadata inside a transaction. It impersonates:

- `anon`
- two unrelated students
- two unrelated employers
- a suspended student
- an administrator

It verifies public visibility, private profile isolation, application ownership,
private employer notes, valid withdrawal behavior, employer applicant access,
resume authorization, administrator RPC denial, record-forging denial, and
suspended-account denial.

The script ends with `rollback`, so fixtures are not retained. If any assertion
fails, the transaction aborts; run `rollback;` once before retrying.

Success returns:

```text
Authorization behavior verification passed.
```

## Security Rules Added

- Application private notes require an authorized secure RPC.
- Students may only withdraw eligible applications.
- Employers may update only applications belonging to their internships.
- Student-submitted application fields cannot be overwritten by employers.
- Suspended owners cannot update protected profile, company, internship,
  application, notification, saved-internship, or Storage rows.
- Administrator and service operations retain their required access.

## Rollback

Do not remove the hardening migration after production use. If it causes a
workflow regression, stop the affected write path and deploy a reviewed forward
migration that restores only the required permission. Never disable RLS as a
rollback.

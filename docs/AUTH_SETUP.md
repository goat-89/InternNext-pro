# InternNext Pro Auth Setup

This guide configures Supabase Auth for student passwordless authentication. Do not store provider secrets in React, Vite variables, or the repository.

## Email OTP

1. Open Supabase Dashboard -> Authentication -> Providers -> Email.
2. Enable Email provider.
3. Enable email OTP/sign-in with OTP.
4. Update the email template so the message includes the Supabase numeric token variable, for example `{{ .Token }}`.
5. Keep magic links enabled only if the product requires them; the student UI verifies the numeric token with `verifyOtp`.
6. Add the local and production callback URLs in Authentication -> URL Configuration:
   - `http://localhost:5173/auth/callback`
   - `https://your-production-domain/auth/callback`
7. Add wildcard callback variants only if needed for safe `next` query parameters.

## Phone OTP

1. Open Authentication -> Providers -> Phone.
2. Enable Phone provider.
3. Configure an SMS provider supported by your Supabase project.
4. Test India numbers with E.164 format, for example `+91XXXXXXXXXX`.
5. Review SMS rate limits before launch.
6. For India production delivery, complete any required TRAI-DLT sender/template registration with your SMS provider.

## WhatsApp OTP

1. Enable WhatsApp delivery only when your Supabase project/provider supports it.
2. Configure Twilio or Twilio Verify in Supabase Dashboard.
3. Keep Twilio Account SID, Auth Token, Verify Service SID, and WhatsApp sender configuration only in Supabase/provider settings.
4. Set the public frontend flag `VITE_ENABLE_WHATSAPP_OTP=true` only after the provider is configured. Do not store provider secrets in this variable.
5. The frontend calls `signInWithOtp` with `options.channel = "whatsapp"` and does not fake delivery.
6. If WhatsApp is not configured, students should use SMS or email OTP.

## Role-Separated Login

1. Employer password login must call the existing password auth flow with `expectedRole: "employer"`.
2. Student password login must verify the trusted profile role before opening student pages.
3. Student passwordless login must reject non-student profiles after OTP/OAuth verification and sign out the local session.
4. Student credentials must not complete employer login.
5. Employer credentials must not complete student login.
6. User-facing role mismatch errors should not expose sensitive account details.
7. Final authorization must still be enforced by trusted `profiles.role`, RLS policies, and secure RPCs.

## Administrator MFA And Secure Access

1. Keep operational access on an unlisted route and do not add it to public navigation, signup pages, or role selectors.
2. Create administrator accounts outside public signup.
3. Verify administrator status from trusted profile data, not editable frontend state.
4. Enable Supabase MFA/TOTP for administrator accounts if available in the target project.
5. Do not generate fake admin OTP codes in React.
6. Keep admin role enforcement in RLS and secure backend/RPC logic.

## Google OAuth

1. Create a Google Cloud OAuth Web Client.
2. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://your-production-domain`
3. Add the Supabase Auth callback URL from Supabase Dashboard -> Authentication -> Providers -> Google.
4. Enable Google provider in Supabase.
5. Enter the Google Client ID and Client Secret only in Supabase Dashboard.
6. Add application callback URLs in Supabase URL Configuration.

## Site URLs

Set the Supabase Site URL for the active environment:

- Local: `http://localhost:5173`
- Production: `https://your-production-domain`

Add allowed redirect URLs for:

- `/auth/callback`
- `/reset-password`

## CAPTCHA And Abuse Protection

1. Enable CAPTCHA in Supabase Auth for production.
2. Add the public CAPTCHA site key only if the frontend is updated to pass CAPTCHA tokens.
3. Keep CAPTCHA secret keys outside the frontend.
4. Review OTP resend and verification rate limits.

## Database And RLS Checks

1. Apply all migrations in `supabase/migrations`.
2. Confirm `profiles.email` allows `NULL` for phone-only users.
3. Confirm `handle_new_auth_user()` never accepts `admin` from public signup metadata.
4. Confirm RLS remains enabled on `profiles`, `student_profiles`, `employer_profiles`, `applications`, and `saved_internships`.
5. Confirm profile role checks are enforced by RLS/RPCs and not only by React routes.

## Manual Test Checklist

1. New student with email OTP reaches student onboarding.
2. Existing student with email OTP reaches the student dashboard.
3. Existing student with email/password reaches the student dashboard.
4. Unknown email in login mode does not silently create an account.
5. New student with SMS OTP reaches student onboarding.
6. Existing student with SMS OTP reaches the student dashboard.
7. WhatsApp OTP sends only when configured.
8. WhatsApp configuration errors allow fallback to SMS/email.
9. New student with Google reaches student onboarding.
10. Existing student with Google reaches the student dashboard.
11. Incorrect OTP shows a safe error.
12. Expired OTP shows a safe error and allows resend.
13. Resend OTP is blocked until the countdown ends.
14. Employer account using student auth is rejected and the local session is signed out.
15. Student account using employer login is rejected by the expected-role check.
16. Suspended accounts route to `/account-suspended`.
17. Deleted accounts route to `/account-deleted`.
18. Private operations access rejects non-admin accounts after password login.

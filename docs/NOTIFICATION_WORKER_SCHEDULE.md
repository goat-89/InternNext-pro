# Notification Worker Schedule

This project uses the `notification-delivery-worker` Supabase Edge Function to process queued notification delivery jobs.

The schedule is database-driven with Supabase Cron (`pg_cron`) and `pg_net`. Runtime values are stored in Supabase Vault and are not committed to this repository.

## Required Edge Function Secrets

Set these in the Supabase dashboard or CLI for the Edge Function runtime:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTIFICATION_WORKER_SECRET`
- `RESEND_API_KEY` when email delivery is enabled
- `NOTIFICATION_EMAIL_FROM` when email delivery is enabled
- `PUBLIC_SITE_URL` or `SITE_URL` or `APP_BASE_URL` for absolute email links

Do not put these values in frontend environment variables.

## Required Vault Secrets

Run these in the Supabase SQL editor with your real values:

```sql
select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'notification_worker_project_url'
);

select vault.create_secret(
  'YOUR_SUPABASE_PUBLISHABLE_KEY',
  'notification_worker_publishable_key'
);

select vault.create_secret(
  'SAME_VALUE_AS_NOTIFICATION_WORKER_SECRET',
  'notification_worker_secret'
);
```

`notification_worker_secret` must match the Edge Function secret named `NOTIFICATION_WORKER_SECRET`.

## Install The Cron Job

After applying migrations and creating the Vault secrets, install the schedule:

```sql
select public.install_notification_delivery_worker_schedule(
  '* * * * *',
  25
);
```

This invokes the worker every minute and lets each run claim up to 25 due jobs.

## Manual Smoke Test

To invoke the worker once from Postgres:

```sql
select public.invoke_notification_delivery_worker(5);
```

The result is a `pg_net` request id. Check Supabase Edge Function logs and the admin Delivery page for job movement.

## Remove The Cron Job

```sql
select public.remove_notification_delivery_worker_schedule();
```

## Monitor

Use the admin Delivery page:

```text
/admin/notification-delivery
```

It shows pending, retry scheduled, delivered, failed, skipped, suppressed, and stale processing jobs.

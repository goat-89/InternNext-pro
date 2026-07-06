# Uptime Monitoring And Operational Retention

This runbook configures the public health probe and automated cleanup for
privacy-limited operational events. It contains no secret values.

## 1. Apply The Migration

Apply:

```text
supabase/migrations/202606270003_operational_retention_and_health_probe.sql
```

The migration creates administrator-only retention settings, secured RPCs, a
cleanup function, a cron installer, and a service-role-only database probe.
It does not remove existing rows when applied.

## 2. Deploy The Health Function

Deploy the endpoint without JWT verification so an external HTTPS monitor can
reach it:

```powershell
npx supabase functions deploy platform-health --no-verify-jwt
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the
function runtime. Do not add either value to frontend code or monitoring URLs.

Endpoint:

```text
https://PROJECT_REF.supabase.co/functions/v1/platform-health
```

Supported methods are `GET` and `HEAD`. A healthy Edge Function and database
return HTTP `200`; configuration or database failures return HTTP `503`.
Responses contain only a status and successful check time.

Smoke test from Command Prompt or PowerShell:

```powershell
curl.exe -i https://PROJECT_REF.supabase.co/functions/v1/platform-health
```

## 3. Configure External Monitoring

Create an HTTPS monitor in the approved environment-specific monitoring
service:

- URL: the `platform-health` endpoint for that environment.
- Method: `GET` or `HEAD`.
- Expected status: `200`.
- Interval: one to five minutes.
- Alert threshold: at least two consecutive failures to reduce transient noise.
- Alert destination: the named production incident owner and backup contact.

Do not put Supabase keys, authorization headers, user data, or query parameters
in the monitor configuration. Test one alert in staging and record the
recovery notification before enabling production alerts.

The endpoint verifies Edge Function execution and a minimal database query. A
separate monitor should check the deployed frontend URL for an HTTP `200`.

## 4. Install Retention Cleanup

The default schedule runs daily at 03:31 UTC:

```sql
select public.install_operational_event_retention_schedule(
  '31 3 * * *'
);
```

Verify it:

```sql
select
  jobname,
  schedule,
  active
from cron.job
where jobname =
  'internnext-operational-event-retention-cleanup';
```

The default policy retains:

- Resolved events for 90 days.
- Ignored events for 30 days.
- Open informational and warning events for 90 days.
- Open error and critical events until an administrator resolves or ignores
  them.

Administrators can adjust the bounded values, preview matching rows, and run
cleanup from `/admin/system-health`. Executed cleanup and setting changes are
written to the existing administrator audit log.

## 5. Rollback And Incident Handling

Remove only the schedule:

```sql
select public.remove_operational_event_retention_schedule();
```

Disable cleanup from System Health when investigating retention behavior.
Do not drop `operational_events` or delete active error/critical incidents.
If the health endpoint fails, inspect Edge Function and database logs using
the check time, while keeping raw errors and credentials out of tickets.

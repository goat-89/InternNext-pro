# InternNext Pro Observability

InternNext Pro records safe operational signals without storing raw errors,
stacks, tokens, OTPs, payment signatures, or private documents.

## Sources

- Authenticated frontend render and unhandled runtime failures
- Razorpay Edge Function structured logs and request IDs
- Failed payment orders
- Failed Razorpay webhook processing
- Notification delivery failures and stale jobs
- Notification worker run history

## Frontend Reporting

The application creates user-facing references such as:

```text
ERR-REFERENCE
```

Authenticated sessions may report an event through
`report_client_operational_event`. The RPC rebuilds the payload from an
allowlist and stores only:

- Stable event type and code
- Reference ID
- Route path without query strings or fragments
- Viewport dimensions
- Online state
- Build mode

Each user is limited to 20 frontend events per hour. Anonymous failures still
receive a local reference ID but are not persisted, preventing an unauthenticated
event-ingestion endpoint from becoming an abuse target.

## Administrator Health

The administrator route is:

```text
/admin/system-health
```

It displays open operational events, critical events, failed payments and
webhooks from the last 24 hours, failed and stale notification jobs, worker
timestamps, and recent safe event codes.

Only trusted administrators may read or update operational events. Browser
clients cannot insert directly into `operational_events`.

## Edge Function Logs

Payment functions log structured fields:

- `event`
- `request_id`
- `code`

They must not log authorization headers, request bodies, billing details,
Razorpay signatures, secrets, raw database errors, or stack traces.

## Incident Workflow

1. Capture the reference ID shown to the user.
2. Search the System health screen and relevant Supabase Edge Function logs.
3. Correlate payment failures with payment and webhook records.
4. Resolve or ignore the operational event after investigation.
5. Record product-impacting administrative changes in the existing audit log.

## Retention

Operational events contain no raw private payloads, but they still contain user
IDs and routes. `operational_event_retention_settings` defines bounded periods
for resolved, ignored, and open noncritical events. Administrators can preview
or execute cleanup from System Health, and a daily `pg_cron` schedule can call
`cleanup_operational_event_retention(false)`.

Open error and critical events are not automatically removed. They must be
reviewed and moved to resolved or ignored before their retention period begins.
Setting changes and executed administrator cleanup runs are audited.

## External Uptime

The `platform-health` Edge Function provides a minimal unauthenticated `GET` or
`HEAD` endpoint for an approved external monitor. It returns `200` only when
the function runtime and its service-role-only database probe succeed, and
returns a generic `503` without raw errors when unavailable.

Configure the endpoint and retention schedule using
`docs/UPTIME_AND_RETENTION.md`. External monitor credentials and alert routing
remain environment-specific operational configuration.

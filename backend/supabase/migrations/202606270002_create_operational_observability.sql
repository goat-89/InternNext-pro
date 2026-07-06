-- Privacy-safe operational observability baseline.

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (
    source in (
      'frontend',
      'edge_function',
      'database',
      'authentication',
      'storage',
      'payment',
      'notification'
    )
  ),
  event_type text not null,
  severity text not null default 'error' check (
    severity in (
      'info',
      'warning',
      'error',
      'critical'
    )
  ),
  code text not null,
  request_id text,
  correlation_id text,
  user_id uuid references public.profiles(id) on delete set null,
  route text,
  safe_message text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (
    status in (
      'open',
      'resolved',
      'ignored'
    )
  ),
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists
operational_events_status_occurred_idx
on public.operational_events (
  status,
  occurred_at desc
);

create index if not exists
operational_events_source_occurred_idx
on public.operational_events (
  source,
  occurred_at desc
);

create index if not exists
operational_events_user_occurred_idx
on public.operational_events (
  user_id,
  occurred_at desc
)
where user_id is not null;

alter table public.operational_events
enable row level security;

drop policy if exists
operational_events_admin_select
on public.operational_events;

create policy
operational_events_admin_select
on public.operational_events
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists
operational_events_admin_update
on public.operational_events;

create policy
operational_events_admin_update
on public.operational_events
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

revoke all
on public.operational_events
from anon, authenticated;

grant select, update (
  status,
  resolved_at,
  resolved_by
)
on public.operational_events
to authenticated;

create or replace function public.report_client_operational_event(
  p_event_type text,
  p_code text,
  p_request_id text default null,
  p_route text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  event_id uuid;
  safe_event_type text;
  safe_code text;
  safe_request_id text;
  safe_route text;
  safe_metadata jsonb;
  recent_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = current_user_id
      and p.account_status = 'active'
  ) then
    raise exception 'Active account access is required.';
  end if;

  select count(*)
  into recent_count
  from public.operational_events e
  where e.user_id = current_user_id
    and e.source = 'frontend'
    and e.created_at >= now() - interval '1 hour';

  if recent_count >= 20 then
    raise exception 'Operational event rate limit reached.';
  end if;

  safe_event_type := left(
    regexp_replace(
      lower(coalesce(p_event_type, 'client_error')),
      '[^a-z0-9_]+',
      '_',
      'g'
    ),
    80
  );

  safe_code := left(
    regexp_replace(
      upper(coalesce(p_code, 'CLIENT_ERROR')),
      '[^A-Z0-9_]+',
      '_',
      'g'
    ),
    80
  );

  safe_request_id := nullif(
    left(
      regexp_replace(
        coalesce(p_request_id, ''),
        '[^A-Za-z0-9_-]+',
        '',
        'g'
      ),
      80
    ),
    ''
  );

  safe_route := nullif(
    left(
      regexp_replace(
        regexp_replace(
          split_part(
            split_part(
              coalesce(p_route, ''),
              '?',
              1
            ),
            '#',
            1
          ),
          '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
          '/:id',
          'g'
        ),
        '/[A-Za-z0-9_-]{32,}',
        '/:redacted',
        'g'
      ),
      200
    ),
    ''
  );

  safe_metadata := jsonb_strip_nulls(
    jsonb_build_object(
      'viewport_width',
      case
        when jsonb_typeof(p_metadata -> 'viewport_width') = 'number'
          then p_metadata -> 'viewport_width'
        else null
      end,
      'viewport_height',
      case
        when jsonb_typeof(p_metadata -> 'viewport_height') = 'number'
          then p_metadata -> 'viewport_height'
        else null
      end,
      'online',
      case
        when jsonb_typeof(p_metadata -> 'online') = 'boolean'
          then p_metadata -> 'online'
        else null
      end,
      'mode',
      case
        when jsonb_typeof(p_metadata -> 'mode') = 'string'
          then to_jsonb(
            left(
              p_metadata ->> 'mode',
              20
            )
          )
        else null
      end
    )
  );

  insert into public.operational_events (
    source,
    event_type,
    severity,
    code,
    request_id,
    user_id,
    route,
    safe_message,
    metadata
  )
  values (
    'frontend',
    coalesce(nullif(safe_event_type, ''), 'client_error'),
    'error',
    coalesce(nullif(safe_code, ''), 'CLIENT_ERROR'),
    safe_request_id,
    current_user_id,
    safe_route,
    'A client error was reported.',
    safe_metadata
  )
  returning id into event_id;

  return event_id;
end;
$$;

create or replace function public.get_admin_system_health_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select jsonb_build_object(
    'generated_at',
    now(),
    'open_operational_events',
    (
      select count(*)
      from public.operational_events e
      where e.status = 'open'
    ),
    'critical_operational_events',
    (
      select count(*)
      from public.operational_events e
      where e.status = 'open'
        and e.severity = 'critical'
    ),
    'failed_payments_24h',
    (
      select count(*)
      from public.payment_orders p
      where p.status = 'failed'
        and p.updated_at >= now() - interval '24 hours'
    ),
    'failed_webhooks_24h',
    (
      select count(*)
      from public.payment_webhook_events w
      where w.processing_status = 'failed'
        and w.created_at >= now() - interval '24 hours'
    ),
    'failed_delivery_jobs',
    (
      select count(*)
      from public.notification_delivery_jobs j
      where j.status = 'failed'
    ),
    'stale_delivery_jobs',
    (
      select count(*)
      from public.notification_delivery_jobs j
      where j.status = 'processing'
        and j.locked_at < now() - interval '15 minutes'
    ),
    'last_worker_success_at',
    (
      select max(r.finished_at)
      from public.notification_worker_runs r
      where r.status = 'completed'
    ),
    'last_worker_failure_at',
    (
      select max(r.finished_at)
      from public.notification_worker_runs r
      where r.status = 'failed'
    ),
    'recent_events',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', recent.id,
            'source', recent.source,
            'event_type', recent.event_type,
            'severity', recent.severity,
            'code', recent.code,
            'request_id', recent.request_id,
            'route', recent.route,
            'safe_message', recent.safe_message,
            'status', recent.status,
            'occurred_at', recent.occurred_at
          )
          order by recent.occurred_at desc
        )
        from (
          select e.*
          from public.operational_events e
          order by e.occurred_at desc
          limit 10
        ) recent
      ),
      '[]'::jsonb
    )
  )
  into result;

  return result;
end;
$$;

create or replace function public.get_admin_operational_events(
  p_status text default null,
  p_source text default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        to_jsonb(events)
        order by events.occurred_at desc
      )
      from (
        select
          e.id,
          e.source,
          e.event_type,
          e.severity,
          e.code,
          e.request_id,
          e.correlation_id,
          e.user_id,
          e.route,
          e.safe_message,
          e.metadata,
          e.status,
          e.occurred_at,
          e.resolved_at,
          e.resolved_by
        from public.operational_events e
        where (
          nullif(trim(p_status), '') is null
          or e.status = lower(trim(p_status))
        )
          and (
            nullif(trim(p_source), '') is null
            or e.source = lower(trim(p_source))
          )
        order by e.occurred_at desc
        limit safe_limit
      ) events
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.update_admin_operational_event_status(
  p_event_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_status text := lower(trim(coalesce(p_status, '')));
  updated_event public.operational_events;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if safe_status not in ('open', 'resolved', 'ignored') then
    raise exception 'Invalid operational event status.';
  end if;

  update public.operational_events
  set
    status = safe_status,
    resolved_at = case
      when safe_status = 'open' then null
      else now()
    end,
    resolved_by = case
      when safe_status = 'open' then null
      else auth.uid()
    end
  where id = p_event_id
  returning * into updated_event;

  if updated_event.id is null then
    raise exception 'Operational event not found.';
  end if;

  return to_jsonb(updated_event);
end;
$$;

revoke all
on function public.report_client_operational_event(text, text, text, text, jsonb)
from public;

revoke all
on function public.get_admin_system_health_overview()
from public;

revoke all
on function public.get_admin_operational_events(text, text, integer)
from public;

revoke all
on function public.update_admin_operational_event_status(uuid, text)
from public;

grant execute
on function public.report_client_operational_event(text, text, text, text, jsonb)
to authenticated;

grant execute
on function public.get_admin_system_health_overview()
to authenticated;

grant execute
on function public.get_admin_operational_events(text, text, integer)
to authenticated;

grant execute
on function public.update_admin_operational_event_status(uuid, text)
to authenticated;

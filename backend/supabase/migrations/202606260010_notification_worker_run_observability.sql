-- Notification worker run observability.

create table if not exists public.notification_worker_runs (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  status text not null default 'running' check (
    status in ('running', 'completed', 'failed')
  ),
  requested_limit integer not null default 25 check (
    requested_limit between 1 and 100
  ),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  retry_scheduled_count integer not null default 0 check (retry_scheduled_count >= 0),
  worker_error_count integer not null default 0 check (worker_error_count >= 0),
  released_stale_count integer not null default 0 check (released_stale_count >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_worker_runs_started_idx
on public.notification_worker_runs(started_at desc);

create index if not exists notification_worker_runs_status_started_idx
on public.notification_worker_runs(status, started_at desc);

drop trigger if exists notification_worker_runs_set_updated_at
on public.notification_worker_runs;

create trigger notification_worker_runs_set_updated_at
before update on public.notification_worker_runs
for each row
execute function public.set_notification_updated_at();

alter table public.notification_worker_runs enable row level security;

drop policy if exists notification_worker_runs_admin_select
on public.notification_worker_runs;

create policy notification_worker_runs_admin_select
on public.notification_worker_runs
for select
to authenticated
using (public.current_user_is_admin());

revoke all on public.notification_worker_runs from anon;
revoke all on public.notification_worker_runs from authenticated;
grant select on public.notification_worker_runs to authenticated;

create or replace function public.start_notification_worker_run(
  p_worker_id text,
  p_requested_limit integer default 25
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_worker_id text := left(nullif(trim(coalesce(p_worker_id, '')), ''), 120);
  safe_limit integer := least(greatest(coalesce(p_requested_limit, 25), 1), 100);
  run_id uuid;
begin
  if clean_worker_id is null then
    raise exception 'NOTIFICATION_WORKER_INVALID';
  end if;

  insert into public.notification_worker_runs (
    worker_id,
    requested_limit
  )
  values (
    clean_worker_id,
    safe_limit
  )
  returning id into run_id;

  return run_id;
end;
$$;

create or replace function public.finish_notification_worker_run(
  p_run_id uuid,
  p_status text,
  p_claimed_count integer default 0,
  p_delivered_count integer default 0,
  p_failed_count integer default 0,
  p_retry_scheduled_count integer default 0,
  p_worker_error_count integer default 0,
  p_released_stale_count integer default 0,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_status text := lower(trim(coalesce(p_status, '')));
  updated_run public.notification_worker_runs;
begin
  if clean_status not in ('completed', 'failed') then
    raise exception 'NOTIFICATION_WORKER_STATUS_INVALID';
  end if;

  update public.notification_worker_runs
  set
    status = clean_status,
    claimed_count = greatest(coalesce(p_claimed_count, 0), 0),
    delivered_count = greatest(coalesce(p_delivered_count, 0), 0),
    failed_count = greatest(coalesce(p_failed_count, 0), 0),
    retry_scheduled_count = greatest(coalesce(p_retry_scheduled_count, 0), 0),
    worker_error_count = greatest(coalesce(p_worker_error_count, 0), 0),
    released_stale_count = greatest(coalesce(p_released_stale_count, 0), 0),
    error_message = left(nullif(trim(coalesce(p_error_message, '')), ''), 500),
    metadata = coalesce(p_metadata, '{}'::jsonb),
    finished_at = now(),
    duration_ms = greatest(
      (
        extract(
          epoch from (now() - started_at)
        ) * 1000
      )::integer,
      0
    )
  where id = p_run_id
  returning *
  into updated_run;

  if updated_run.id is null then
    raise exception 'NOTIFICATION_WORKER_RUN_NOT_FOUND';
  end if;

  return to_jsonb(updated_run);
end;
$$;

create or replace function public.get_admin_notification_worker_runs(
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  runs jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'worker_id', worker_id,
        'status', status,
        'requested_limit', requested_limit,
        'claimed_count', claimed_count,
        'delivered_count', delivered_count,
        'failed_count', failed_count,
        'retry_scheduled_count', retry_scheduled_count,
        'worker_error_count', worker_error_count,
        'released_stale_count', released_stale_count,
        'error_message', error_message,
        'started_at', started_at,
        'finished_at', finished_at,
        'duration_ms', duration_ms,
        'metadata', metadata
      )
      order by started_at desc
    ),
    '[]'::jsonb
  )
  into runs
  from (
    select *
    from public.notification_worker_runs
    order by started_at desc
    limit safe_limit
  ) recent_runs;

  return runs;
end;
$$;

create or replace function public.get_admin_notification_delivery_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  status_counts jsonb;
  channel_counts jsonb;
  recent_failures jsonb;
  recent_worker_runs jsonb;
  stale_processing_count integer;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'status', status,
        'count', job_count,
        'oldest_next_attempt_at', oldest_next_attempt_at
      )
      order by status
    ),
    '[]'::jsonb
  )
  into status_counts
  from (
    select
      status,
      count(*)::integer as job_count,
      min(next_attempt_at) as oldest_next_attempt_at
    from public.notification_delivery_jobs
    group by status
  ) grouped_statuses;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'channel', channel,
        'status', status,
        'count', job_count
      )
      order by channel, status
    ),
    '[]'::jsonb
  )
  into channel_counts
  from (
    select
      channel,
      status,
      count(*)::integer as job_count
    from public.notification_delivery_jobs
    group by channel, status
  ) grouped_channels;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', j.id,
        'notification_id', j.notification_id,
        'recipient_user_id', j.recipient_user_id,
        'recipient_email', p.email,
        'channel', j.channel,
        'provider', j.provider,
        'status', j.status,
        'attempt_count', j.attempt_count,
        'max_attempts', j.max_attempts,
        'last_error_code', j.last_error_code,
        'last_error_message', j.last_error_message,
        'failed_at', j.failed_at,
        'updated_at', j.updated_at,
        'event_key', n.event_key,
        'title', n.title
      )
      order by j.failed_at desc nulls last, j.updated_at desc
    ),
    '[]'::jsonb
  )
  into recent_failures
  from (
    select *
    from public.notification_delivery_jobs
    where status = 'failed'
    order by failed_at desc nulls last, updated_at desc
    limit 10
  ) j
  left join public.notifications n
    on n.id = j.notification_id
  left join public.profiles p
    on p.id = j.recipient_user_id;

  select public.get_admin_notification_worker_runs(10)
  into recent_worker_runs;

  select count(*)::integer
  into stale_processing_count
  from public.notification_delivery_jobs
  where status = 'processing'
    and locked_at < now() - interval '10 minutes';

  return jsonb_build_object(
    'generated_at', now(),
    'status_counts', status_counts,
    'channel_counts', channel_counts,
    'recent_failures', recent_failures,
    'recent_worker_runs', recent_worker_runs,
    'stale_processing_count', stale_processing_count
  );
end;
$$;

revoke all on function public.start_notification_worker_run(text, integer) from public;
revoke all on function public.finish_notification_worker_run(uuid, text, integer, integer, integer, integer, integer, integer, text, jsonb) from public;
revoke all on function public.get_admin_notification_worker_runs(integer) from public;
revoke all on function public.get_admin_notification_delivery_overview() from public;

grant execute on function public.start_notification_worker_run(text, integer) to service_role;
grant execute on function public.finish_notification_worker_run(uuid, text, integer, integer, integer, integer, integer, integer, text, jsonb) to service_role;
grant execute on function public.get_admin_notification_worker_runs(integer) to authenticated;
grant execute on function public.get_admin_notification_delivery_overview() to authenticated;

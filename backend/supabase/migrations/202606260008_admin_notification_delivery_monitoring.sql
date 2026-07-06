-- Admin monitoring RPCs for notification delivery jobs and attempts.

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
    'stale_processing_count', stale_processing_count
  );
end;
$$;

create or replace function public.get_admin_notification_delivery_jobs(
  p_status text default null,
  p_channel text default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_status text := nullif(trim(coalesce(p_status, '')), '');
  clean_channel text := nullif(trim(coalesce(p_channel, '')), '');
  safe_page integer := greatest(coalesce(p_page, 1), 1);
  safe_page_size integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
  offset_count integer;
  total_count integer;
  jobs jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if clean_status is not null
    and clean_status not in (
      'pending',
      'processing',
      'delivered',
      'retry_scheduled',
      'failed',
      'cancelled',
      'skipped',
      'suppressed'
    ) then
    raise exception 'NOTIFICATION_DELIVERY_FILTER_INVALID';
  end if;

  if clean_channel is not null
    and clean_channel not in ('in_app', 'email', 'web_push', 'sms', 'whatsapp') then
    raise exception 'NOTIFICATION_DELIVERY_FILTER_INVALID';
  end if;

  offset_count := (safe_page - 1) * safe_page_size;

  select count(*)::integer
  into total_count
  from public.notification_delivery_jobs j
  where (clean_status is null or j.status = clean_status)
    and (clean_channel is null or j.channel = clean_channel);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', page_rows.id,
        'notification_id', page_rows.notification_id,
        'recipient_user_id', page_rows.recipient_user_id,
        'recipient_email', page_rows.email,
        'recipient_name', page_rows.full_name,
        'channel', page_rows.channel,
        'provider', page_rows.provider,
        'status', page_rows.status,
        'scheduled_at', page_rows.scheduled_at,
        'next_attempt_at', page_rows.next_attempt_at,
        'attempt_count', page_rows.attempt_count,
        'max_attempts', page_rows.max_attempts,
        'locked_at', page_rows.locked_at,
        'locked_by', page_rows.locked_by,
        'last_error_code', page_rows.last_error_code,
        'last_error_message', page_rows.last_error_message,
        'delivered_at', page_rows.delivered_at,
        'failed_at', page_rows.failed_at,
        'created_at', page_rows.created_at,
        'updated_at', page_rows.updated_at,
        'event_key', page_rows.event_key,
        'title', page_rows.title,
        'category', page_rows.category,
        'priority', page_rows.priority,
        'latest_attempt', page_rows.latest_attempt
      )
      order by page_rows.created_at desc
    ),
    '[]'::jsonb
  )
  into jobs
  from (
    select
      j.*,
      p.email,
      p.full_name,
      n.event_key,
      n.title,
      n.category,
      n.priority,
      (
        select jsonb_build_object(
          'attempt_number', a.attempt_number,
          'provider', a.provider,
          'provider_message_id', a.provider_message_id,
          'status', a.status,
          'response_code', a.response_code,
          'safe_error_code', a.safe_error_code,
          'duration_ms', a.duration_ms,
          'attempted_at', a.attempted_at
        )
        from public.notification_delivery_attempts a
        where a.delivery_job_id = j.id
        order by a.attempt_number desc
        limit 1
      ) as latest_attempt
    from public.notification_delivery_jobs j
    left join public.profiles p
      on p.id = j.recipient_user_id
    left join public.notifications n
      on n.id = j.notification_id
    where (clean_status is null or j.status = clean_status)
      and (clean_channel is null or j.channel = clean_channel)
    order by j.created_at desc
    limit safe_page_size
    offset offset_count
  ) page_rows;

  return jsonb_build_object(
    'jobs', jobs,
    'total', total_count,
    'page', safe_page,
    'page_size', safe_page_size,
    'total_pages', greatest(ceil(total_count::numeric / safe_page_size)::integer, 1)
  );
end;
$$;

create or replace function public.get_admin_notification_delivery_attempts(
  p_job_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attempts jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'delivery_job_id', delivery_job_id,
        'attempt_number', attempt_number,
        'provider', provider,
        'provider_message_id', provider_message_id,
        'status', status,
        'response_code', response_code,
        'safe_error_code', safe_error_code,
        'duration_ms', duration_ms,
        'attempted_at', attempted_at
      )
      order by attempt_number desc
    ),
    '[]'::jsonb
  )
  into attempts
  from public.notification_delivery_attempts
  where delivery_job_id = p_job_id;

  return attempts;
end;
$$;

create or replace function public.admin_release_stale_notification_delivery_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return public.release_stale_notification_delivery_jobs();
end;
$$;

revoke all on function public.get_admin_notification_delivery_overview() from public;
revoke all on function public.get_admin_notification_delivery_jobs(text, text, integer, integer) from public;
revoke all on function public.get_admin_notification_delivery_attempts(uuid) from public;
revoke all on function public.admin_release_stale_notification_delivery_jobs() from public;

grant execute on function public.get_admin_notification_delivery_overview() to authenticated;
grant execute on function public.get_admin_notification_delivery_jobs(text, text, integer, integer) to authenticated;
grant execute on function public.get_admin_notification_delivery_attempts(uuid) to authenticated;
grant execute on function public.admin_release_stale_notification_delivery_jobs() to authenticated;

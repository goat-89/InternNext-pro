-- Notification delivery queue worker RPCs.
-- Additive migration: keeps browser clients read-only and lets trusted workers
-- claim, complete, retry, and fail delivery jobs safely.

create unique index if not exists notification_delivery_jobs_notification_channel_uidx
on public.notification_delivery_jobs(notification_id, channel)
where notification_id is not null;

create index if not exists notification_delivery_jobs_processing_lock_idx
on public.notification_delivery_jobs(status, locked_at)
where status = 'processing';

create or replace function public.get_notification_provider_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'in_app', true,
    'email', false,
    'web_push', false,
    'sms', false,
    'whatsapp', false
  );
$$;

create or replace function public.is_notification_channel_enabled(
  p_user_id uuid,
  p_event_key text,
  p_category text,
  p_channel text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clean_channel text := trim(coalesce(p_channel, ''));
  clean_category text := coalesce(nullif(trim(p_category), ''), 'system');
  event_preference public.notification_preferences;
  category_preference public.notification_category_preferences;
begin
  if p_user_id is null then
    return false;
  end if;

  if clean_channel not in ('in_app', 'email', 'web_push', 'sms', 'whatsapp') then
    return false;
  end if;

  if clean_category = 'security' and clean_channel in ('in_app', 'email') then
    return true;
  end if;

  select *
  into event_preference
  from public.notification_preferences
  where user_id = p_user_id
    and event_key = p_event_key
  limit 1;

  if event_preference.id is not null then
    return case clean_channel
      when 'in_app' then event_preference.in_app_enabled
      when 'email' then event_preference.email_enabled
      when 'web_push' then event_preference.push_enabled
      when 'sms' then event_preference.sms_enabled
      when 'whatsapp' then event_preference.whatsapp_enabled
      else false
    end;
  end if;

  select *
  into category_preference
  from public.notification_category_preferences
  where user_id = p_user_id
    and category = clean_category
  limit 1;

  if category_preference.id is not null then
    return case clean_channel
      when 'in_app' then category_preference.in_app_enabled
      when 'email' then category_preference.email_enabled
      when 'web_push' then category_preference.push_enabled
      when 'sms' then category_preference.sms_enabled
      when 'whatsapp' then category_preference.whatsapp_enabled
      else false
    end;
  end if;

  return clean_channel in ('in_app', 'email');
end;
$$;

create or replace function public.get_notification_next_attempt_at(
  p_user_id uuid,
  p_category text,
  p_priority text,
  p_channel text
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  settings_record public.notification_user_settings;
  clean_priority text := coalesce(nullif(trim(p_priority), ''), 'normal');
  clean_channel text := trim(coalesce(p_channel, ''));
  local_now timestamp;
  local_time time;
  local_resume timestamp;
begin
  if clean_channel = 'in_app' or clean_priority in ('high', 'critical') then
    return now();
  end if;

  select *
  into settings_record
  from public.notification_user_settings
  where user_id = p_user_id;

  if settings_record.user_id is null
    or not settings_record.quiet_hours_enabled
    or settings_record.quiet_hours_start is null
    or settings_record.quiet_hours_end is null
    or settings_record.quiet_hours_start = settings_record.quiet_hours_end then
    return now();
  end if;

  begin
    local_now := timezone(settings_record.timezone, now());
  exception when others then
    settings_record.timezone := 'UTC';
    local_now := timezone(settings_record.timezone, now());
  end;

  local_time := local_now::time;

  if settings_record.quiet_hours_start < settings_record.quiet_hours_end then
    if local_time >= settings_record.quiet_hours_start
      and local_time < settings_record.quiet_hours_end then
      local_resume :=
        date_trunc('day', local_now) +
        (settings_record.quiet_hours_end - time '00:00');
      return local_resume at time zone settings_record.timezone;
    end if;
  else
    if local_time >= settings_record.quiet_hours_start then
      local_resume :=
        date_trunc('day', local_now) +
        interval '1 day' +
        (settings_record.quiet_hours_end - time '00:00');
      return local_resume at time zone settings_record.timezone;
    end if;

    if local_time < settings_record.quiet_hours_end then
      local_resume :=
        date_trunc('day', local_now) +
        (settings_record.quiet_hours_end - time '00:00');
      return local_resume at time zone settings_record.timezone;
    end if;
  end if;

  return now();
end;
$$;

create or replace function public.enqueue_notification_delivery_jobs(
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.notification_events;
  notification_record public.notifications;
  policy jsonb;
  provider_status jsonb;
  channel_record record;
  clean_channel text;
  provider_name text;
  preference_enabled boolean;
  provider_available boolean;
  target_status text;
  target_next_attempt_at timestamptz;
  delivered_count integer := 0;
  queued_count integer := 0;
  skipped_count integer := 0;
  suppressed_count integer := 0;
begin
  select *
  into event_record
  from public.notification_events
  where id = p_event_id;

  if event_record.id is null then
    raise exception 'NOTIFICATION_EVENT_INVALID';
  end if;

  policy := public.get_notification_event_policy(event_record.event_key);
  provider_status := public.get_notification_provider_status();

  for notification_record in
    select *
    from public.notifications
    where event_id = event_record.id
  loop
    for channel_record in
      select distinct value as channel
      from jsonb_array_elements_text(
        coalesce(policy -> 'channels', '["in_app"]'::jsonb)
      )
    loop
      clean_channel := trim(coalesce(channel_record.channel, ''));

      if clean_channel not in ('in_app', 'email', 'web_push', 'sms', 'whatsapp') then
        continue;
      end if;

      provider_name := case clean_channel
        when 'in_app' then 'internal'
        when 'email' then 'email'
        when 'web_push' then 'web_push'
        when 'sms' then 'sms'
        when 'whatsapp' then 'whatsapp'
        else null
      end;

      preference_enabled := public.is_notification_channel_enabled(
        notification_record.recipient_user_id,
        event_record.event_key,
        notification_record.category,
        clean_channel
      );

      provider_available := coalesce(
        (provider_status ->> clean_channel)::boolean,
        false
      );

      if not preference_enabled then
        target_status := 'suppressed';
        suppressed_count := suppressed_count + 1;
      elsif not provider_available then
        target_status := 'skipped';
        skipped_count := skipped_count + 1;
      elsif clean_channel = 'in_app' then
        target_status := 'delivered';
        delivered_count := delivered_count + 1;
      else
        target_status := 'pending';
        queued_count := queued_count + 1;
      end if;

      target_next_attempt_at := case
        when target_status = 'pending' then public.get_notification_next_attempt_at(
          notification_record.recipient_user_id,
          notification_record.category,
          notification_record.priority,
          clean_channel
        )
        else now()
      end;

      insert into public.notification_delivery_jobs (
        notification_id,
        recipient_user_id,
        channel,
        provider,
        status,
        scheduled_at,
        next_attempt_at,
        delivered_at,
        last_error_code,
        last_error_message,
        metadata
      )
      values (
        notification_record.id,
        notification_record.recipient_user_id,
        clean_channel,
        provider_name,
        target_status,
        target_next_attempt_at,
        target_next_attempt_at,
        case when target_status = 'delivered' then now() else null end,
        case
          when target_status = 'suppressed' then 'PREFERENCE_DISABLED'
          when target_status = 'skipped' then 'PROVIDER_NOT_CONFIGURED'
          else null
        end,
        case
          when target_status = 'suppressed' then 'Recipient preference disabled this channel.'
          when target_status = 'skipped' then 'Notification provider is not configured.'
          else null
        end,
        jsonb_build_object(
          'event_key',
          event_record.event_key,
          'policy',
          policy,
          'preference_enabled',
          preference_enabled,
          'provider_available',
          provider_available
        )
      )
      on conflict (notification_id, channel) where notification_id is not null
      do nothing;
    end loop;
  end loop;

  return jsonb_build_object(
    'event_id',
    event_record.id,
    'delivered',
    delivered_count,
    'queued',
    queued_count,
    'skipped',
    skipped_count,
    'suppressed',
    suppressed_count
  );
end;
$$;

create or replace function public.claim_notification_delivery_jobs(
  p_worker_id text,
  p_limit integer default 25,
  p_lock_ttl interval default interval '5 minutes'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_worker_id text := left(nullif(trim(coalesce(p_worker_id, '')), ''), 120);
  clean_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  clean_lock_ttl interval := coalesce(p_lock_ttl, interval '5 minutes');
  claimed_jobs jsonb;
begin
  if clean_worker_id is null then
    raise exception 'NOTIFICATION_WORKER_INVALID';
  end if;

  with candidates as (
    select j.id
    from public.notification_delivery_jobs j
    left join public.notifications n
      on n.id = j.notification_id
    where j.status in ('pending', 'retry_scheduled')
      and j.next_attempt_at <= now()
      and j.attempt_count < j.max_attempts
      and (
        j.locked_at is null
        or j.locked_at < now() - clean_lock_ttl
      )
    order by
      case n.priority
        when 'critical' then 1
        when 'high' then 2
        when 'normal' then 3
        else 4
      end,
      j.next_attempt_at,
      j.created_at
    for update of j skip locked
    limit clean_limit
  ),
  updated as (
    update public.notification_delivery_jobs j
    set
      status = 'processing',
      locked_at = now(),
      locked_by = clean_worker_id,
      attempt_count = j.attempt_count + 1
    from candidates c
    where j.id = c.id
    returning j.*
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'notification_id', u.notification_id,
        'recipient_user_id', u.recipient_user_id,
        'channel', u.channel,
        'provider', u.provider,
        'attempt_count', u.attempt_count,
        'max_attempts', u.max_attempts,
        'metadata', u.metadata,
        'notification', jsonb_build_object(
          'title', n.title,
          'body', n.body,
          'deep_link', n.deep_link,
          'category', n.category,
          'priority', n.priority,
          'metadata', n.metadata
        ),
        'event', jsonb_build_object(
          'event_key', e.event_key,
          'payload', e.payload
        )
      )
      order by u.next_attempt_at, u.created_at
    ),
    '[]'::jsonb
  )
  into claimed_jobs
  from updated u
  left join public.notifications n
    on n.id = u.notification_id
  left join public.notification_events e
    on e.id = n.event_id;

  return claimed_jobs;
end;
$$;

create or replace function public.complete_notification_delivery_job(
  p_job_id uuid,
  p_worker_id text,
  p_provider_message_id text default null,
  p_response_code text default null,
  p_duration_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_worker_id text := left(nullif(trim(coalesce(p_worker_id, '')), ''), 120);
  job_record public.notification_delivery_jobs;
begin
  select *
  into job_record
  from public.notification_delivery_jobs
  where id = p_job_id
    and locked_by = clean_worker_id
    and status = 'processing'
  for update;

  if job_record.id is null then
    raise exception 'NOTIFICATION_DELIVERY_JOB_NOT_CLAIMED';
  end if;

  insert into public.notification_delivery_attempts (
    delivery_job_id,
    attempt_number,
    provider,
    provider_message_id,
    status,
    response_code,
    duration_ms
  )
  values (
    job_record.id,
    job_record.attempt_count,
    job_record.provider,
    nullif(trim(coalesce(p_provider_message_id, '')), ''),
    'delivered',
    nullif(trim(coalesce(p_response_code, '')), ''),
    p_duration_ms
  )
  on conflict (delivery_job_id, attempt_number) do nothing;

  update public.notification_delivery_jobs
  set
    status = 'delivered',
    delivered_at = now(),
    failed_at = null,
    locked_at = null,
    locked_by = null,
    last_error_code = null,
    last_error_message = null
  where id = job_record.id;

  return jsonb_build_object(
    'id',
    job_record.id,
    'status',
    'delivered'
  );
end;
$$;

create or replace function public.fail_notification_delivery_job(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_error_message text default null,
  p_response_code text default null,
  p_duration_ms integer default null,
  p_retryable boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_worker_id text := left(nullif(trim(coalesce(p_worker_id, '')), ''), 120);
  clean_error_code text := left(coalesce(nullif(trim(p_error_code), ''), 'DELIVERY_FAILED'), 80);
  clean_error_message text := left(nullif(trim(coalesce(p_error_message, '')), ''), 500);
  job_record public.notification_delivery_jobs;
  retry_delay_seconds integer;
  next_status text;
  next_attempt timestamptz;
begin
  select *
  into job_record
  from public.notification_delivery_jobs
  where id = p_job_id
    and locked_by = clean_worker_id
    and status = 'processing'
  for update;

  if job_record.id is null then
    raise exception 'NOTIFICATION_DELIVERY_JOB_NOT_CLAIMED';
  end if;

  insert into public.notification_delivery_attempts (
    delivery_job_id,
    attempt_number,
    provider,
    status,
    response_code,
    safe_error_code,
    duration_ms
  )
  values (
    job_record.id,
    job_record.attempt_count,
    job_record.provider,
    'failed',
    nullif(trim(coalesce(p_response_code, '')), ''),
    clean_error_code,
    p_duration_ms
  )
  on conflict (delivery_job_id, attempt_number) do nothing;

  if p_retryable and job_record.attempt_count < job_record.max_attempts then
    retry_delay_seconds := least(
      3600,
      (60 * power(2, greatest(job_record.attempt_count - 1, 0)))::integer
    );
    next_status := 'retry_scheduled';
    next_attempt := now() + make_interval(secs => retry_delay_seconds);
  else
    next_status := 'failed';
    next_attempt := now();
  end if;

  update public.notification_delivery_jobs
  set
    status = next_status,
    next_attempt_at = next_attempt,
    locked_at = null,
    locked_by = null,
    last_error_code = clean_error_code,
    last_error_message = clean_error_message,
    failed_at = case when next_status = 'failed' then now() else null end
  where id = job_record.id;

  return jsonb_build_object(
    'id',
    job_record.id,
    'status',
    next_status,
    'next_attempt_at',
    next_attempt
  );
end;
$$;

create or replace function public.release_stale_notification_delivery_jobs(
  p_lock_ttl interval default interval '10 minutes'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
  clean_lock_ttl interval := coalesce(p_lock_ttl, interval '10 minutes');
begin
  update public.notification_delivery_jobs
  set
    status = case
      when attempt_count >= max_attempts then 'failed'
      else 'retry_scheduled'
    end,
    next_attempt_at = now(),
    locked_at = null,
    locked_by = null,
    failed_at = case
      when attempt_count >= max_attempts then now()
      else null
    end,
    last_error_code = coalesce(last_error_code, 'STALE_WORKER_LOCK'),
    last_error_message = coalesce(last_error_message, 'Worker lock expired before completion.')
  where status = 'processing'
    and locked_at < now() - clean_lock_ttl;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create or replace function public.publish_domain_notification_event(
  p_event_key text,
  p_aggregate_type text default null,
  p_aggregate_id uuid default null,
  p_actor_user_id uuid default null,
  p_idempotency_key text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  policy jsonb;
  recipients uuid[];
  rendered jsonb;
  publish_result jsonb;
  event_id_value uuid;
  enqueue_result jsonb;
begin
  policy := public.get_notification_event_policy(p_event_key);

  recipients := public.resolve_notification_recipients(
    p_event_key,
    p_aggregate_type,
    p_aggregate_id,
    p_payload
  );

  if array_length(recipients, 1) is null then
    return jsonb_build_object(
      'event_key',
      p_event_key,
      'created_notifications',
      0,
      'recipients',
      '[]'::jsonb,
      'policy',
      policy
    );
  end if;

  rendered := public.render_notification_template(
    p_event_key,
    'in_app',
    p_payload
  );

  publish_result := public.publish_notification_event(
    p_event_key,
    recipients,
    rendered ->> 'title',
    rendered ->> 'body',
    p_payload ->> 'deep_link',
    policy ->> 'category',
    policy ->> 'priority',
    p_aggregate_type,
    p_aggregate_id,
    p_actor_user_id,
    p_idempotency_key,
    p_payload
  );

  event_id_value := (publish_result ->> 'event_id')::uuid;
  enqueue_result := public.enqueue_notification_delivery_jobs(event_id_value);

  return publish_result || jsonb_build_object(
    'recipients',
    recipients,
    'policy',
    policy,
    'delivery',
    enqueue_result
  );
end;
$$;

revoke all on function public.get_notification_provider_status() from public;
revoke all on function public.is_notification_channel_enabled(uuid, text, text, text) from public;
revoke all on function public.get_notification_next_attempt_at(uuid, text, text, text) from public;
revoke all on function public.enqueue_notification_delivery_jobs(uuid) from public;
revoke all on function public.claim_notification_delivery_jobs(text, integer, interval) from public;
revoke all on function public.complete_notification_delivery_job(uuid, text, text, text, integer) from public;
revoke all on function public.fail_notification_delivery_job(uuid, text, text, text, text, integer, boolean) from public;
revoke all on function public.release_stale_notification_delivery_jobs(interval) from public;
revoke all on function public.publish_domain_notification_event(text, text, uuid, uuid, text, jsonb) from public;

grant execute on function public.claim_notification_delivery_jobs(text, integer, interval) to service_role;
grant execute on function public.complete_notification_delivery_job(uuid, text, text, text, integer) to service_role;
grant execute on function public.fail_notification_delivery_job(uuid, text, text, text, text, integer, boolean) to service_role;
grant execute on function public.release_stale_notification_delivery_jobs(interval) to service_role;

revoke insert, update, delete
on public.notification_delivery_jobs
from authenticated;

revoke insert, update, delete
on public.notification_delivery_attempts
from authenticated;

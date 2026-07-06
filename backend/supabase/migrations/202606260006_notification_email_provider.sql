-- Notification email provider configuration and worker payload support.
-- Secret API keys remain in Edge Function environment variables, not tables.

create table if not exists public.notification_provider_settings (
  channel text primary key check (
    channel in (
      'email',
      'web_push',
      'sms',
      'whatsapp'
    )
  ),
  provider text not null,
  is_enabled boolean not null default false,
  from_email text,
  from_name text,
  reply_to_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_provider_settings_set_updated_at
on public.notification_provider_settings;

create trigger notification_provider_settings_set_updated_at
before update on public.notification_provider_settings
for each row
execute function public.set_notification_updated_at();

insert into public.notification_provider_settings (
  channel,
  provider,
  is_enabled,
  from_name,
  metadata
)
values
  ('email', 'resend', false, 'InternNext Pro', '{}'::jsonb),
  ('web_push', 'web_push', false, 'InternNext Pro', '{}'::jsonb),
  ('sms', 'sms', false, 'InternNext Pro', '{}'::jsonb),
  ('whatsapp', 'whatsapp', false, 'InternNext Pro', '{}'::jsonb)
on conflict (channel) do nothing;

alter table public.notification_provider_settings enable row level security;

drop policy if exists notification_provider_settings_admin_select
on public.notification_provider_settings;

create policy notification_provider_settings_admin_select
on public.notification_provider_settings
for select
to authenticated
using (public.current_user_is_admin());

revoke all on public.notification_provider_settings from anon;
revoke all on public.notification_provider_settings from authenticated;
grant select on public.notification_provider_settings to authenticated;

create or replace function public.get_notification_provider_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  provider_status jsonb;
begin
  select coalesce(
    jsonb_object_agg(
      channel,
      is_enabled
    ),
    '{}'::jsonb
  )
  into provider_status
  from public.notification_provider_settings;

  return jsonb_build_object(
    'in_app', true,
    'email', coalesce((provider_status ->> 'email')::boolean, false),
    'web_push', coalesce((provider_status ->> 'web_push')::boolean, false),
    'sms', coalesce((provider_status ->> 'sms')::boolean, false),
    'whatsapp', coalesce((provider_status ->> 'whatsapp')::boolean, false)
  );
end;
$$;

create or replace function public.get_my_notification_preferences()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  settings_record public.notification_user_settings;
  category_preferences jsonb;
begin
  if current_user_id is null then
    raise exception 'NOTIFICATION_UNAUTHORIZED';
  end if;

  insert into public.notification_user_settings (
    user_id
  )
  values (
    current_user_id
  )
  on conflict (user_id) do nothing;

  select *
  into settings_record
  from public.notification_user_settings
  where user_id = current_user_id;

  select coalesce(
    jsonb_object_agg(
      category,
      jsonb_build_object(
        'category', category,
        'in_app_enabled', in_app_enabled,
        'email_enabled', email_enabled,
        'push_enabled', push_enabled,
        'sms_enabled', sms_enabled,
        'whatsapp_enabled', whatsapp_enabled
      )
      order by category
    ),
    '{}'::jsonb
  )
  into category_preferences
  from public.notification_category_preferences
  where user_id = current_user_id;

  return jsonb_build_object(
    'settings',
    jsonb_build_object(
      'quiet_hours_enabled', settings_record.quiet_hours_enabled,
      'quiet_hours_start', settings_record.quiet_hours_start,
      'quiet_hours_end', settings_record.quiet_hours_end,
      'timezone', settings_record.timezone,
      'marketing_enabled', settings_record.marketing_enabled,
      'digest_frequency', settings_record.digest_frequency
    ),
    'category_preferences',
    category_preferences,
    'providers',
    public.get_notification_provider_status()
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
        'recipient', jsonb_build_object(
          'email', p.email,
          'full_name', p.full_name
        ),
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
    on e.id = n.event_id
  left join public.profiles p
    on p.id = u.recipient_user_id;

  return claimed_jobs;
end;
$$;

revoke all on function public.get_notification_provider_status() from public;
revoke all on function public.get_my_notification_preferences() from public;
revoke all on function public.claim_notification_delivery_jobs(text, integer, interval) from public;

grant execute on function public.get_my_notification_preferences() to authenticated;
grant execute on function public.claim_notification_delivery_jobs(text, integer, interval) to service_role;

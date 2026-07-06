-- Production notification event engine foundation.
-- Additive migration: preserves existing public.notifications rows and APIs.

create extension if not exists pgcrypto;

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  aggregate_type text,
  aggregate_id uuid,
  actor_user_id uuid references public.profiles(id) on delete set null,
  correlation_id text,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists notification_events_idempotency_uidx
on public.notification_events(idempotency_key)
where idempotency_key is not null;

create index if not exists notification_events_key_created_idx
on public.notification_events(event_key, created_at desc);

create index if not exists notification_events_aggregate_idx
on public.notification_events(aggregate_type, aggregate_id, created_at desc);

alter table public.notifications
add column if not exists recipient_user_id uuid references public.profiles(id) on delete cascade;

alter table public.notifications
add column if not exists event_id uuid references public.notification_events(id) on delete set null;

alter table public.notifications
add column if not exists event_key text;

alter table public.notifications
add column if not exists category text not null default 'system';

alter table public.notifications
add column if not exists body text;

alter table public.notifications
add column if not exists deep_link text;

alter table public.notifications
add column if not exists image_url text;

alter table public.notifications
add column if not exists priority text not null default 'normal';

alter table public.notifications
add column if not exists is_read boolean not null default false;

alter table public.notifications
add column if not exists archived_at timestamptz;

alter table public.notifications
add column if not exists expires_at timestamptz;

alter table public.notifications
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.notifications
add column if not exists updated_at timestamptz not null default now();

update public.notifications
set
  recipient_user_id = coalesce(recipient_user_id, user_id),
  body = coalesce(body, message),
  deep_link = coalesce(deep_link, link),
  event_key = coalesce(event_key, 'legacy_notification'),
  is_read = read_at is not null,
  updated_at = coalesce(updated_at, created_at, now())
where recipient_user_id is null
  or body is null
  or deep_link is null
  or event_key is null
  or is_read is distinct from (read_at is not null);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_category_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
    add constraint notifications_category_check
    check (
      category in (
        'application',
        'interview',
        'payment',
        'subscription',
        'support',
        'moderation',
        'security',
        'system',
        'employer',
        'student'
      )
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_priority_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
    add constraint notifications_priority_check
    check (
      priority in (
        'low',
        'normal',
        'high',
        'critical'
      )
    );
  end if;
end;
$$;

create index if not exists notifications_recipient_created_idx
on public.notifications(recipient_user_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
on public.notifications(recipient_user_id, is_read, created_at desc)
where archived_at is null;

create index if not exists notifications_event_idx
on public.notifications(event_id)
where event_id is not null;

create index if not exists notifications_category_created_idx
on public.notifications(category, created_at desc);

create index if not exists notifications_expires_idx
on public.notifications(expires_at)
where expires_at is not null;

create unique index if not exists notifications_event_recipient_uidx
on public.notifications(event_id, recipient_user_id)
where event_id is not null;

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  event_key text not null,
  channel text not null check (channel in ('in_app', 'email', 'web_push', 'sms', 'whatsapp')),
  locale text not null default 'en-IN',
  version integer not null default 1 check (version > 0),
  subject_template text,
  title_template text,
  body_template text not null,
  cta_label text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, channel, locale, version)
);

create index if not exists notification_templates_event_channel_idx
on public.notification_templates(event_key, channel, locale, is_active);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_key)
);

create table if not exists public.notification_category_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create table if not exists public.notification_user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'Asia/Kolkata',
  marketing_enabled boolean not null default false,
  digest_frequency text not null default 'never' check (digest_frequency in ('daily', 'weekly', 'never')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_active_idx
on public.push_subscriptions(user_id, created_at desc)
where revoked_at is null;

create table if not exists public.notification_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email', 'web_push', 'sms', 'whatsapp')),
  provider text,
  destination_hash text,
  status text not null default 'pending' check (
    status in (
      'pending',
      'processing',
      'delivered',
      'retry_scheduled',
      'failed',
      'cancelled',
      'skipped',
      'suppressed'
    )
  ),
  scheduled_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 4 check (max_attempts between 1 and 10),
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  last_error_message text,
  delivered_at timestamptz,
  failed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_delivery_jobs_due_idx
on public.notification_delivery_jobs(status, next_attempt_at, created_at)
where status in ('pending', 'retry_scheduled');

create index if not exists notification_delivery_jobs_recipient_idx
on public.notification_delivery_jobs(recipient_user_id, created_at desc);

create index if not exists notification_delivery_jobs_failed_idx
on public.notification_delivery_jobs(status, failed_at desc)
where status = 'failed';

create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  delivery_job_id uuid not null references public.notification_delivery_jobs(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  provider text,
  provider_message_id text,
  status text not null,
  response_code text,
  safe_error_code text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  attempted_at timestamptz not null default now(),
  unique (delivery_job_id, attempt_number)
);

create index if not exists notification_delivery_attempts_job_idx
on public.notification_delivery_attempts(delivery_job_id, attempted_at desc);

create or replace function public.set_notification_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prepare_notification_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.recipient_user_id is null then
    new.recipient_user_id := new.user_id;
  end if;

  if new.user_id is null then
    new.user_id := new.recipient_user_id;
  end if;

  if new.body is null then
    new.body := new.message;
  end if;

  if new.message is null then
    new.message := new.body;
  end if;

  if new.deep_link is null then
    new.deep_link := new.link;
  end if;

  if new.link is null then
    new.link := new.deep_link;
  end if;

  if new.event_key is null then
    new.event_key := 'legacy_notification';
  end if;

  if new.read_at is not null then
    new.is_read := true;
  elsif new.is_read then
    new.read_at := now();
  end if;

  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists notifications_prepare_row
on public.notifications;

create trigger notifications_prepare_row
before insert or update
on public.notifications
for each row
execute function public.prepare_notification_row();

drop trigger if exists notification_templates_set_updated_at
on public.notification_templates;

create trigger notification_templates_set_updated_at
before update on public.notification_templates
for each row
execute function public.set_notification_updated_at();

drop trigger if exists notification_preferences_set_updated_at
on public.notification_preferences;

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_notification_updated_at();

drop trigger if exists notification_category_preferences_set_updated_at
on public.notification_category_preferences;

create trigger notification_category_preferences_set_updated_at
before update on public.notification_category_preferences
for each row
execute function public.set_notification_updated_at();

drop trigger if exists notification_user_settings_set_updated_at
on public.notification_user_settings;

create trigger notification_user_settings_set_updated_at
before update on public.notification_user_settings
for each row
execute function public.set_notification_updated_at();

drop trigger if exists push_subscriptions_set_updated_at
on public.push_subscriptions;

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_notification_updated_at();

drop trigger if exists notification_delivery_jobs_set_updated_at
on public.notification_delivery_jobs;

create trigger notification_delivery_jobs_set_updated_at
before update on public.notification_delivery_jobs
for each row
execute function public.set_notification_updated_at();

create or replace function public.validate_notification_deep_link(
  target_link text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    target_link is null
    or (
      left(target_link, 1) = '/'
      and target_link !~* '^//'
      and target_link !~* '^[a-z][a-z0-9+.-]*:'
      and target_link !~ '[[:cntrl:]]'
    );
$$;

create or replace function public.publish_notification_event(
  p_event_key text,
  p_recipient_user_ids uuid[],
  p_title text,
  p_body text,
  p_deep_link text default null,
  p_category text default 'system',
  p_priority text default 'normal',
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
  clean_event_key text := trim(coalesce(p_event_key, ''));
  clean_title text := trim(coalesce(p_title, ''));
  clean_body text := trim(coalesce(p_body, ''));
  clean_category text := coalesce(nullif(trim(p_category), ''), 'system');
  clean_priority text := coalesce(nullif(trim(p_priority), ''), 'normal');
  clean_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  safe_link text := nullif(trim(coalesce(p_deep_link, '')), '');
  event_record public.notification_events;
  recipient_id uuid;
  created_count integer := 0;
begin
  if clean_event_key = '' then
    raise exception 'NOTIFICATION_EVENT_INVALID';
  end if;

  if clean_title = '' or clean_body = '' then
    raise exception 'NOTIFICATION_TEMPLATE_RENDER_FAILED';
  end if;

  if clean_category not in (
    'application',
    'interview',
    'payment',
    'subscription',
    'support',
    'moderation',
    'security',
    'system',
    'employer',
    'student'
  ) then
    raise exception 'NOTIFICATION_EVENT_INVALID';
  end if;

  if clean_priority not in ('low', 'normal', 'high', 'critical') then
    raise exception 'NOTIFICATION_EVENT_INVALID';
  end if;

  if not public.validate_notification_deep_link(safe_link) then
    raise exception 'NOTIFICATION_DEEP_LINK_INVALID';
  end if;

  insert into public.notification_events (
    event_key,
    aggregate_type,
    aggregate_id,
    actor_user_id,
    correlation_id,
    idempotency_key,
    payload
  )
  values (
    clean_event_key,
    nullif(trim(coalesce(p_aggregate_type, '')), ''),
    p_aggregate_id,
    p_actor_user_id,
    coalesce(p_idempotency_key, gen_random_uuid()::text),
    nullif(trim(coalesce(p_idempotency_key, '')), ''),
    clean_payload
  )
  on conflict do nothing
  returning *
  into event_record;

  if event_record.id is null and p_idempotency_key is not null then
    select *
    into event_record
    from public.notification_events
    where idempotency_key = p_idempotency_key
    limit 1;
  end if;

  foreach recipient_id in array coalesce(p_recipient_user_ids, '{}'::uuid[])
  loop
    if recipient_id is null then
      continue;
    end if;

    insert into public.notifications (
      user_id,
      recipient_user_id,
      event_id,
      event_key,
      category,
      priority,
      title,
      message,
      body,
      link,
      deep_link,
      metadata
    )
    values (
      recipient_id,
      recipient_id,
      event_record.id,
      clean_event_key,
      clean_category,
      clean_priority,
      left(clean_title, 180),
      left(clean_body, 1000),
      left(clean_body, 1000),
      safe_link,
      safe_link,
      jsonb_build_object(
        'aggregate_type',
        p_aggregate_type,
        'aggregate_id',
        p_aggregate_id
      )
    )
    on conflict (event_id, recipient_user_id) where event_id is not null
    do nothing;

    if found then
      created_count := created_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'event_id',
    event_record.id,
    'event_key',
    event_record.event_key,
    'created_notifications',
    created_count
  );
end;
$$;

create or replace function public.mark_notification_read(
  p_notification_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_notification public.notifications;
begin
  update public.notifications
  set
    read_at = coalesce(read_at, now()),
    is_read = true
  where id = p_notification_id
    and recipient_user_id = auth.uid()
  returning *
  into updated_notification;

  if updated_notification.id is null then
    raise exception 'NOTIFICATION_UNAUTHORIZED';
  end if;

  return jsonb_build_object(
    'id',
    updated_notification.id,
    'read_at',
    updated_notification.read_at
  );
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  update public.notifications
  set
    read_at = coalesce(read_at, now()),
    is_read = true
  where recipient_user_id = auth.uid()
    and read_at is null;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

alter table public.notification_events enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_category_preferences enable row level security;
alter table public.notification_user_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_delivery_jobs enable row level security;
alter table public.notification_delivery_attempts enable row level security;

drop policy if exists notification_events_admin_select
on public.notification_events;

create policy notification_events_admin_select
on public.notification_events
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists notification_templates_admin_select
on public.notification_templates;

create policy notification_templates_admin_select
on public.notification_templates
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists notification_preferences_owner_select
on public.notification_preferences;

create policy notification_preferences_owner_select
on public.notification_preferences
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists notification_preferences_owner_insert
on public.notification_preferences;

create policy notification_preferences_owner_insert
on public.notification_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists notification_preferences_owner_update
on public.notification_preferences;

create policy notification_preferences_owner_update
on public.notification_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notification_category_preferences_owner_select
on public.notification_category_preferences;

create policy notification_category_preferences_owner_select
on public.notification_category_preferences
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists notification_category_preferences_owner_insert
on public.notification_category_preferences;

create policy notification_category_preferences_owner_insert
on public.notification_category_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists notification_category_preferences_owner_update
on public.notification_category_preferences;

create policy notification_category_preferences_owner_update
on public.notification_category_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notification_user_settings_owner_select
on public.notification_user_settings;

create policy notification_user_settings_owner_select
on public.notification_user_settings
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists notification_user_settings_owner_insert
on public.notification_user_settings;

create policy notification_user_settings_owner_insert
on public.notification_user_settings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists notification_user_settings_owner_update
on public.notification_user_settings;

create policy notification_user_settings_owner_update
on public.notification_user_settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists push_subscriptions_owner_select
on public.push_subscriptions;

create policy push_subscriptions_owner_select
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists push_subscriptions_owner_insert
on public.push_subscriptions;

create policy push_subscriptions_owner_insert
on public.push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists push_subscriptions_owner_update
on public.push_subscriptions;

create policy push_subscriptions_owner_update
on public.push_subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notification_delivery_jobs_admin_select
on public.notification_delivery_jobs;

create policy notification_delivery_jobs_admin_select
on public.notification_delivery_jobs
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists notification_delivery_attempts_admin_select
on public.notification_delivery_attempts;

create policy notification_delivery_attempts_admin_select
on public.notification_delivery_attempts
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists notifications_owner_select
on public.notifications;

create policy notifications_owner_select
on public.notifications
for select
to authenticated
using (
  recipient_user_id = auth.uid()
  or user_id = auth.uid()
  or public.current_user_is_admin()
);

drop policy if exists notifications_owner_update
on public.notifications;

create policy notifications_owner_update
on public.notifications
for update
to authenticated
using (
  recipient_user_id = auth.uid()
  or user_id = auth.uid()
  or public.current_user_is_admin()
)
with check (
  recipient_user_id = auth.uid()
  or user_id = auth.uid()
  or public.current_user_is_admin()
);

revoke all on public.notification_events from anon;
revoke all on public.notification_events from authenticated;
grant select on public.notification_events to authenticated;

revoke all on public.notification_templates from anon;
revoke all on public.notification_templates from authenticated;
grant select on public.notification_templates to authenticated;

revoke all on public.notification_preferences from anon;
revoke all on public.notification_preferences from authenticated;
grant select, insert on public.notification_preferences to authenticated;
grant update (
  in_app_enabled,
  email_enabled,
  push_enabled,
  sms_enabled,
  whatsapp_enabled
) on public.notification_preferences to authenticated;

revoke all on public.notification_category_preferences from anon;
revoke all on public.notification_category_preferences from authenticated;
grant select, insert on public.notification_category_preferences to authenticated;
grant update (
  in_app_enabled,
  email_enabled,
  push_enabled,
  sms_enabled,
  whatsapp_enabled
) on public.notification_category_preferences to authenticated;

revoke all on public.notification_user_settings from anon;
revoke all on public.notification_user_settings from authenticated;
grant select, insert on public.notification_user_settings to authenticated;
grant update (
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end,
  timezone,
  marketing_enabled,
  digest_frequency
) on public.notification_user_settings to authenticated;

revoke all on public.push_subscriptions from anon;
revoke all on public.push_subscriptions from authenticated;
grant select, insert on public.push_subscriptions to authenticated;
grant update (
  revoked_at,
  last_used_at,
  user_agent
) on public.push_subscriptions to authenticated;

revoke all on public.notification_delivery_jobs from anon;
revoke all on public.notification_delivery_jobs from authenticated;
grant select on public.notification_delivery_jobs to authenticated;

revoke all on public.notification_delivery_attempts from anon;
revoke all on public.notification_delivery_attempts from authenticated;
grant select on public.notification_delivery_attempts to authenticated;

revoke all on function public.publish_notification_event(
  text,
  uuid[],
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  jsonb
) from public;

revoke all on function public.validate_notification_deep_link(text) from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;

grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

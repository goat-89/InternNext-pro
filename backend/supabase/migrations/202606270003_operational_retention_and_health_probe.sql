-- Automated retention for privacy-safe operational events and a minimal
-- database probe used only by the public platform-health Edge Function.

create table if not exists public.operational_event_retention_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true,
  resolved_event_days integer not null default 90
    check (resolved_event_days between 7 and 730),
  ignored_event_days integer not null default 30
    check (ignored_event_days between 7 and 365),
  open_noncritical_event_days integer not null default 90
    check (open_noncritical_event_days between 30 and 730),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.operational_event_retention_settings (id)
values (1)
on conflict (id) do nothing;

create or replace function public.set_operational_event_retention_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists operational_event_retention_settings_set_updated_at
on public.operational_event_retention_settings;

create trigger operational_event_retention_settings_set_updated_at
before update on public.operational_event_retention_settings
for each row
execute function public.set_operational_event_retention_updated_at();

revoke all
on function public.set_operational_event_retention_updated_at()
from public, anon, authenticated;

alter table public.operational_event_retention_settings
enable row level security;

drop policy if exists operational_event_retention_settings_admin_select
on public.operational_event_retention_settings;

create policy operational_event_retention_settings_admin_select
on public.operational_event_retention_settings
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists operational_event_retention_settings_admin_update
on public.operational_event_retention_settings;

create policy operational_event_retention_settings_admin_update
on public.operational_event_retention_settings
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

revoke all
on public.operational_event_retention_settings
from anon, authenticated;

create or replace function public.get_admin_operational_event_retention_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  settings_record public.operational_event_retention_settings;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select *
  into settings_record
  from public.operational_event_retention_settings
  where id = 1;

  return to_jsonb(settings_record);
end;
$$;

create or replace function public.update_admin_operational_event_retention_settings(
  p_settings_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_record public.operational_event_retention_settings;
  updated_record public.operational_event_retention_settings;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select *
  into previous_record
  from public.operational_event_retention_settings
  where id = 1;

  update public.operational_event_retention_settings
  set
    enabled = coalesce(
      (p_settings_patch ->> 'enabled')::boolean,
      enabled
    ),
    resolved_event_days = coalesce(
      (p_settings_patch ->> 'resolved_event_days')::integer,
      resolved_event_days
    ),
    ignored_event_days = coalesce(
      (p_settings_patch ->> 'ignored_event_days')::integer,
      ignored_event_days
    ),
    open_noncritical_event_days = coalesce(
      (p_settings_patch ->> 'open_noncritical_event_days')::integer,
      open_noncritical_event_days
    ),
    updated_by = auth.uid()
  where id = 1
  returning *
  into updated_record;

  perform public.audit_admin_action(
    'operational_event_retention_settings',
    '1',
    'update_operational_event_retention_settings',
    to_jsonb(previous_record),
    to_jsonb(updated_record)
  );

  return to_jsonb(updated_record);
end;
$$;

create or replace function public.cleanup_operational_event_retention(
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings_record public.operational_event_retention_settings;
  resolved_events integer := 0;
  ignored_events integer := 0;
  open_noncritical_events integer := 0;
begin
  select *
  into settings_record
  from public.operational_event_retention_settings
  where id = 1;

  if settings_record.id is null then
    raise exception 'OPERATIONAL_EVENT_RETENTION_NOT_CONFIGURED';
  end if;

  if not settings_record.enabled then
    return jsonb_build_object(
      'dry_run', p_dry_run,
      'enabled', false,
      'resolved_events', 0,
      'ignored_events', 0,
      'open_noncritical_events', 0,
      'total_events', 0
    );
  end if;

  select count(*)::integer
  into resolved_events
  from public.operational_events
  where status = 'resolved'
    and coalesce(resolved_at, occurred_at) <
      now() - make_interval(days => settings_record.resolved_event_days);

  select count(*)::integer
  into ignored_events
  from public.operational_events
  where status = 'ignored'
    and coalesce(resolved_at, occurred_at) <
      now() - make_interval(days => settings_record.ignored_event_days);

  select count(*)::integer
  into open_noncritical_events
  from public.operational_events
  where status = 'open'
    and severity in ('info', 'warning')
    and occurred_at <
      now() - make_interval(days => settings_record.open_noncritical_event_days);

  if not p_dry_run then
    delete from public.operational_events
    where status = 'resolved'
      and coalesce(resolved_at, occurred_at) <
        now() - make_interval(days => settings_record.resolved_event_days);

    delete from public.operational_events
    where status = 'ignored'
      and coalesce(resolved_at, occurred_at) <
        now() - make_interval(days => settings_record.ignored_event_days);

    delete from public.operational_events
    where status = 'open'
      and severity in ('info', 'warning')
      and occurred_at <
        now() - make_interval(days => settings_record.open_noncritical_event_days);
  end if;

  return jsonb_build_object(
    'dry_run', p_dry_run,
    'enabled', true,
    'resolved_events', resolved_events,
    'ignored_events', ignored_events,
    'open_noncritical_events', open_noncritical_events,
    'total_events',
      resolved_events + ignored_events + open_noncritical_events
  );
end;
$$;

create or replace function public.admin_cleanup_operational_event_retention(
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  result := public.cleanup_operational_event_retention(p_dry_run);

  if not p_dry_run then
    perform public.audit_admin_action(
      'operational_event_retention',
      '1',
      'cleanup_operational_event_retention',
      null,
      result
    );
  end if;

  return result;
end;
$$;

create or replace function public.install_operational_event_retention_schedule(
  p_cron_expression text default '31 3 * * *'
)
returns text
language plpgsql
security definer
set search_path = public, cron, extensions
as $$
declare
  clean_cron_expression text :=
    nullif(trim(coalesce(p_cron_expression, '')), '');
  job_name text := 'internnext-operational-event-retention-cleanup';
begin
  if clean_cron_expression is null then
    raise exception 'OPERATIONAL_EVENT_RETENTION_CRON_INVALID';
  end if;

  if exists (
    select 1
    from cron.job
    where jobname = job_name
  ) then
    perform cron.unschedule(job_name);
  end if;

  perform cron.schedule(
    job_name,
    clean_cron_expression,
    'select public.cleanup_operational_event_retention(false);'
  );

  return job_name;
end;
$$;

create or replace function public.remove_operational_event_retention_schedule()
returns boolean
language plpgsql
security definer
set search_path = public, cron, extensions
as $$
declare
  job_name text := 'internnext-operational-event-retention-cleanup';
begin
  if exists (
    select 1
    from cron.job
    where jobname = job_name
  ) then
    return cron.unschedule(job_name);
  end if;

  return false;
end;
$$;

create or replace function public.get_platform_health_probe()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  settings_available boolean;
begin
  select exists (
    select 1
    from public.platform_settings
    where id = 1
  )
  into settings_available;

  if not settings_available then
    raise exception 'PLATFORM_NOT_CONFIGURED';
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'checked_at', now()
  );
end;
$$;

revoke all
on function public.get_admin_operational_event_retention_settings()
from public, anon;

revoke all
on function public.update_admin_operational_event_retention_settings(jsonb)
from public, anon;

revoke all
on function public.cleanup_operational_event_retention(boolean)
from public, anon, authenticated;

revoke all
on function public.admin_cleanup_operational_event_retention(boolean)
from public, anon;

revoke all
on function public.install_operational_event_retention_schedule(text)
from public, anon, authenticated;

revoke all
on function public.remove_operational_event_retention_schedule()
from public, anon, authenticated;

revoke all
on function public.get_platform_health_probe()
from public, anon, authenticated;

grant execute
on function public.get_admin_operational_event_retention_settings()
to authenticated;

grant execute
on function public.update_admin_operational_event_retention_settings(jsonb)
to authenticated;

grant execute
on function public.admin_cleanup_operational_event_retention(boolean)
to authenticated;

grant execute
on function public.get_platform_health_probe()
to service_role;

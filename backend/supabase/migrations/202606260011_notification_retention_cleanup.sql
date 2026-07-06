-- Notification retention and cleanup.
-- Conservative defaults keep active unread notification rows intact.

create table if not exists public.notification_retention_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true,
  read_notification_days integer not null default 180 check (read_notification_days between 30 and 1095),
  archived_notification_days integer not null default 30 check (archived_notification_days between 7 and 365),
  expired_notification_grace_days integer not null default 7 check (expired_notification_grace_days between 0 and 365),
  delivery_job_days integer not null default 180 check (delivery_job_days between 30 and 1095),
  delivery_attempt_days integer not null default 180 check (delivery_attempt_days between 30 and 1095),
  worker_run_days integer not null default 90 check (worker_run_days between 7 and 365),
  updated_at timestamptz not null default now()
);

insert into public.notification_retention_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists notification_retention_settings_set_updated_at
on public.notification_retention_settings;

create trigger notification_retention_settings_set_updated_at
before update on public.notification_retention_settings
for each row
execute function public.set_notification_updated_at();

alter table public.notification_retention_settings enable row level security;

drop policy if exists notification_retention_settings_admin_select
on public.notification_retention_settings;

create policy notification_retention_settings_admin_select
on public.notification_retention_settings
for select
to authenticated
using (public.current_user_is_admin());

revoke all on public.notification_retention_settings from anon;
revoke all on public.notification_retention_settings from authenticated;
grant select on public.notification_retention_settings to authenticated;

create or replace function public.get_admin_notification_retention_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_record public.notification_retention_settings;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select *
  into settings_record
  from public.notification_retention_settings
  where id = 1;

  return to_jsonb(settings_record);
end;
$$;

create or replace function public.update_admin_notification_retention_settings(
  p_settings_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_record public.notification_retention_settings;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  update public.notification_retention_settings
  set
    enabled = coalesce((p_settings_patch ->> 'enabled')::boolean, enabled),
    read_notification_days = coalesce((p_settings_patch ->> 'read_notification_days')::integer, read_notification_days),
    archived_notification_days = coalesce((p_settings_patch ->> 'archived_notification_days')::integer, archived_notification_days),
    expired_notification_grace_days = coalesce((p_settings_patch ->> 'expired_notification_grace_days')::integer, expired_notification_grace_days),
    delivery_job_days = coalesce((p_settings_patch ->> 'delivery_job_days')::integer, delivery_job_days),
    delivery_attempt_days = coalesce((p_settings_patch ->> 'delivery_attempt_days')::integer, delivery_attempt_days),
    worker_run_days = coalesce((p_settings_patch ->> 'worker_run_days')::integer, worker_run_days)
  where id = 1
  returning *
  into updated_record;

  perform public.audit_admin_action(
    'notification_retention_settings',
    '1',
    'update_notification_retention_settings',
    null,
    to_jsonb(updated_record)
  );

  return to_jsonb(updated_record);
end;
$$;

create or replace function public.cleanup_notification_retention(
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_record public.notification_retention_settings;
  expired_notifications integer := 0;
  archived_notifications integer := 0;
  read_notifications integer := 0;
  delivery_jobs integer := 0;
  delivery_attempts integer := 0;
  worker_runs integer := 0;
begin
  select *
  into settings_record
  from public.notification_retention_settings
  where id = 1;

  if settings_record.id is null then
    raise exception 'NOTIFICATION_RETENTION_NOT_CONFIGURED';
  end if;

  if not settings_record.enabled then
    return jsonb_build_object(
      'dry_run',
      p_dry_run,
      'enabled',
      false,
      'expired_notifications',
      0,
      'archived_notifications',
      0,
      'read_notifications',
      0,
      'delivery_jobs',
      0,
      'delivery_attempts',
      0,
      'worker_runs',
      0
    );
  end if;

  select count(*)::integer
  into expired_notifications
  from public.notifications
  where expires_at is not null
    and expires_at < now() - make_interval(days => settings_record.expired_notification_grace_days)
    and read_at is not null;

  select count(*)::integer
  into archived_notifications
  from public.notifications
  where archived_at is not null
    and archived_at < now() - make_interval(days => settings_record.archived_notification_days);

  select count(*)::integer
  into read_notifications
  from public.notifications
  where read_at is not null
    and archived_at is null
    and created_at < now() - make_interval(days => settings_record.read_notification_days);

  select count(*)::integer
  into delivery_jobs
  from public.notification_delivery_jobs
  where status in ('delivered', 'failed', 'cancelled', 'skipped', 'suppressed')
    and updated_at < now() - make_interval(days => settings_record.delivery_job_days);

  select count(*)::integer
  into delivery_attempts
  from public.notification_delivery_attempts a
  where attempted_at < now() - make_interval(days => settings_record.delivery_attempt_days)
    and not exists (
      select 1
      from public.notification_delivery_jobs j
      where j.id = a.delivery_job_id
    );

  select count(*)::integer
  into worker_runs
  from public.notification_worker_runs
  where started_at < now() - make_interval(days => settings_record.worker_run_days)
    and status in ('completed', 'failed');

  if not p_dry_run then
    delete from public.notifications
    where expires_at is not null
      and expires_at < now() - make_interval(days => settings_record.expired_notification_grace_days)
      and read_at is not null;

    delete from public.notifications
    where archived_at is not null
      and archived_at < now() - make_interval(days => settings_record.archived_notification_days);

    delete from public.notifications
    where read_at is not null
      and archived_at is null
      and created_at < now() - make_interval(days => settings_record.read_notification_days);

    delete from public.notification_delivery_jobs
    where status in ('delivered', 'failed', 'cancelled', 'skipped', 'suppressed')
      and updated_at < now() - make_interval(days => settings_record.delivery_job_days);

    delete from public.notification_delivery_attempts a
    where attempted_at < now() - make_interval(days => settings_record.delivery_attempt_days)
      and not exists (
        select 1
        from public.notification_delivery_jobs j
        where j.id = a.delivery_job_id
      );

    delete from public.notification_worker_runs
    where started_at < now() - make_interval(days => settings_record.worker_run_days)
      and status in ('completed', 'failed');
  end if;

  return jsonb_build_object(
    'dry_run',
    p_dry_run,
    'enabled',
    true,
    'expired_notifications',
    expired_notifications,
    'archived_notifications',
    archived_notifications,
    'read_notifications',
    read_notifications,
    'delivery_jobs',
    delivery_jobs,
    'delivery_attempts',
    delivery_attempts,
    'worker_runs',
    worker_runs
  );
end;
$$;

create or replace function public.admin_cleanup_notification_retention(
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  result := public.cleanup_notification_retention(p_dry_run);

  if not p_dry_run then
    perform public.audit_admin_action(
      'notification_retention',
      '1',
      'cleanup_notification_retention',
      null,
      result
    );
  end if;

  return result;
end;
$$;

create or replace function public.install_notification_retention_cleanup_schedule(
  p_cron_expression text default '17 3 * * *'
)
returns text
language plpgsql
security definer
set search_path = public, cron, extensions
as $$
declare
  clean_cron_expression text := nullif(trim(coalesce(p_cron_expression, '')), '');
  job_name text := 'internnext-notification-retention-cleanup';
begin
  if clean_cron_expression is null then
    raise exception 'NOTIFICATION_RETENTION_CRON_INVALID';
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
    'select public.cleanup_notification_retention(false);'
  );

  return job_name;
end;
$$;

create or replace function public.remove_notification_retention_cleanup_schedule()
returns boolean
language plpgsql
security definer
set search_path = public, cron, extensions
as $$
declare
  job_name text := 'internnext-notification-retention-cleanup';
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

revoke all on function public.get_admin_notification_retention_settings() from public;
revoke all on function public.update_admin_notification_retention_settings(jsonb) from public;
revoke all on function public.cleanup_notification_retention(boolean) from public;
revoke all on function public.admin_cleanup_notification_retention(boolean) from public;
revoke all on function public.install_notification_retention_cleanup_schedule(text) from public;
revoke all on function public.remove_notification_retention_cleanup_schedule() from public;

grant execute on function public.get_admin_notification_retention_settings() to authenticated;
grant execute on function public.update_admin_notification_retention_settings(jsonb) to authenticated;
grant execute on function public.admin_cleanup_notification_retention(boolean) to authenticated;

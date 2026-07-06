-- Notification delivery worker schedule support.
-- Uses pg_cron + pg_net to invoke the Edge Function from Postgres.
-- Required runtime values must be stored in Supabase Vault, not in this file.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.invoke_notification_delivery_worker(
  p_limit integer default 25
)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net, extensions
as $$
declare
  project_url text;
  publishable_key text;
  worker_secret text;
  request_id bigint;
  safe_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
begin
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'notification_worker_project_url'
  limit 1;

  select decrypted_secret
  into publishable_key
  from vault.decrypted_secrets
  where name = 'notification_worker_publishable_key'
  limit 1;

  select decrypted_secret
  into worker_secret
  from vault.decrypted_secrets
  where name = 'notification_worker_secret'
  limit 1;

  project_url := nullif(trim(coalesce(project_url, '')), '');
  publishable_key := nullif(trim(coalesce(publishable_key, '')), '');
  worker_secret := nullif(trim(coalesce(worker_secret, '')), '');

  if project_url is null or publishable_key is null then
    raise exception 'NOTIFICATION_WORKER_SCHEDULE_NOT_CONFIGURED';
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/notification-delivery-worker',
    headers := jsonb_build_object(
      'Content-Type',
      'application/json',
      'apikey',
      publishable_key,
      'Authorization',
      'Bearer ' || publishable_key,
      'x-notification-worker-secret',
      coalesce(worker_secret, '')
    ),
    body := jsonb_build_object(
      'limit',
      safe_limit,
      'worker_id',
      'pg-cron-notification-delivery-worker'
    )
  )
  into request_id;

  return request_id;
end;
$$;

create or replace function public.install_notification_delivery_worker_schedule(
  p_cron_expression text default '* * * * *',
  p_limit integer default 25
)
returns text
language plpgsql
security definer
set search_path = public, cron, extensions
as $$
declare
  clean_cron_expression text := nullif(trim(coalesce(p_cron_expression, '')), '');
  safe_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  job_name text := 'internnext-notification-delivery-worker';
begin
  if clean_cron_expression is null then
    raise exception 'NOTIFICATION_WORKER_CRON_INVALID';
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
    format(
      'select public.invoke_notification_delivery_worker(%s);',
      safe_limit
    )
  );

  return job_name;
end;
$$;

create or replace function public.remove_notification_delivery_worker_schedule()
returns boolean
language plpgsql
security definer
set search_path = public, cron, extensions
as $$
declare
  job_name text := 'internnext-notification-delivery-worker';
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

revoke all on function public.invoke_notification_delivery_worker(integer) from public;
revoke all on function public.install_notification_delivery_worker_schedule(text, integer) from public;
revoke all on function public.remove_notification_delivery_worker_schedule() from public;

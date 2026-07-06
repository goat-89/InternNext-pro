-- Notification digest generation support.

create table if not exists public.notification_digest_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  frequency text not null check (frequency in ('daily', 'weekly')),
  last_sent_at timestamptz,
  last_notification_count integer not null default 0 check (last_notification_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, frequency)
);

drop trigger if exists notification_digest_state_set_updated_at
on public.notification_digest_state;

create trigger notification_digest_state_set_updated_at
before update on public.notification_digest_state
for each row
execute function public.set_notification_updated_at();

alter table public.notification_digest_state enable row level security;

drop policy if exists notification_digest_state_admin_select
on public.notification_digest_state;

create policy notification_digest_state_admin_select
on public.notification_digest_state
for select
to authenticated
using (public.current_user_is_admin());

revoke all on public.notification_digest_state from anon;
revoke all on public.notification_digest_state from authenticated;
grant select on public.notification_digest_state to authenticated;

create or replace function public.create_notification_digest_jobs(
  p_frequency text default 'daily'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_frequency text := lower(trim(coalesce(p_frequency, 'daily')));
  digest_interval interval;
  digest_key_suffix text;
  provider_status jsonb;
  email_enabled boolean;
  candidate record;
  event_record public.notification_events;
  notification_record public.notifications;
  digest_title text;
  digest_body text;
  digest_link text;
  created_count integer := 0;
  skipped_count integer := 0;
begin
  if clean_frequency not in ('daily', 'weekly') then
    raise exception 'NOTIFICATION_DIGEST_FREQUENCY_INVALID';
  end if;

  digest_interval := case
    when clean_frequency = 'weekly' then interval '7 days'
    else interval '1 day'
  end;

  digest_key_suffix := case
    when clean_frequency = 'weekly' then to_char(now(), 'IYYY-IW')
    else to_char(now(), 'YYYY-MM-DD')
  end;

  provider_status := public.get_notification_provider_status();
  email_enabled := coalesce((provider_status ->> 'email')::boolean, false);

  if not email_enabled then
    return jsonb_build_object(
      'frequency',
      clean_frequency,
      'provider_enabled',
      false,
      'created',
      0,
      'skipped',
      0
    );
  end if;

  for candidate in
    select
      p.id as user_id,
      p.email,
      p.full_name,
      p.role::text as role,
      coalesce(ds.last_sent_at, now() - digest_interval) as last_sent_at,
      count(n.id)::integer as unread_count,
      array_agg(n.id order by n.created_at desc) filter (where n.id is not null) as notification_ids
    from public.profiles p
    join public.notification_user_settings s
      on s.user_id = p.id
    left join public.notification_digest_state ds
      on ds.user_id = p.id
      and ds.frequency = clean_frequency
    join public.notifications n
      on n.recipient_user_id = p.id
      and n.read_at is null
      and n.archived_at is null
      and n.category <> 'security'
      and n.event_key not like 'notification_digest_%'
      and n.created_at > coalesce(ds.last_sent_at, now() - digest_interval)
    where coalesce(p.account_status::text, 'active') = 'active'
      and nullif(trim(coalesce(p.email, '')), '') is not null
      and s.digest_frequency = clean_frequency
      and (
        ds.last_sent_at is null
        or ds.last_sent_at <= now() - digest_interval
      )
    group by
      p.id,
      p.email,
      p.full_name,
      p.role,
      ds.last_sent_at
    having count(n.id) > 0
  loop
    digest_link := case
      when candidate.role = 'admin' then '/admin/notifications'
      when candidate.role = 'employer' then '/employer/notifications'
      else '/student/notifications'
    end;

    digest_title := case
      when clean_frequency = 'weekly' then 'Weekly notification digest'
      else 'Daily notification digest'
    end;

    digest_body :=
      'You have ' ||
      candidate.unread_count::text ||
      ' unread InternNext update' ||
      case when candidate.unread_count = 1 then '' else 's' end ||
      ' waiting for you.';

    insert into public.notification_events (
      event_key,
      aggregate_type,
      aggregate_id,
      correlation_id,
      idempotency_key,
      payload
    )
    values (
      'notification_digest_' || clean_frequency,
      'profile',
      candidate.user_id,
      'notification-digest-' || clean_frequency,
      'notification-digest:' || clean_frequency || ':' || candidate.user_id::text || ':' || digest_key_suffix,
      jsonb_build_object(
        'frequency',
        clean_frequency,
        'unread_count',
        candidate.unread_count,
        'notification_ids',
        candidate.notification_ids
      )
    )
    on conflict do nothing
    returning *
    into event_record;

    if event_record.id is null then
      skipped_count := skipped_count + 1;
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
      candidate.user_id,
      candidate.user_id,
      event_record.id,
      event_record.event_key,
      'system',
      'low',
      digest_title,
      digest_body,
      digest_body,
      digest_link,
      digest_link,
      jsonb_build_object(
        'digest',
        true,
        'frequency',
        clean_frequency,
        'unread_count',
        candidate.unread_count
      )
    )
    returning *
    into notification_record;

    insert into public.notification_delivery_jobs (
      notification_id,
      recipient_user_id,
      channel,
      provider,
      status,
      scheduled_at,
      next_attempt_at,
      metadata
    )
    values (
      notification_record.id,
      candidate.user_id,
      'email',
      'resend',
      'pending',
      now(),
      now(),
      jsonb_build_object(
        'digest',
        true,
        'frequency',
        clean_frequency,
        'unread_count',
        candidate.unread_count
      )
    )
    on conflict (notification_id, channel) where notification_id is not null
    do nothing;

    insert into public.notification_digest_state (
      user_id,
      frequency,
      last_sent_at,
      last_notification_count
    )
    values (
      candidate.user_id,
      clean_frequency,
      now(),
      candidate.unread_count
    )
    on conflict (user_id, frequency) do update
    set
      last_sent_at = excluded.last_sent_at,
      last_notification_count = excluded.last_notification_count;

    created_count := created_count + 1;
  end loop;

  return jsonb_build_object(
    'frequency',
    clean_frequency,
    'provider_enabled',
    true,
    'created',
    created_count,
    'skipped',
    skipped_count
  );
end;
$$;

create or replace function public.admin_create_notification_digest_jobs(
  p_frequency text default 'daily'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return public.create_notification_digest_jobs(p_frequency);
end;
$$;

revoke all on function public.create_notification_digest_jobs(text) from public;
revoke all on function public.admin_create_notification_digest_jobs(text) from public;

grant execute on function public.create_notification_digest_jobs(text) to service_role;
grant execute on function public.admin_create_notification_digest_jobs(text) to authenticated;

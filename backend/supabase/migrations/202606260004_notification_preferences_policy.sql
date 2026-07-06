-- Notification preferences, quiet hours and digest settings RPCs.
-- Depends on notification engine foundation.

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
    jsonb_build_object(
      'email', false,
      'web_push', false,
      'sms', false,
      'whatsapp', false
    )
  );
end;
$$;

create or replace function public.update_my_notification_preferences(
  p_settings jsonb default '{}'::jsonb,
  p_category_preferences jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  clean_timezone text := nullif(trim(coalesce(p_settings ->> 'timezone', '')), '');
  clean_digest text := coalesce(nullif(trim(p_settings ->> 'digest_frequency'), ''), 'never');
  quiet_enabled boolean := coalesce((p_settings ->> 'quiet_hours_enabled')::boolean, false);
  marketing_enabled boolean := coalesce((p_settings ->> 'marketing_enabled')::boolean, false);
  quiet_start time := nullif(p_settings ->> 'quiet_hours_start', '')::time;
  quiet_end time := nullif(p_settings ->> 'quiet_hours_end', '')::time;
  category_record record;
  clean_category text;
  in_app_enabled boolean;
  email_enabled boolean;
  push_enabled boolean;
  sms_enabled boolean;
  whatsapp_enabled boolean;
begin
  if current_user_id is null then
    raise exception 'NOTIFICATION_UNAUTHORIZED';
  end if;

  if clean_digest not in ('daily', 'weekly', 'never') then
    raise exception 'NOTIFICATION_EVENT_INVALID';
  end if;

  clean_timezone := coalesce(clean_timezone, 'Asia/Kolkata');

  insert into public.notification_user_settings (
    user_id,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    timezone,
    marketing_enabled,
    digest_frequency
  )
  values (
    current_user_id,
    quiet_enabled,
    quiet_start,
    quiet_end,
    clean_timezone,
    marketing_enabled,
    clean_digest
  )
  on conflict (user_id) do update
  set
    quiet_hours_enabled = excluded.quiet_hours_enabled,
    quiet_hours_start = excluded.quiet_hours_start,
    quiet_hours_end = excluded.quiet_hours_end,
    timezone = excluded.timezone,
    marketing_enabled = excluded.marketing_enabled,
    digest_frequency = excluded.digest_frequency;

  for category_record in
    select key, value
    from jsonb_each(coalesce(p_category_preferences, '{}'::jsonb))
  loop
    clean_category := category_record.key;

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

    in_app_enabled := coalesce((category_record.value ->> 'in_app_enabled')::boolean, true);
    email_enabled := coalesce((category_record.value ->> 'email_enabled')::boolean, true);
    push_enabled := coalesce((category_record.value ->> 'push_enabled')::boolean, false);
    sms_enabled := coalesce((category_record.value ->> 'sms_enabled')::boolean, false);
    whatsapp_enabled := coalesce((category_record.value ->> 'whatsapp_enabled')::boolean, false);

    if clean_category = 'security' then
      in_app_enabled := true;
      email_enabled := true;
    end if;

    if not (
      in_app_enabled or
      email_enabled or
      push_enabled or
      sms_enabled or
      whatsapp_enabled
    ) then
      in_app_enabled := true;
    end if;

    insert into public.notification_category_preferences (
      user_id,
      category,
      in_app_enabled,
      email_enabled,
      push_enabled,
      sms_enabled,
      whatsapp_enabled
    )
    values (
      current_user_id,
      clean_category,
      in_app_enabled,
      email_enabled,
      push_enabled,
      sms_enabled,
      whatsapp_enabled
    )
    on conflict (user_id, category) do update
    set
      in_app_enabled = excluded.in_app_enabled,
      email_enabled = excluded.email_enabled,
      push_enabled = excluded.push_enabled,
      sms_enabled = excluded.sms_enabled,
      whatsapp_enabled = excluded.whatsapp_enabled;
  end loop;

  return public.get_my_notification_preferences();
end;
$$;

revoke insert, update, delete
on public.notification_preferences
from authenticated;

revoke insert, update, delete
on public.notification_category_preferences
from authenticated;

revoke insert, update, delete
on public.notification_user_settings
from authenticated;

grant select
on public.notification_preferences
to authenticated;

grant select
on public.notification_category_preferences
to authenticated;

grant select
on public.notification_user_settings
to authenticated;

revoke all on function public.get_my_notification_preferences() from public;
revoke all on function public.update_my_notification_preferences(jsonb, jsonb) from public;

grant execute on function public.get_my_notification_preferences() to authenticated;
grant execute on function public.update_my_notification_preferences(jsonb, jsonb) to authenticated;

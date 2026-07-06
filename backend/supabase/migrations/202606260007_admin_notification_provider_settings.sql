-- Admin RPCs for notification provider settings.
-- API keys stay in Edge Function environment variables and are never stored here.

create or replace function public.get_admin_notification_provider_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_rows jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'channel', channel,
        'provider', provider,
        'is_enabled', is_enabled,
        'from_email', from_email,
        'from_name', from_name,
        'reply_to_email', reply_to_email,
        'metadata', metadata,
        'updated_at', updated_at
      )
      order by channel
    ),
    '[]'::jsonb
  )
  into provider_rows
  from public.notification_provider_settings;

  return provider_rows;
end;
$$;

create or replace function public.update_admin_notification_provider_setting(
  p_channel text,
  p_settings_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_channel text := lower(trim(coalesce(p_channel, '')));
  clean_provider text;
  clean_from_email text;
  clean_from_name text;
  clean_reply_to_email text;
  enabled_value boolean;
  updated_row public.notification_provider_settings;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if clean_channel not in ('email', 'web_push', 'sms', 'whatsapp') then
    raise exception 'NOTIFICATION_PROVIDER_INVALID';
  end if;

  if coalesce(p_settings_patch, '{}'::jsonb) = '{}'::jsonb then
    raise exception 'NOTIFICATION_PROVIDER_PATCH_EMPTY';
  end if;

  if clean_channel = 'email' then
    clean_provider := lower(
      trim(
        coalesce(
          p_settings_patch ->> 'provider',
          'resend'
        )
      )
    );

    if clean_provider <> 'resend' then
      raise exception 'NOTIFICATION_PROVIDER_INVALID';
    end if;
  else
    clean_provider := clean_channel;
  end if;

  enabled_value := coalesce(
    (p_settings_patch ->> 'is_enabled')::boolean,
    false
  );

  clean_from_email :=
    nullif(trim(coalesce(p_settings_patch ->> 'from_email', '')), '');

  clean_from_name :=
    nullif(trim(coalesce(p_settings_patch ->> 'from_name', '')), '');

  clean_reply_to_email :=
    nullif(trim(coalesce(p_settings_patch ->> 'reply_to_email', '')), '');

  if clean_channel = 'email' then
    if enabled_value and clean_from_email is null then
      raise exception 'NOTIFICATION_EMAIL_FROM_REQUIRED';
    end if;

    if clean_from_email is not null
      and clean_from_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'NOTIFICATION_EMAIL_INVALID';
    end if;

    if clean_reply_to_email is not null
      and clean_reply_to_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'NOTIFICATION_EMAIL_INVALID';
    end if;
  end if;

  insert into public.notification_provider_settings (
    channel,
    provider,
    is_enabled,
    from_email,
    from_name,
    reply_to_email
  )
  values (
    clean_channel,
    clean_provider,
    enabled_value,
    clean_from_email,
    coalesce(clean_from_name, 'InternNext Pro'),
    clean_reply_to_email
  )
  on conflict (channel) do update
  set
    provider = excluded.provider,
    is_enabled = excluded.is_enabled,
    from_email = excluded.from_email,
    from_name = excluded.from_name,
    reply_to_email = excluded.reply_to_email
  returning *
  into updated_row;

  perform public.audit_admin_action(
    'notification_provider_settings',
    clean_channel,
    'update_notification_provider_setting',
    null,
    to_jsonb(updated_row)
  );

  return jsonb_build_object(
    'channel', updated_row.channel,
    'provider', updated_row.provider,
    'is_enabled', updated_row.is_enabled,
    'from_email', updated_row.from_email,
    'from_name', updated_row.from_name,
    'reply_to_email', updated_row.reply_to_email,
    'metadata', updated_row.metadata,
    'updated_at', updated_row.updated_at
  );
end;
$$;

revoke all on function public.get_admin_notification_provider_settings() from public;
revoke all on function public.update_admin_notification_provider_setting(text, jsonb) from public;

grant execute on function public.get_admin_notification_provider_settings() to authenticated;
grant execute on function public.update_admin_notification_provider_setting(text, jsonb) to authenticated;

revoke insert, update, delete
on public.notification_provider_settings
from authenticated;

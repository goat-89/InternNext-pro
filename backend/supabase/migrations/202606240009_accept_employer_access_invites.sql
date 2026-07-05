begin;

-- =====================================================
-- EMPLOYER ACCESS INVITE ACCEPTANCE
-- =====================================================

drop function if exists
public.accept_employer_access_invite(text);

create or replace function
public.accept_employer_access_invite(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid :=
    auth.uid();

  current_profile public.profiles%rowtype;
  invite public.employer_access_invites%rowtype;
  updated_invite public.employer_access_invites%rowtype;
begin
  if current_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = current_user_id;

  if current_profile.id is null then
    raise exception
      'Authenticated profile could not be found.';
  end if;

  if current_profile.account_status::text =
    'suspended'
  then
    raise exception
      'This account is suspended.';
  end if;

  if current_profile.role::text <>
    'employer'
  then
    raise exception
      'Employer access is required.';
  end if;

  select *
  into invite
  from public.employer_access_invites
  where token =
    trim(coalesce(p_token, ''))
  for update;

  if invite.id is null then
    raise exception
      'This employer access invite is invalid.';
  end if;

  if invite.used_at is not null then
    raise exception
      'This employer access invite has already been used.';
  end if;

  if invite.revoked_at is not null then
    raise exception
      'This employer access invite has been revoked.';
  end if;

  if invite.expires_at <= now() then
    raise exception
      'This employer access invite has expired.';
  end if;

  if lower(invite.invited_email) <>
    lower(current_profile.email)
  then
    raise exception
      'This invite belongs to a different email address.';
  end if;

  update public.employer_access_invites
  set
    used_at = now(),
    status = 'used'
  where id = invite.id
    and used_at is null
    and revoked_at is null
    and expires_at > now()
  returning *
  into updated_invite;

  if updated_invite.id is null then
    raise exception
      'This employer access invite could not be accepted.';
  end if;

  return jsonb_build_object(
    'valid',
    true,
    'invite_id',
    updated_invite.id,
    'invited_email',
    updated_invite.invited_email,
    'company_name',
    updated_invite.company_name,
    'used_at',
    updated_invite.used_at,
    'status',
    updated_invite.status
  );
end;
$$;

revoke all
on function
public.accept_employer_access_invite(text)
from public;

grant execute
on function
public.accept_employer_access_invite(text)
to authenticated;

commit;

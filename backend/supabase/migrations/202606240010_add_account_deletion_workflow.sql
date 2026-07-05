begin;

-- =====================================================
-- ACCOUNT DELETION WORKFLOW
-- =====================================================

drop function if exists
public.request_account_deletion();

create or replace function
public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid :=
    auth.uid();

  current_profile public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = current_user_id
  for update;

  if current_profile.id is null then
    raise exception
      'Authenticated profile could not be found.';
  end if;

  if current_profile.role::text = 'admin' then
    raise exception
      'Administrator accounts cannot be deleted from the frontend.';
  end if;

  if current_profile.account_status::text =
    'deleted'
  then
    return jsonb_build_object(
      'deleted',
      true,
      'account_status',
      'deleted',
      'role',
      current_profile.role
    );
  end if;

  update public.profiles
  set
    account_status = 'deleted',
    onboarding_completed = false,
    updated_at = now()
  where id = current_user_id;

  if current_profile.role::text =
    'employer'
  then
    update public.companies
    set
      status = 'suspended',
      updated_at = now()
    where owner_id = current_user_id
      and status <> 'suspended';

    update public.internships
    set
      status = 'closed',
      updated_at = now()
    where employer_id = current_user_id
      and status not in (
        'closed',
        'rejected'
      );
  end if;

  return jsonb_build_object(
    'deleted',
    true,
    'account_status',
    'deleted',
    'role',
    current_profile.role
  );
end;
$$;

revoke all
on function
public.request_account_deletion()
from public;

grant execute
on function
public.request_account_deletion()
to authenticated;

commit;

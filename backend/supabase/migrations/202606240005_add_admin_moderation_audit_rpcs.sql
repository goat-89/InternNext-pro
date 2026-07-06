-- Admin moderation RPCs with audit logging.
-- Run this after the core schema and RLS migrations.

create or replace function public.admin_approve_company(
  p_company_id uuid
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  old_company public.companies;
  updated_company public.companies;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select *
  into old_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception 'Company not found.';
  end if;

  if old_company.status <> 'pending' then
    raise exception 'Only pending companies can be approved.';
  end if;

  update public.companies
  set
    status = 'approved',
    rejection_reason = null,
    verified_at = now(),
    updated_at = now()
  where id = p_company_id
  returning *
  into updated_company;

  perform public.audit_admin_action(
    'company',
    updated_company.id::text,
    'approve_company',
    to_jsonb(old_company),
    to_jsonb(updated_company)
  );

  return updated_company;
end;
$$;

create or replace function public.admin_reject_company(
  p_company_id uuid,
  p_rejection_reason text
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_reason text := trim(coalesce(p_rejection_reason, ''));
  old_company public.companies;
  updated_company public.companies;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if clean_reason = '' then
    raise exception 'A rejection reason is required.';
  end if;

  select *
  into old_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception 'Company not found.';
  end if;

  if old_company.status <> 'pending' then
    raise exception 'Only pending companies can be rejected.';
  end if;

  update public.companies
  set
    status = 'rejected',
    rejection_reason = clean_reason,
    verified_at = null,
    updated_at = now()
  where id = p_company_id
  returning *
  into updated_company;

  perform public.audit_admin_action(
    'company',
    updated_company.id::text,
    'reject_company',
    to_jsonb(old_company),
    to_jsonb(updated_company)
  );

  return updated_company;
end;
$$;

create or replace function public.admin_return_company_to_pending(
  p_company_id uuid
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  old_company public.companies;
  updated_company public.companies;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select *
  into old_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception 'Company not found.';
  end if;

  if old_company.status not in ('approved', 'rejected') then
    raise exception 'The company could not be returned to pending review.';
  end if;

  update public.companies
  set
    status = 'pending',
    rejection_reason = null,
    verified_at = null,
    updated_at = now()
  where id = p_company_id
  returning *
  into updated_company;

  perform public.audit_admin_action(
    'company',
    updated_company.id::text,
    'return_company_to_pending',
    to_jsonb(old_company),
    to_jsonb(updated_company)
  );

  return updated_company;
end;
$$;

create or replace function public.admin_approve_internship(
  p_internship_id uuid
)
returns public.internships
language plpgsql
security definer
set search_path = public
as $$
declare
  old_internship public.internships;
  updated_internship public.internships;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select *
  into old_internship
  from public.internships
  where id = p_internship_id
  for update;

  if not found then
    raise exception 'Internship not found.';
  end if;

  if old_internship.status <> 'pending' then
    raise exception 'Only pending internships can be approved.';
  end if;

  update public.internships
  set
    status = 'approved',
    rejection_reason = null,
    published_at = now(),
    updated_at = now()
  where id = p_internship_id
  returning *
  into updated_internship;

  perform public.audit_admin_action(
    'internship',
    updated_internship.id::text,
    'approve_internship',
    to_jsonb(old_internship),
    to_jsonb(updated_internship)
  );

  return updated_internship;
end;
$$;

create or replace function public.admin_reject_internship(
  p_internship_id uuid,
  p_rejection_reason text
)
returns public.internships
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_reason text := trim(coalesce(p_rejection_reason, ''));
  old_internship public.internships;
  updated_internship public.internships;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if clean_reason = '' then
    raise exception 'A rejection reason is required.';
  end if;

  select *
  into old_internship
  from public.internships
  where id = p_internship_id
  for update;

  if not found then
    raise exception 'Internship not found.';
  end if;

  if old_internship.status <> 'pending' then
    raise exception 'Only pending internships can be rejected.';
  end if;

  update public.internships
  set
    status = 'rejected',
    rejection_reason = clean_reason,
    published_at = null,
    updated_at = now()
  where id = p_internship_id
  returning *
  into updated_internship;

  perform public.audit_admin_action(
    'internship',
    updated_internship.id::text,
    'reject_internship',
    to_jsonb(old_internship),
    to_jsonb(updated_internship)
  );

  return updated_internship;
end;
$$;

create or replace function public.admin_update_student_account_status(
  p_student_id uuid,
  p_account_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  old_profile public.profiles;
  updated_profile public.profiles;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if p_account_status is null
    or p_account_status not in ('active', 'suspended')
  then
    raise exception 'Invalid account status.';
  end if;

  select *
  into old_profile
  from public.profiles
  where id = p_student_id
    and role = 'student'
  for update;

  if not found then
    raise exception 'Student not found or access denied.';
  end if;

  if p_account_status = 'active' then
    update public.profiles
    set
      account_status = 'active',
      updated_at = now()
    where id = p_student_id
      and role = 'student'
    returning *
    into updated_profile;
  else
    update public.profiles
    set
      account_status = 'suspended',
      updated_at = now()
    where id = p_student_id
      and role = 'student'
    returning *
    into updated_profile;
  end if;

  perform public.audit_admin_action(
    'profile',
    updated_profile.id::text,
    case
      when p_account_status = 'suspended'
        then 'suspend_student'
      else 'reactivate_student'
    end,
    to_jsonb(old_profile),
    to_jsonb(updated_profile)
  );

  return updated_profile;
end;
$$;

revoke all on function public.admin_approve_company(uuid) from public;
revoke all on function public.admin_reject_company(uuid, text) from public;
revoke all on function public.admin_return_company_to_pending(uuid) from public;
revoke all on function public.admin_approve_internship(uuid) from public;
revoke all on function public.admin_reject_internship(uuid, text) from public;
revoke all on function public.admin_update_student_account_status(uuid, text) from public;

grant execute on function public.admin_approve_company(uuid) to authenticated;
grant execute on function public.admin_reject_company(uuid, text) to authenticated;
grant execute on function public.admin_return_company_to_pending(uuid) to authenticated;
grant execute on function public.admin_approve_internship(uuid) to authenticated;
grant execute on function public.admin_reject_internship(uuid, text) to authenticated;
grant execute on function public.admin_update_student_account_status(uuid, text) to authenticated;

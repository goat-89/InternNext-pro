drop function if exists public.update_employer_company_profile(jsonb);

create or replace function public.update_employer_company_profile(profile_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  current_company public.companies%rowtype;
  company_id uuid;
  company_name text;
  next_status text;
  requires_review boolean := false;
  company_approval_required boolean := true;
  sensitive_changes boolean := false;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null then
    raise exception 'You must sign in as an employer.';
  end if;

  if current_profile.role <> 'employer' then
    raise exception 'Employer access is required.';
  end if;

  if current_profile.account_status = 'suspended' then
    raise exception 'This employer account is suspended.';
  end if;

  select *
  into current_company
  from public.companies
  where owner_id = auth.uid();

  if current_company.id is null then
    raise exception 'Complete employer onboarding before editing company settings.';
  end if;

  if current_company.status = 'suspended' then
    raise exception 'This company is suspended.';
  end if;

  company_name := nullif(trim(coalesce(profile_data->>'company_name', '')), '');

  if company_name is null then
    raise exception 'Company name is required.';
  end if;

  select coalesce(require_company_approval, true)
  into company_approval_required
  from public.platform_settings
  where id = 1;

  update public.profiles
  set
    full_name = nullif(trim(coalesce(profile_data->>'full_name', current_profile.full_name, '')), ''),
    phone = nullif(trim(coalesce(profile_data->>'phone', current_profile.phone, '')), '')
  where id = auth.uid()
    and role = 'employer';

  insert into public.employer_profiles (
    user_id,
    designation,
    department,
    linkedin_url
  )
  values (
    auth.uid(),
    nullif(trim(coalesce(profile_data->>'designation', '')), ''),
    nullif(trim(coalesce(profile_data->>'department', '')), ''),
    nullif(trim(coalesce(profile_data->>'linkedin_url', '')), '')
  )
  on conflict (user_id) do update
  set
    designation = excluded.designation,
    department = excluded.department,
    linkedin_url = excluded.linkedin_url;

  sensitive_changes :=
    company_name is distinct from current_company.name
    or nullif(trim(coalesce(profile_data->>'legal_name', '')), '') is distinct from current_company.legal_name
    or nullif(trim(coalesce(profile_data->>'description', '')), '') is distinct from current_company.description
    or nullif(trim(coalesce(profile_data->>'industry', '')), '') is distinct from current_company.industry
    or nullif(trim(coalesce(profile_data->>'company_type', '')), '') is distinct from current_company.company_type
    or nullif(trim(coalesce(profile_data->>'company_size', '')), '') is distinct from current_company.company_size
    or nullif(trim(coalesce(profile_data->>'founded_year', '')), '')::integer is distinct from current_company.founded_year
    or nullif(trim(coalesce(profile_data->>'website', '')), '') is distinct from current_company.website
    or nullif(trim(coalesce(profile_data->>'business_email', '')), '') is distinct from current_company.business_email
    or nullif(trim(coalesce(profile_data->>'company_phone', '')), '') is distinct from current_company.phone
    or nullif(trim(coalesce(profile_data->>'headquarters', '')), '') is distinct from current_company.headquarters
    or nullif(trim(coalesce(profile_data->>'gst_number', '')), '') is distinct from current_company.gst_number
    or nullif(trim(coalesce(profile_data->>'registration_number', '')), '') is distinct from current_company.registration_number;

  requires_review :=
    company_approval_required
    and (
      current_company.status = 'rejected'
      or (
        current_company.status = 'approved'
        and sensitive_changes
      )
    );

  next_status := case
    when requires_review then 'pending'
    else current_company.status
  end;

  update public.companies
  set
    name = company_name,
    slug = public.unique_company_slug(company_name, current_company.id),
    legal_name = nullif(trim(coalesce(profile_data->>'legal_name', '')), ''),
    description = nullif(trim(coalesce(profile_data->>'description', '')), ''),
    industry = nullif(trim(coalesce(profile_data->>'industry', '')), ''),
    company_type = nullif(trim(coalesce(profile_data->>'company_type', '')), ''),
    company_size = nullif(trim(coalesce(profile_data->>'company_size', '')), ''),
    founded_year = nullif(trim(coalesce(profile_data->>'founded_year', '')), '')::integer,
    website = nullif(trim(coalesce(profile_data->>'website', '')), ''),
    business_email = nullif(trim(coalesce(profile_data->>'business_email', '')), ''),
    phone = nullif(trim(coalesce(profile_data->>'company_phone', '')), ''),
    headquarters = nullif(trim(coalesce(profile_data->>'headquarters', '')), ''),
    gst_number = nullif(trim(coalesce(profile_data->>'gst_number', '')), ''),
    registration_number = nullif(trim(coalesce(profile_data->>'registration_number', '')), ''),
    status = next_status,
    rejection_reason = case
      when requires_review then null
      else rejection_reason
    end,
    verified_at = case
      when requires_review then null
      else verified_at
    end
  where id = current_company.id
  returning id into company_id;

  return jsonb_build_object(
    'company_id', company_id,
    'requires_review', requires_review,
    'status', next_status
  );
end;
$$;

grant execute on function public.update_employer_company_profile(jsonb) to authenticated;

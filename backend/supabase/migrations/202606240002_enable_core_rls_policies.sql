create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and account_status = 'active'
  limit 1;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'admin', false);
$$;

create or replace function public.current_user_is_employer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'employer', false);
$$;

create or replace function public.current_user_is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'student', false);
$$;

create or replace function public.audit_admin_action(
  p_entity_type text,
  p_entity_id text,
  p_action text,
  p_old_values jsonb default null,
  p_new_values jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  insert into public.admin_audit_logs (
    admin_user_id,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values
  )
  values (
    auth.uid(),
    p_entity_type,
    p_entity_id,
    p_action,
    p_old_values,
    p_new_values
  );
end;
$$;

create or replace function public.to_text_array(value jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array(
      select distinct trim(both from item)
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(value) = 'array' then value
          when value is null or value = 'null'::jsonb then '[]'::jsonb
          else jsonb_build_array(value #>> '{}')
        end
      ) as item
      where trim(both from item) <> ''
    ),
    '{}'::text[]
  );
$$;

create or replace function public.year_from_json(value jsonb)
returns integer
language plpgsql
immutable
as $$
declare
  text_value text;
  parsed integer;
begin
  text_value := nullif(trim(coalesce(value #>> '{}', '')), '');

  if text_value is null then
    return null;
  end if;

  parsed := text_value::integer;

  if parsed < 1980 or parsed > 2100 then
    raise exception 'Passing year must be between 1980 and 2100.';
  end if;

  return parsed;
exception
  when invalid_text_representation then
    raise exception 'Passing year must be a valid year.';
end;
$$;

create or replace function public.complete_student_onboarding(profile_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_student() then
    raise exception 'Student access is required.';
  end if;

  update public.profiles
  set
    full_name = nullif(trim(coalesce(profile_data->>'full_name', full_name, '')), ''),
    phone = nullif(trim(coalesce(profile_data->>'phone', phone, '')), ''),
    onboarding_completed = true
  where id = auth.uid()
    and role = 'student'
    and account_status = 'active';

  insert into public.student_profiles (
    user_id,
    college,
    university,
    degree,
    specialization,
    passing_year,
    bio,
    skills,
    preferred_categories,
    preferred_locations,
    preferred_work_modes,
    available_immediately,
    portfolio_url,
    github_url,
    linkedin_url
  )
  values (
    auth.uid(),
    nullif(trim(coalesce(profile_data->>'college', '')), ''),
    nullif(trim(coalesce(profile_data->>'university', '')), ''),
    nullif(trim(coalesce(profile_data->>'degree', '')), ''),
    nullif(trim(coalesce(profile_data->>'specialization', '')), ''),
    public.year_from_json(profile_data->'passing_year'),
    nullif(trim(coalesce(profile_data->>'bio', '')), ''),
    public.to_text_array(profile_data->'skills'),
    public.to_text_array(profile_data->'preferred_categories'),
    public.to_text_array(profile_data->'preferred_locations'),
    public.to_text_array(profile_data->'preferred_work_modes'),
    coalesce((profile_data->>'available_immediately')::boolean, false),
    nullif(trim(coalesce(profile_data->>'portfolio_url', '')), ''),
    nullif(trim(coalesce(profile_data->>'github_url', '')), ''),
    nullif(trim(coalesce(profile_data->>'linkedin_url', '')), '')
  )
  on conflict (user_id) do update
  set
    college = excluded.college,
    university = excluded.university,
    degree = excluded.degree,
    specialization = excluded.specialization,
    passing_year = excluded.passing_year,
    bio = excluded.bio,
    skills = excluded.skills,
    preferred_categories = excluded.preferred_categories,
    preferred_locations = excluded.preferred_locations,
    preferred_work_modes = excluded.preferred_work_modes,
    available_immediately = excluded.available_immediately,
    portfolio_url = excluded.portfolio_url,
    github_url = excluded.github_url,
    linkedin_url = excluded.linkedin_url;
end;
$$;

create or replace function public.update_student_profile(profile_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.complete_student_onboarding(profile_data);
end;
$$;

create or replace function public.unique_company_slug(company_name text, existing_company_id uuid default null)
returns text
language plpgsql
stable
as $$
declare
  base_slug text;
  candidate text;
  suffix integer := 1;
begin
  base_slug := coalesce(nullif(public.slugify(company_name), ''), 'company');
  candidate := base_slug;

  while exists (
    select 1
    from public.companies
    where slug = candidate
      and (existing_company_id is null or id <> existing_company_id)
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  end loop;

  return candidate;
end;
$$;

drop function if exists public.complete_employer_onboarding(jsonb);

create or replace function public.complete_employer_onboarding(profile_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  company_id uuid;
  company_status text;
  company_name text;
begin
  if not public.current_user_is_employer() then
    raise exception 'Employer access is required.';
  end if;

  company_name := nullif(trim(coalesce(profile_data->>'company_name', profile_data->>'companyName', '')), '');

  if company_name is null then
    raise exception 'Company name is required.';
  end if;

  update public.profiles
  set
    full_name = nullif(trim(coalesce(profile_data->>'full_name', full_name, '')), ''),
    phone = nullif(trim(coalesce(profile_data->>'phone', phone, '')), ''),
    onboarding_completed = true
  where id = auth.uid()
    and role = 'employer'
    and account_status = 'active';

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

  company_status := case
    when (select require_company_approval from public.platform_settings where id = 1) then 'pending'
    else 'approved'
  end;

  insert into public.companies (
    owner_id,
    name,
    slug,
    legal_name,
    description,
    industry,
    company_type,
    company_size,
    founded_year,
    website,
    business_email,
    phone,
    headquarters,
    gst_number,
    registration_number,
    status,
    verified_at
  )
  values (
    auth.uid(),
    company_name,
    public.unique_company_slug(company_name),
    nullif(trim(coalesce(profile_data->>'legal_name', '')), ''),
    nullif(trim(coalesce(profile_data->>'description', '')), ''),
    nullif(trim(coalesce(profile_data->>'industry', '')), ''),
    nullif(trim(coalesce(profile_data->>'company_type', '')), ''),
    nullif(trim(coalesce(profile_data->>'company_size', '')), ''),
    nullif(trim(coalesce(profile_data->>'founded_year', '')), '')::integer,
    nullif(trim(coalesce(profile_data->>'website', '')), ''),
    nullif(trim(coalesce(profile_data->>'business_email', '')), ''),
    nullif(trim(coalesce(profile_data->>'company_phone', '')), ''),
    nullif(trim(coalesce(profile_data->>'headquarters', '')), ''),
    nullif(trim(coalesce(profile_data->>'gst_number', '')), ''),
    nullif(trim(coalesce(profile_data->>'registration_number', '')), ''),
    company_status,
    case when company_status = 'approved' then now() else null end
  )
  on conflict (owner_id) do update
  set
    name = excluded.name,
    slug = public.unique_company_slug(excluded.name, companies.id),
    legal_name = excluded.legal_name,
    description = excluded.description,
    industry = excluded.industry,
    company_type = excluded.company_type,
    company_size = excluded.company_size,
    founded_year = excluded.founded_year,
    website = excluded.website,
    business_email = excluded.business_email,
    phone = excluded.phone,
    headquarters = excluded.headquarters,
    gst_number = excluded.gst_number,
    registration_number = excluded.registration_number,
    status = case when companies.status = 'approved' then companies.status else excluded.status end,
    rejection_reason = null
  returning id into company_id;

  return jsonb_build_object('company_id', company_id);
end;
$$;

drop function if exists public.update_employer_company_profile(jsonb);

create or replace function public.update_employer_company_profile(profile_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.complete_employer_onboarding(profile_data);
end;
$$;

create or replace function public.set_student_avatar_path(asset_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_student() then
    raise exception 'Student access is required.';
  end if;

  if asset_path is not null and asset_path not like auth.uid()::text || '/%' then
    raise exception 'Invalid avatar path.';
  end if;

  update public.profiles
  set avatar_path = asset_path
  where id = auth.uid()
    and role = 'student';
end;
$$;

create or replace function public.set_student_resume_path(asset_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_student() then
    raise exception 'Student access is required.';
  end if;

  if asset_path is not null and asset_path not like auth.uid()::text || '/%' then
    raise exception 'Invalid resume path.';
  end if;

  insert into public.student_profiles (user_id, primary_resume_path)
  values (auth.uid(), asset_path)
  on conflict (user_id) do update
  set primary_resume_path = excluded.primary_resume_path;
end;
$$;

create or replace function public.set_company_logo_path(asset_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_employer() then
    raise exception 'Employer access is required.';
  end if;

  if asset_path is not null and asset_path not like auth.uid()::text || '/%' then
    raise exception 'Invalid company logo path.';
  end if;

  update public.companies
  set logo_path = asset_path
  where owner_id = auth.uid();
end;
$$;

create or replace function public.set_company_cover_path(asset_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_employer() then
    raise exception 'Employer access is required.';
  end if;

  if asset_path is not null and asset_path not like auth.uid()::text || '/%' then
    raise exception 'Invalid company cover path.';
  end if;

  update public.companies
  set cover_path = asset_path
  where owner_id = auth.uid();
end;
$$;

create or replace function public.get_public_platform_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'platform_name', platform_name,
    'support_email', support_email,
    'maintenance_mode', maintenance_mode,
    'allow_student_registration', allow_student_registration,
    'allow_employer_registration', allow_employer_registration,
    'allow_public_internship_browsing', allow_public_internship_browsing,
    'application_withdrawal_enabled', application_withdrawal_enabled
  )
  from public.platform_settings
  where id = 1;
$$;

create or replace function public.get_admin_platform_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  settings jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select to_jsonb(platform_settings.*)
  into settings
  from public.platform_settings
  where id = 1;

  return settings;
end;
$$;

create or replace function public.update_admin_platform_settings(settings_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  old_settings jsonb;
  new_settings jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select to_jsonb(platform_settings.*)
  into old_settings
  from public.platform_settings
  where id = 1;

  update public.platform_settings
  set
    platform_name = coalesce(nullif(trim(settings_patch->>'platform_name'), ''), platform_name),
    support_email = coalesce(settings_patch->>'support_email', support_email),
    maintenance_mode = coalesce((settings_patch->>'maintenance_mode')::boolean, maintenance_mode),
    allow_student_registration = coalesce((settings_patch->>'allow_student_registration')::boolean, allow_student_registration),
    allow_employer_registration = coalesce((settings_patch->>'allow_employer_registration')::boolean, allow_employer_registration),
    require_company_approval = coalesce((settings_patch->>'require_company_approval')::boolean, require_company_approval),
    require_internship_approval = coalesce((settings_patch->>'require_internship_approval')::boolean, require_internship_approval),
    allow_public_internship_browsing = coalesce((settings_patch->>'allow_public_internship_browsing')::boolean, allow_public_internship_browsing),
    application_withdrawal_enabled = coalesce((settings_patch->>'application_withdrawal_enabled')::boolean, application_withdrawal_enabled),
    default_report_days = coalesce((settings_patch->>'default_report_days')::integer, default_report_days),
    max_active_internships_per_employer = coalesce((settings_patch->>'max_active_internships_per_employer')::integer, max_active_internships_per_employer),
    updated_by = auth.uid()
  where id = 1
  returning to_jsonb(platform_settings.*) into new_settings;

  perform public.audit_admin_action('settings', '1', 'update_platform_settings', old_settings, new_settings);

  return new_settings;
end;
$$;

create or replace function public.get_employer_internship_limit_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  active_count integer;
  maximum_active integer;
  owns_company boolean;
begin
  if auth.uid() is null then
    raise exception 'You must sign in as an employer.';
  end if;

  select count(*) > 0
  into owns_company
  from public.companies
  where owner_id = auth.uid();

  select count(*)
  into active_count
  from public.internships
  where employer_id = auth.uid()
    and status in ('pending', 'approved', 'paused');

  select max_active_internships_per_employer
  into maximum_active
  from public.platform_settings
  where id = 1;

  return jsonb_build_object(
    'employer_id', auth.uid(),
    'detected_role', public.current_profile_role(),
    'has_employer_profile', public.current_user_is_employer(),
    'owns_company', owns_company,
    'active_count', active_count,
    'maximum_active', maximum_active,
    'remaining', greatest(maximum_active - active_count, 0),
    'limit_reached', active_count >= maximum_active
  );
end;
$$;

create or replace function public.get_admin_reporting_overview(report_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_days integer;
  date_from date;
  date_to date := current_date;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  safe_days := least(365, greatest(7, coalesce(report_days, 30)));
  date_from := date_to - (safe_days - 1);

  return jsonb_build_object(
    'generated_at', now(),
    'period', jsonb_build_object(
      'days', safe_days,
      'date_from', date_from,
      'date_to', date_to
    ),
    'summary', jsonb_build_object(
      'profiles', jsonb_build_object(
        'students', (select count(*) from public.profiles where role = 'student'),
        'employers', (select count(*) from public.profiles where role = 'employer'),
        'admins', (select count(*) from public.profiles where role = 'admin')
      ),
      'companies', jsonb_build_object(
        'total', (select count(*) from public.companies),
        'pending', (select count(*) from public.companies where status = 'pending'),
        'approved', (select count(*) from public.companies where status = 'approved')
      ),
      'internships', jsonb_build_object(
        'total', (select count(*) from public.internships),
        'pending', (select count(*) from public.internships where status = 'pending'),
        'approved', (select count(*) from public.internships where status = 'approved')
      ),
      'applications', jsonb_build_object(
        'total', (select count(*) from public.applications),
        'selected', (select count(*) from public.applications where status = 'selected'),
        'rejected', (select count(*) from public.applications where status = 'rejected')
      )
    ),
    'daily_trends', (
      select coalesce(jsonb_agg(row_to_json(daily)::jsonb order by daily.date), '[]'::jsonb)
      from (
        select
          day::date as date,
          (select count(*) from public.profiles where role = 'student' and created_at::date = day::date) as students,
          (select count(*) from public.profiles where role = 'employer' and created_at::date = day::date) as employers,
          (select count(*) from public.companies where created_at::date = day::date) as companies,
          (select count(*) from public.internships where created_at::date = day::date) as internships,
          (select count(*) from public.applications where created_at::date = day::date) as applications,
          (select count(*) from public.applications where status = 'interview_scheduled' and updated_at::date = day::date) as interviews,
          (select count(*) from public.applications where status = 'selected' and updated_at::date = day::date) as selected,
          (select count(*) from public.applications where status = 'rejected' and updated_at::date = day::date) as rejected
        from generate_series(date_from, date_to, interval '1 day') as day
      ) daily
    ),
    'application_statuses', (
      select coalesce(jsonb_agg(jsonb_build_object('status', status, 'count', count)), '[]'::jsonb)
      from (select status, count(*)::integer as count from public.applications group by status order by status) rows
    ),
    'internship_statuses', (
      select coalesce(jsonb_agg(jsonb_build_object('status', status, 'count', count)), '[]'::jsonb)
      from (select status, count(*)::integer as count from public.internships group by status order by status) rows
    ),
    'company_statuses', (
      select coalesce(jsonb_agg(jsonb_build_object('status', status, 'count', count)), '[]'::jsonb)
      from (select status, count(*)::integer as count from public.companies group by status order by status) rows
    )
  );
end;
$$;

create or replace function public.create_employer_access_invite(
  p_invited_email text,
  p_company_name text default null,
  p_expires_in_days integer default 14
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_invite public.employer_access_invites%rowtype;
  safe_days integer;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  safe_days := least(90, greatest(1, coalesce(p_expires_in_days, 14)));

  insert into public.employer_access_invites (
    invited_email,
    company_name,
    access_path,
    token,
    expires_at
  )
  values (
    lower(trim(p_invited_email)),
    nullif(trim(coalesce(p_company_name, '')), ''),
    '',
    encode(gen_random_bytes(32), 'hex'),
    now() + make_interval(days => safe_days)
  )
  returning * into new_invite;

  update public.employer_access_invites
  set access_path = '/employer-access/' || new_invite.token
  where id = new_invite.id
  returning * into new_invite;

  perform public.audit_admin_action('invite', new_invite.id::text, 'create_employer_access_invite', null, to_jsonb(new_invite));

  return to_jsonb(new_invite)
    || jsonb_build_object(
      'valid', true,
      'already_used', false
    );
end;
$$;

create or replace function public.validate_employer_access_invite(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  invite public.employer_access_invites%rowtype;
begin
  select *
  into invite
  from public.employer_access_invites
  where token = trim(coalesce(p_token, ''))
  limit 1;

  if invite.id is null then
    return jsonb_build_object(
      'valid', false,
      'invite_id', null,
      'invited_email', '',
      'company_name', '',
      'expires_at', null,
      'already_used', false
    );
  end if;

  return jsonb_build_object(
    'valid', invite.used_at is null and invite.revoked_at is null and invite.expires_at > now(),
    'invite_id', invite.id,
    'invited_email', invite.invited_email,
    'company_name', invite.company_name,
    'expires_at', invite.expires_at,
    'already_used', invite.used_at is not null
  );
end;
$$;

create or replace function public.list_employer_access_invites(
  p_status text default 'all',
  p_limit integer default 100
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  return query
  select to_jsonb(invites.*)
    || jsonb_build_object(
      'valid', invites.used_at is null and invites.revoked_at is null and invites.expires_at > now(),
      'already_used', invites.used_at is not null
    )
  from public.employer_access_invites invites
  where p_status = 'all'
    or (p_status = 'active' and invites.used_at is null and invites.revoked_at is null and invites.expires_at > now())
    or (p_status = 'used' and invites.used_at is not null)
    or (p_status = 'revoked' and invites.revoked_at is not null)
    or (p_status = 'expired' and invites.used_at is null and invites.revoked_at is null and invites.expires_at <= now())
  order by invites.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

create or replace function public.revoke_employer_access_invite(p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  old_invite public.employer_access_invites%rowtype;
  updated_invite public.employer_access_invites%rowtype;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select *
  into old_invite
  from public.employer_access_invites
  where id = p_invite_id;

  update public.employer_access_invites
  set
    revoked_at = now(),
    status = 'revoked'
  where id = p_invite_id
    and used_at is null
    and revoked_at is null
  returning * into updated_invite;

  if updated_invite.id is null then
    return false;
  end if;

  perform public.audit_admin_action('invite', updated_invite.id::text, 'revoke_employer_access_invite', to_jsonb(old_invite), to_jsonb(updated_invite));

  return true;
end;
$$;

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.employer_profiles enable row level security;
alter table public.companies enable row level security;
alter table public.internships enable row level security;
alter table public.applications enable row level security;
alter table public.saved_internships enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_settings enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.employer_access_invites enable row level security;

create policy "profiles_select_allowed"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.current_user_is_admin()
  or exists (
    select 1
    from public.applications a
    join public.internships i on i.id = a.internship_id
    where a.student_id = profiles.id
      and i.employer_id = auth.uid()
  )
);

create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "student_profiles_select_allowed"
on public.student_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_admin()
  or exists (
    select 1
    from public.applications a
    join public.internships i on i.id = a.internship_id
    where a.student_id = student_profiles.user_id
      and i.employer_id = auth.uid()
  )
);

create policy "student_profiles_owner_insert"
on public.student_profiles
for insert
to authenticated
with check (user_id = auth.uid() and public.current_user_is_student());

create policy "student_profiles_owner_update"
on public.student_profiles
for update
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin())
with check (user_id = auth.uid() or public.current_user_is_admin());

create policy "employer_profiles_select_allowed"
on public.employer_profiles
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

create policy "employer_profiles_owner_insert"
on public.employer_profiles
for insert
to authenticated
with check (user_id = auth.uid() and public.current_user_is_employer());

create policy "employer_profiles_owner_update"
on public.employer_profiles
for update
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin())
with check (user_id = auth.uid() or public.current_user_is_admin());

create policy "companies_select_allowed"
on public.companies
for select
to authenticated, anon
using (
  status = 'approved'
  or owner_id = auth.uid()
  or public.current_user_is_admin()
);

create policy "companies_owner_insert"
on public.companies
for insert
to authenticated
with check (owner_id = auth.uid() and public.current_user_is_employer());

create policy "companies_owner_update_or_admin"
on public.companies
for update
to authenticated
using (owner_id = auth.uid() or public.current_user_is_admin())
with check (owner_id = auth.uid() or public.current_user_is_admin());

create policy "internships_select_allowed"
on public.internships
for select
to authenticated, anon
using (
  (
    status = 'approved'
    and deadline >= current_date
  )
  or employer_id = auth.uid()
  or public.current_user_is_admin()
);

create policy "internships_employer_insert"
on public.internships
for insert
to authenticated
with check (
  employer_id = auth.uid()
  and public.current_user_is_employer()
  and exists (
    select 1
    from public.companies c
    where c.id = company_id
      and c.owner_id = auth.uid()
  )
);

create policy "internships_employer_update_or_admin"
on public.internships
for update
to authenticated
using (employer_id = auth.uid() or public.current_user_is_admin())
with check (employer_id = auth.uid() or public.current_user_is_admin());

create policy "applications_select_allowed"
on public.applications
for select
to authenticated
using (
  student_id = auth.uid()
  or public.current_user_is_admin()
  or exists (
    select 1
    from public.internships i
    where i.id = applications.internship_id
      and i.employer_id = auth.uid()
  )
);

create policy "applications_student_insert"
on public.applications
for insert
to authenticated
with check (
  student_id = auth.uid()
  and public.current_user_is_student()
  and exists (
    select 1
    from public.internships i
    where i.id = internship_id
      and i.status = 'approved'
      and i.deadline >= current_date
  )
);

create policy "applications_student_or_employer_update"
on public.applications
for update
to authenticated
using (
  student_id = auth.uid()
  or public.current_user_is_admin()
  or exists (
    select 1
    from public.internships i
    where i.id = applications.internship_id
      and i.employer_id = auth.uid()
  )
)
with check (
  student_id = auth.uid()
  or public.current_user_is_admin()
  or exists (
    select 1
    from public.internships i
    where i.id = applications.internship_id
      and i.employer_id = auth.uid()
  )
);

create policy "applications_student_delete_withdrawn"
on public.applications
for delete
to authenticated
using (
  (student_id = auth.uid() and status = 'withdrawn')
  or public.current_user_is_admin()
);

create policy "saved_internships_owner_select"
on public.saved_internships
for select
to authenticated
using (student_id = auth.uid() or public.current_user_is_admin());

create policy "saved_internships_owner_insert"
on public.saved_internships
for insert
to authenticated
with check (student_id = auth.uid() and public.current_user_is_student());

create policy "saved_internships_owner_delete"
on public.saved_internships
for delete
to authenticated
using (student_id = auth.uid() or public.current_user_is_admin());

create policy "notifications_owner_select"
on public.notifications
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

create policy "notifications_admin_insert"
on public.notifications
for insert
to authenticated
with check (public.current_user_is_admin());

create policy "notifications_owner_update"
on public.notifications
for update
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin())
with check (user_id = auth.uid() or public.current_user_is_admin());

create policy "notifications_owner_delete"
on public.notifications
for delete
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

create policy "platform_settings_admin_select"
on public.platform_settings
for select
to authenticated
using (public.current_user_is_admin());

create policy "platform_settings_admin_update"
on public.platform_settings
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "admin_audit_logs_admin_select"
on public.admin_audit_logs
for select
to authenticated
using (public.current_user_is_admin());

create policy "admin_audit_logs_admin_insert"
on public.admin_audit_logs
for insert
to authenticated
with check (public.current_user_is_admin());

create policy "employer_access_invites_admin_select"
on public.employer_access_invites
for select
to authenticated
using (public.current_user_is_admin());

create policy "employer_access_invites_admin_insert"
on public.employer_access_invites
for insert
to authenticated
with check (public.current_user_is_admin());

create policy "employer_access_invites_admin_update"
on public.employer_access_invites
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

grant execute on function public.complete_student_onboarding(jsonb) to authenticated;
grant execute on function public.complete_employer_onboarding(jsonb) to authenticated;
grant execute on function public.update_student_profile(jsonb) to authenticated;
grant execute on function public.update_employer_company_profile(jsonb) to authenticated;
grant execute on function public.set_student_avatar_path(text) to authenticated;
grant execute on function public.set_student_resume_path(text) to authenticated;
grant execute on function public.set_company_logo_path(text) to authenticated;
grant execute on function public.set_company_cover_path(text) to authenticated;
grant execute on function public.get_public_platform_settings() to anon, authenticated;
grant execute on function public.get_admin_platform_settings() to authenticated;
grant execute on function public.update_admin_platform_settings(jsonb) to authenticated;
grant execute on function public.get_employer_internship_limit_status() to authenticated;
grant execute on function public.get_admin_reporting_overview(integer) to authenticated;
grant execute on function public.create_employer_access_invite(text, text, integer) to authenticated;
grant execute on function public.validate_employer_access_invite(text) to anon, authenticated;
grant execute on function public.list_employer_access_invites(text, integer) to authenticated;
grant execute on function public.revoke_employer_access_invite(uuid) to authenticated;

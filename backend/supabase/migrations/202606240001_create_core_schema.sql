create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  avatar_path text,
  role text not null default 'student' check (role in ('student', 'employer', 'admin')),
  account_status text not null default 'active' check (account_status in ('active', 'suspended', 'deleted')),
  email_verified boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  college text,
  university text,
  degree text,
  specialization text,
  passing_year integer check (passing_year is null or passing_year between 1980 and 2100),
  bio text,
  skills text[] not null default '{}',
  preferred_categories text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  preferred_work_modes text[] not null default '{}',
  available_immediately boolean not null default false,
  portfolio_url text,
  github_url text,
  linkedin_url text,
  primary_resume_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  designation text,
  department text,
  linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  legal_name text,
  description text,
  industry text,
  company_type text,
  company_size text,
  founded_year integer check (founded_year is null or founded_year between 1800 and 2100),
  website text,
  business_email text,
  phone text,
  headquarters text,
  gst_number text,
  registration_number text,
  logo_path text,
  cover_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.internships (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  department text,
  category text not null,
  location text not null,
  work_mode text not null default 'onsite' check (work_mode in ('onsite', 'remote', 'hybrid')),
  experience_level text not null default 'beginner',
  duration_months integer check (duration_months is null or duration_months > 0),
  compensation_type text not null default 'paid' check (compensation_type in ('paid', 'unpaid')),
  stipend_min integer check (stipend_min is null or stipend_min >= 0),
  stipend_max integer check (stipend_max is null or stipend_max >= 0),
  currency text not null default 'INR',
  stipend_period text not null default 'monthly',
  openings integer not null default 1 check (openings > 0),
  skills_required text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  description text not null,
  responsibilities text[] not null default '{}',
  eligibility text[] not null default '{}',
  perks text[] not null default '{}',
  screening_steps text[] not null default '{}',
  start_date date,
  deadline date not null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected', 'paused', 'closed')),
  featured boolean not null default false,
  featured_until timestamptz,
  rejection_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internships_stipend_range check (
    stipend_min is null or stipend_max is null or stipend_max >= stipend_min
  )
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null references public.internships(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  resume_path text,
  cover_letter text,
  screening_answers jsonb not null default '{}'::jsonb,
  status text not null default 'applied' check (
    status in (
      'applied',
      'under_review',
      'shortlisted',
      'interview_scheduled',
      'selected',
      'rejected',
      'withdrawn'
    )
  ),
  interview_at timestamptz,
  interview_mode text check (interview_mode is null or interview_mode in ('video', 'phone', 'onsite')),
  interview_location text,
  meeting_link text,
  interview_notes text,
  employer_notes text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, internship_id)
);

create table public.saved_internships (
  student_id uuid not null references public.profiles(id) on delete cascade,
  internship_id uuid not null references public.internships(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, internship_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  id integer primary key default 1 check (id = 1),
  platform_name text not null default 'InternNext',
  support_email text not null default '',
  maintenance_mode boolean not null default false,
  allow_student_registration boolean not null default true,
  allow_employer_registration boolean not null default true,
  require_company_approval boolean not null default true,
  require_internship_approval boolean not null default true,
  allow_public_internship_browsing boolean not null default true,
  application_withdrawal_enabled boolean not null default true,
  default_report_days integer not null default 30 check (default_report_days between 7 and 365),
  max_active_internships_per_employer integer not null default 25 check (max_active_internships_per_employer between 1 and 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null check (entity_type in ('profile', 'company', 'internship', 'settings', 'invite')),
  entity_id text,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create table public.employer_access_invites (
  id uuid primary key default gen_random_uuid(),
  invited_email text not null,
  company_name text,
  access_path text not null,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'used', 'revoked', 'expired'))
);

create index profiles_role_idx on public.profiles(role);
create index profiles_account_status_idx on public.profiles(account_status);
create index companies_owner_id_idx on public.companies(owner_id);
create index companies_status_idx on public.companies(status);
create index internships_employer_id_idx on public.internships(employer_id);
create index internships_company_id_idx on public.internships(company_id);
create index internships_status_deadline_idx on public.internships(status, deadline);
create index internships_featured_idx on public.internships(featured, featured_until);
create index applications_student_id_idx on public.applications(student_id);
create index applications_internship_id_idx on public.applications(internship_id);
create index applications_status_idx on public.applications(status);
create index saved_internships_internship_id_idx on public.saved_internships(internship_id);
create index notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);
create index admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);
create index admin_audit_logs_entity_idx on public.admin_audit_logs(entity_type, entity_id);
create index employer_access_invites_status_idx on public.employer_access_invites(status, expires_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger student_profiles_set_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();

create trigger employer_profiles_set_updated_at
before update on public.employer_profiles
for each row execute function public.set_updated_at();

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger internships_set_updated_at
before update on public.internships
for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row execute function public.set_updated_at();

insert into public.platform_settings (id)
values (1)
on conflict (id) do nothing;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  if requested_role not in ('student', 'employer', 'admin') then
    requested_role := 'student';
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    email_verified
  )
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    requested_role,
    new.email_confirmed_at is not null
  )
  on conflict (id) do update
  set
    email = excluded.email,
    email_verified = excluded.email_verified,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();


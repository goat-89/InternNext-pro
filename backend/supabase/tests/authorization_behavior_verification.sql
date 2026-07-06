-- STAGING ONLY.
-- This script creates synthetic users and rows inside one transaction, tests
-- authorization as real database roles, and rolls everything back.

begin;

create or replace function pg_temp.assert_true(
  condition boolean,
  failure_message text
)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'Authorization assertion failed: %', failure_message;
  end if;
end;
$$;

create or replace function pg_temp.expect_denied(
  statement_to_run text,
  failure_message text
)
returns void
language plpgsql
as $$
declare
  affected_rows bigint;
begin
  begin
    execute statement_to_run;
    get diagnostics affected_rows = row_count;

    if affected_rows = 0 then
      return;
    end if;
  exception
    when insufficient_privilege
      or raise_exception
      or check_violation
      or foreign_key_violation
    then
      return;
  end;

  raise exception
    'Authorization assertion failed: %',
    failure_message;
end;
$$;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'authz-student-a@example.invalid',
    'not-a-login-password',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"student","full_name":"Authz Student A"}',
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'authz-student-b@example.invalid',
    'not-a-login-password',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"student","full_name":"Authz Student B"}',
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'authz-suspended@example.invalid',
    'not-a-login-password',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"student","full_name":"Authz Suspended"}',
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'authz-employer-a@example.invalid',
    'not-a-login-password',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"employer","full_name":"Authz Employer A"}',
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'authz-employer-b@example.invalid',
    'not-a-login-password',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"employer","full_name":"Authz Employer B"}',
    now(),
    now()
  ),
  (
    '90000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'authz-admin@example.invalid',
    'not-a-login-password',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"student","full_name":"Authz Admin"}',
    now(),
    now()
  );

update public.profiles
set role = 'admin'
where id = '90000000-0000-0000-0000-000000000001';

update public.profiles
set account_status = 'suspended'
where id = '10000000-0000-0000-0000-000000000003';

insert into public.companies (
  id,
  owner_id,
  name,
  slug,
  status
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Authorization Company A',
    'authorization-company-a',
    'approved'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'Authorization Company B',
    'authorization-company-b',
    'pending'
  );

insert into public.internships (
  id,
  employer_id,
  company_id,
  title,
  category,
  location,
  work_mode,
  compensation_type,
  description,
  deadline,
  status
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Authorization Internship A',
    'Engineering',
    'Remote',
    'remote',
    'paid',
    'Synthetic staging internship used only to verify role-separated database authorization. This temporary fixture is rolled back when the verification finishes.',
    current_date + 30,
    'approved'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    'Authorization Internship B',
    'Engineering',
    'Remote',
    'remote',
    'paid',
    'Synthetic staging internship used only to verify role-separated database authorization. This temporary fixture is rolled back when the verification finishes.',
    current_date + 30,
    'draft'
  );

insert into public.applications (
  id,
  internship_id,
  student_id,
  resume_path,
  status,
  employer_notes
)
values (
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001/resume.pdf',
  'applied',
  'Private employer note'
);

insert into storage.objects (
  id,
  bucket_id,
  name
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    'student-resumes',
    '10000000-0000-0000-0000-000000000001/resume.pdf'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'student-avatars',
    '10000000-0000-0000-0000-000000000001/avatar.png'
  );

set local role anon;
select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);

select pg_temp.expect_denied(
  $statement$
    select *
    from public.profiles
  $statement$,
  'anonymous users can read profiles'
);

select pg_temp.assert_true(
  (
    select count(*)
    from public.internships
    where id = '40000000-0000-0000-0000-000000000001'
  ) = 1,
  'anonymous users cannot read an approved active internship'
);

select pg_temp.assert_true(
  (
    select count(*)
    from public.internships
    where id = '40000000-0000-0000-0000-000000000002'
  ) = 0,
  'anonymous users can read a draft internship'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select pg_temp.assert_true(
  (
    select count(*)
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000001'
  ) = 1,
  'student cannot read own profile'
);

select pg_temp.assert_true(
  (
    select count(*)
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000002'
  ) = 0,
  'student can read another student profile'
);

select pg_temp.assert_true(
  (
    select count(*)
    from public.applications
    where id = '50000000-0000-0000-0000-000000000001'
  ) = 1,
  'student cannot read own application'
);

select pg_temp.expect_denied(
  $statement$
    select employer_notes
    from public.applications
    where id = '50000000-0000-0000-0000-000000000001'
  $statement$,
  'student can read employer-only notes'
);

select pg_temp.expect_denied(
  $statement$
    update public.applications
    set status = 'selected'
    where id = '50000000-0000-0000-0000-000000000001'
  $statement$,
  'student can forge a selected application status'
);

select pg_temp.expect_denied(
  $statement$
    insert into public.notifications (
      user_id,
      title,
      message
    )
    values (
      '10000000-0000-0000-0000-000000000001',
      'Forged',
      'Forged notification'
    )
  $statement$,
  'student can forge notifications'
);

select pg_temp.expect_denied(
  $statement$
    insert into public.payment_orders (
      user_id,
      plan_key,
      plan_name,
      role_scope,
      amount,
      currency,
      receipt,
      razorpay_order_id,
      status
    )
    values (
      '10000000-0000-0000-0000-000000000001',
      'forged',
      'Forged',
      'student',
      1,
      'INR',
      'forged-receipt',
      'forged-order',
      'paid'
    )
  $statement$,
  'student can forge payment orders'
);

select pg_temp.expect_denied(
  $statement$
    insert into public.subscriptions (
      user_id,
      plan_id,
      status,
      current_period_end
    )
    select
      '10000000-0000-0000-0000-000000000001',
      p.id,
      'active',
      now() + interval '30 days'
    from public.subscription_plans p
    limit 1
  $statement$,
  'student can forge subscriptions'
);

select pg_temp.expect_denied(
  $statement$
    select public.get_admin_platform_settings()
  $statement$,
  'student can invoke an administrator RPC'
);

select pg_temp.assert_true(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'student-resumes'
      and name = '10000000-0000-0000-0000-000000000001/resume.pdf'
  ) = 1,
  'student cannot read own resume object'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select pg_temp.assert_true(
  (
    select count(*)
    from public.applications
    where id = '50000000-0000-0000-0000-000000000001'
  ) = 0,
  'unrelated employer can read an application'
);

select pg_temp.assert_true(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'student-resumes'
      and name = '10000000-0000-0000-0000-000000000001/resume.pdf'
  ) = 0,
  'unrelated employer can read a resume'
);

select pg_temp.expect_denied(
  $statement$
    update public.applications
    set status = 'shortlisted'
    where id = '50000000-0000-0000-0000-000000000001'
  $statement$,
  'unrelated employer can update an application'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select pg_temp.assert_true(
  (
    select count(*)
    from public.applications
    where id = '50000000-0000-0000-0000-000000000001'
  ) = 1,
  'owning employer cannot read an application'
);

select pg_temp.assert_true(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'student-resumes'
      and name = '10000000-0000-0000-0000-000000000001/resume.pdf'
  ) = 1,
  'owning employer cannot read an applicant resume'
);

update public.applications
set status = 'shortlisted'
where id = '50000000-0000-0000-0000-000000000001';

select pg_temp.assert_true(
  (
    select status
    from public.applications
    where id = '50000000-0000-0000-0000-000000000001'
  ) = 'shortlisted',
  'owning employer cannot update application status'
);

select pg_temp.assert_true(
  (
    public.get_application_private_notes(
      '50000000-0000-0000-0000-000000000001'
    ) ->> 'employer_notes'
  ) = 'Private employer note',
  'owning employer cannot read private notes through the secure RPC'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

update public.applications
set status = 'withdrawn'
where id = '50000000-0000-0000-0000-000000000001';

select pg_temp.assert_true(
  (
    select status
    from public.applications
    where id = '50000000-0000-0000-0000-000000000001'
  ) = 'withdrawn',
  'student cannot withdraw an eligible application'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select pg_temp.expect_denied(
  $statement$
    update public.student_profiles
    set bio = 'Suspended write'
    where user_id = '10000000-0000-0000-0000-000000000003'
  $statement$,
  'suspended student can update a private profile'
);

select pg_temp.expect_denied(
  $statement$
    insert into storage.objects (
      bucket_id,
      name
    )
    values (
      'student-resumes',
      '10000000-0000-0000-0000-000000000003/resume.pdf'
    )
  $statement$,
  'suspended student can upload a resume'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select pg_temp.assert_true(
  public.get_admin_platform_settings() is not null,
  'administrator cannot invoke an administrator RPC'
);

select pg_temp.assert_true(
  (
    select count(*)
    from public.profiles
    where id in (
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002'
    )
  ) = 2,
  'administrator cannot read protected profiles'
);

reset role;

rollback;

select 'Authorization behavior verification passed.' as result;

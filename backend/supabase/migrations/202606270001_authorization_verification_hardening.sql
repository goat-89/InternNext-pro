-- Authorization hardening discovered while building the RLS verification suite.

-- Keep this migration compatible with projects that used the earlier private
-- role helpers but do not yet have the public boolean wrappers.
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'admin'
      and p.account_status::text = 'active'
  );
$$;

create or replace function public.current_user_is_employer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'employer'
      and p.account_status::text = 'active'
  );
$$;

create or replace function public.current_user_is_student()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'student'
      and p.account_status::text = 'active'
  );
$$;

revoke all
on function public.current_user_is_admin()
from public;

revoke all
on function public.current_user_is_employer()
from public;

revoke all
on function public.current_user_is_student()
from public;

grant execute
on function public.current_user_is_admin()
to anon, authenticated;

grant execute
on function public.current_user_is_employer()
to anon, authenticated;

grant execute
on function public.current_user_is_student()
to anon, authenticated;

create or replace function public.enforce_application_actor_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
begin
  if actor_id is null then
    if auth.role() = 'service_role'
      or current_user in (
        'postgres',
        'service_role',
        'supabase_admin'
      )
    then
      return new;
    end if;

    raise exception 'Authentication is required.';
  end if;

  select p.role
  into actor_role
  from public.profiles p
  where p.id = actor_id
    and p.account_status = 'active';

  if actor_role = 'admin' then
    return new;
  end if;

  if actor_role = 'student' then
    if old.student_id <> actor_id
      or new.student_id <> actor_id
      or old.status not in (
        'applied',
        'under_review',
        'shortlisted'
      )
      or new.status <> 'withdrawn'
      or row(
        new.internship_id,
        new.student_id,
        new.resume_path,
        new.cover_letter,
        new.screening_answers,
        new.interview_at,
        new.interview_mode,
        new.interview_location,
        new.meeting_link,
        new.interview_notes,
        new.employer_notes,
        new.rejection_reason,
        new.created_at
      ) is distinct from row(
        old.internship_id,
        old.student_id,
        old.resume_path,
        old.cover_letter,
        old.screening_answers,
        old.interview_at,
        old.interview_mode,
        old.interview_location,
        old.meeting_link,
        old.interview_notes,
        old.employer_notes,
        old.rejection_reason,
        old.created_at
      )
    then
      raise exception 'Students may only withdraw eligible applications.';
    end if;

    return new;
  end if;

  if actor_role = 'employer' then
    if not exists (
      select 1
      from public.internships i
      where i.id = old.internship_id
        and i.employer_id = actor_id
    )
      or new.status = 'withdrawn'
      or row(
        new.internship_id,
        new.student_id,
        new.resume_path,
        new.cover_letter,
        new.screening_answers,
        new.created_at
      ) is distinct from row(
        old.internship_id,
        old.student_id,
        old.resume_path,
        old.cover_letter,
        old.screening_answers,
        old.created_at
      )
    then
      raise exception 'Employer application update is not permitted.';
    end if;

    return new;
  end if;

  raise exception 'Active account access is required.';
end;
$$;

revoke all
on function public.enforce_application_actor_update()
from public;

drop trigger if exists applications_actor_update_guard
on public.applications;

create trigger applications_actor_update_guard
before update
on public.applications
for each row
execute function public.enforce_application_actor_update();

create or replace function public.get_application_private_notes(
  target_application_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  notes jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select jsonb_build_object(
    'application_id',
    a.id,
    'employer_notes',
    a.employer_notes
  )
  into notes
  from public.applications a
  join public.internships i
    on i.id = a.internship_id
  where a.id = target_application_id
    and (
      i.employer_id = auth.uid()
      and public.current_user_is_employer()
      or public.current_user_is_admin()
    );

  if notes is null then
    raise exception 'Application not found or access denied.';
  end if;

  return notes;
end;
$$;

revoke all
on function public.get_application_private_notes(uuid)
from public;

grant execute
on function public.get_application_private_notes(uuid)
to authenticated;

-- Remove table-level read/update privileges so column grants cannot be bypassed.
revoke select, update
on public.applications
from authenticated;

grant select (
  id,
  internship_id,
  student_id,
  resume_path,
  cover_letter,
  screening_answers,
  status,
  interview_at,
  interview_mode,
  interview_location,
  meeting_link,
  interview_notes,
  rejection_reason,
  created_at,
  updated_at
)
on public.applications
to authenticated;

grant insert (
  internship_id,
  student_id,
  resume_path,
  cover_letter,
  screening_answers,
  status
)
on public.applications
to authenticated;

grant update (
  status,
  interview_at,
  interview_mode,
  interview_location,
  meeting_link,
  interview_notes,
  employer_notes,
  rejection_reason,
  updated_at
)
on public.applications
to authenticated;

grant delete
on public.applications
to authenticated;

drop policy if exists "student_profiles_owner_update"
on public.student_profiles;

create policy "student_profiles_owner_update"
on public.student_profiles
for update
to authenticated
using (
  (
    user_id = auth.uid()
    and public.current_user_is_student()
  )
  or public.current_user_is_admin()
)
with check (
  (
    user_id = auth.uid()
    and public.current_user_is_student()
  )
  or public.current_user_is_admin()
);

drop policy if exists "employer_profiles_owner_update"
on public.employer_profiles;

create policy "employer_profiles_owner_update"
on public.employer_profiles
for update
to authenticated
using (
  (
    user_id = auth.uid()
    and public.current_user_is_employer()
  )
  or public.current_user_is_admin()
)
with check (
  (
    user_id = auth.uid()
    and public.current_user_is_employer()
  )
  or public.current_user_is_admin()
);

drop policy if exists "companies_owner_update_or_admin"
on public.companies;

create policy "companies_owner_update_or_admin"
on public.companies
for update
to authenticated
using (
  (
    owner_id = auth.uid()
    and public.current_user_is_employer()
  )
  or public.current_user_is_admin()
)
with check (
  (
    owner_id = auth.uid()
    and public.current_user_is_employer()
  )
  or public.current_user_is_admin()
);

drop policy if exists "internships_employer_update_or_admin"
on public.internships;

create policy "internships_employer_update_or_admin"
on public.internships
for update
to authenticated
using (
  (
    employer_id = auth.uid()
    and public.current_user_is_employer()
  )
  or public.current_user_is_admin()
)
with check (
  (
    employer_id = auth.uid()
    and public.current_user_is_employer()
  )
  or public.current_user_is_admin()
);

drop policy if exists "applications_student_or_employer_update"
on public.applications;

drop policy if exists "applications_student_update"
on public.applications;

create policy "applications_student_update"
on public.applications
for update
to authenticated
using (
  student_id = auth.uid()
  and public.current_user_is_student()
)
with check (
  student_id = auth.uid()
  and public.current_user_is_student()
);

drop policy if exists "applications_employer_update"
on public.applications;

create policy "applications_employer_update"
on public.applications
for update
to authenticated
using (
  public.current_user_is_employer()
  and exists (
    select 1
    from public.internships i
    where i.id = applications.internship_id
      and i.employer_id = auth.uid()
  )
)
with check (
  public.current_user_is_employer()
  and exists (
    select 1
    from public.internships i
    where i.id = applications.internship_id
      and i.employer_id = auth.uid()
  )
);

drop policy if exists "applications_admin_update"
on public.applications;

create policy "applications_admin_update"
on public.applications
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "applications_student_delete_withdrawn"
on public.applications;

create policy "applications_student_delete_withdrawn"
on public.applications
for delete
to authenticated
using (
  (
    student_id = auth.uid()
    and status = 'withdrawn'
    and public.current_user_is_student()
  )
  or public.current_user_is_admin()
);

drop policy if exists "saved_internships_owner_delete"
on public.saved_internships;

create policy "saved_internships_owner_delete"
on public.saved_internships
for delete
to authenticated
using (
  (
    student_id = auth.uid()
    and public.current_user_is_student()
  )
  or public.current_user_is_admin()
);

drop policy if exists "notifications_owner_update"
on public.notifications;

create policy "notifications_owner_update"
on public.notifications
for update
to authenticated
using (
  (
    user_id = auth.uid()
    and (
      public.current_user_is_student()
      or public.current_user_is_employer()
    )
  )
  or public.current_user_is_admin()
)
with check (
  (
    user_id = auth.uid()
    and (
      public.current_user_is_student()
      or public.current_user_is_employer()
    )
  )
  or public.current_user_is_admin()
);

drop policy if exists "notifications_owner_delete"
on public.notifications;

create policy "notifications_owner_delete"
on public.notifications
for delete
to authenticated
using (
  (
    user_id = auth.uid()
    and (
      public.current_user_is_student()
      or public.current_user_is_employer()
    )
  )
  or public.current_user_is_admin()
);

drop policy if exists "student_avatars_owner_update"
on storage.objects;

create policy "student_avatars_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'student-avatars'
  and (
    (
      split_part(name, '/', 1) = auth.uid()::text
      and public.current_user_is_student()
    )
    or public.current_user_is_admin()
  )
)
with check (
  bucket_id = 'student-avatars'
  and (
    (
      split_part(name, '/', 1) = auth.uid()::text
      and public.current_user_is_student()
    )
    or public.current_user_is_admin()
  )
);

drop policy if exists "student_avatars_owner_delete"
on storage.objects;

create policy "student_avatars_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-avatars'
  and (
    (
      split_part(name, '/', 1) = auth.uid()::text
      and public.current_user_is_student()
    )
    or public.current_user_is_admin()
  )
);

drop policy if exists "student_resumes_owner_update"
on storage.objects;

create policy "student_resumes_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'student-resumes'
  and (
    (
      split_part(name, '/', 1) = auth.uid()::text
      and public.current_user_is_student()
    )
    or public.current_user_is_admin()
  )
)
with check (
  bucket_id = 'student-resumes'
  and (
    (
      split_part(name, '/', 1) = auth.uid()::text
      and public.current_user_is_student()
    )
    or public.current_user_is_admin()
  )
);

drop policy if exists "student_resumes_owner_delete"
on storage.objects;

create policy "student_resumes_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-resumes'
  and (
    (
      split_part(name, '/', 1) = auth.uid()::text
      and public.current_user_is_student()
    )
    or public.current_user_is_admin()
  )
);

drop policy if exists "company_assets_owner_update"
on storage.objects;

create policy "company_assets_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-assets'
  and (
    (
      split_part(name, '/', 1) = auth.uid()::text
      and public.current_user_is_employer()
      and exists (
        select 1
        from public.companies c
        where c.owner_id = auth.uid()
      )
    )
    or public.current_user_is_admin()
  )
)
with check (
  bucket_id = 'company-assets'
  and (
    (
      split_part(name, '/', 1) = auth.uid()::text
      and public.current_user_is_employer()
      and exists (
        select 1
        from public.companies c
        where c.owner_id = auth.uid()
      )
    )
    or public.current_user_is_admin()
  )
);

drop policy if exists "company_assets_owner_delete"
on storage.objects;

create policy "company_assets_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-assets'
  and (
    (
      split_part(name, '/', 1) = auth.uid()::text
      and public.current_user_is_employer()
      and exists (
        select 1
        from public.companies c
        where c.owner_id = auth.uid()
      )
    )
    or public.current_user_is_admin()
  )
);

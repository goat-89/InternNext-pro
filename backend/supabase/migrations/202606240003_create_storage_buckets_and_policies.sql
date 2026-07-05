insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'student-avatars',
    'student-avatars',
    true,
    2097152,
    array[
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  ),
  (
    'student-resumes',
    'student-resumes',
    false,
    5242880,
    array[
      'application/pdf'
    ]
  ),
  (
    'company-assets',
    'company-assets',
    true,
    5242880,
    array[
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "student_avatars_public_read" on storage.objects;
drop policy if exists "student_avatars_owner_insert" on storage.objects;
drop policy if exists "student_avatars_owner_update" on storage.objects;
drop policy if exists "student_avatars_owner_delete" on storage.objects;

create policy "student_avatars_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'student-avatars');

create policy "student_avatars_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
  and public.current_user_is_student()
);

create policy "student_avatars_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'student-avatars'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_user_is_admin()
  )
)
with check (
  bucket_id = 'student-avatars'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_user_is_admin()
  )
);

create policy "student_avatars_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-avatars'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_user_is_admin()
  )
);

drop policy if exists "student_resumes_authorized_read" on storage.objects;
drop policy if exists "student_resumes_owner_insert" on storage.objects;
drop policy if exists "student_resumes_owner_update" on storage.objects;
drop policy if exists "student_resumes_owner_delete" on storage.objects;

create policy "student_resumes_authorized_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-resumes'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_user_is_admin()
    or exists (
      select 1
      from public.applications applications
      join public.internships internships
        on internships.id = applications.internship_id
      where applications.resume_path = storage.objects.name
        and internships.employer_id = auth.uid()
    )
  )
);

create policy "student_resumes_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-resumes'
  and split_part(name, '/', 1) = auth.uid()::text
  and public.current_user_is_student()
);

create policy "student_resumes_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'student-resumes'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_user_is_admin()
  )
)
with check (
  bucket_id = 'student-resumes'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_user_is_admin()
  )
);

create policy "student_resumes_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-resumes'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_user_is_admin()
  )
);

drop policy if exists "company_assets_public_read" on storage.objects;
drop policy if exists "company_assets_owner_insert" on storage.objects;
drop policy if exists "company_assets_owner_update" on storage.objects;
drop policy if exists "company_assets_owner_delete" on storage.objects;

create policy "company_assets_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'company-assets');

create policy "company_assets_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-assets'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.companies companies
    where companies.owner_id = auth.uid()
  )
);

create policy "company_assets_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-assets'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_user_is_admin()
  )
)
with check (
  bucket_id = 'company-assets'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_user_is_admin()
  )
);

create policy "company_assets_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-assets'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_user_is_admin()
  )
);

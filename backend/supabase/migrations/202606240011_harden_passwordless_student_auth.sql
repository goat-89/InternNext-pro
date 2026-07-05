begin;

alter table public.profiles
  alter column email drop not null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role :=
    coalesce(
      new.raw_user_meta_data->>'role',
      'student'
    );

  /*
   * Public signup metadata must never create admins.
   * Admin accounts must be promoted by an existing admin
   * through controlled database operations.
   */
  if requested_role not in (
    'student',
    'employer'
  ) then
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
    nullif(
      lower(trim(coalesce(new.email, ''))),
      ''
    ),
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'name',
          ''
        )
      ),
      ''
    ),
    nullif(
      trim(
        coalesce(
          new.phone,
          new.raw_user_meta_data->>'phone',
          ''
        )
      ),
      ''
    ),
    requested_role,
    new.email_confirmed_at is not null
  )
  on conflict (id) do update
  set
    email = excluded.email,
    phone = coalesce(
      public.profiles.phone,
      excluded.phone
    ),
    email_verified =
      excluded.email_verified,
    updated_at = now();

  return new;
end;
$$;

commit;

-- Persistent contact/support ticket workflow.
-- Run this after the core schema and RLS migrations.

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
      and coalesce(
        p.account_status::text,
        'active'
      ) = 'active'
  );
$$;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  category text not null default 'student_support',
  subject text not null,
  message text not null,
  status text not null default 'open',
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_category_check check (
    category in (
      'student_support',
      'employer_inquiry',
      'payment_support',
      'partnership',
      'general'
    )
  ),
  constraint support_tickets_status_check check (
    status in (
      'open',
      'in_progress',
      'resolved',
      'closed'
    )
  )
);

create index if not exists support_tickets_status_created_idx
on public.support_tickets(status, created_at desc);

create index if not exists support_tickets_email_created_idx
on public.support_tickets(lower(email), created_at desc);

create index if not exists support_tickets_requester_created_idx
on public.support_tickets(requester_user_id, created_at desc)
where requester_user_id is not null;

create or replace function public.set_support_ticket_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_tickets_set_updated_at
on public.support_tickets;

create trigger support_tickets_set_updated_at
before update
on public.support_tickets
for each row
execute function public.set_support_ticket_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_admin_select"
on public.support_tickets;

create policy "support_tickets_admin_select"
on public.support_tickets
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "support_tickets_admin_update"
on public.support_tickets;

create policy "support_tickets_admin_update"
on public.support_tickets
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

revoke all on public.support_tickets from anon;
revoke all on public.support_tickets from authenticated;
grant select on public.support_tickets to authenticated;
grant update (status, admin_notes, resolved_at) on public.support_tickets to authenticated;

create or replace function public.create_support_ticket(
  ticket_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_full_name text := trim(coalesce(ticket_data->>'full_name', ''));
  clean_email text := lower(trim(coalesce(ticket_data->>'email', '')));
  clean_phone text := nullif(trim(coalesce(ticket_data->>'phone', '')), '');
  clean_category text := coalesce(nullif(trim(ticket_data->>'category'), ''), 'general');
  clean_subject text := trim(coalesce(ticket_data->>'subject', ''));
  clean_message text := trim(coalesce(ticket_data->>'message', ''));
  created_ticket public.support_tickets;
begin
  if clean_full_name = '' then
    raise exception 'Full name is required.';
  end if;

  if clean_email = ''
    or clean_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'A valid email address is required.';
  end if;

  if clean_category not in (
    'student_support',
    'employer_inquiry',
    'payment_support',
    'partnership',
    'general'
  ) then
    raise exception 'Unsupported inquiry type.';
  end if;

  if clean_subject = '' then
    raise exception 'Subject is required.';
  end if;

  if clean_message = '' then
    raise exception 'Message is required.';
  end if;

  insert into public.support_tickets (
    requester_user_id,
    full_name,
    email,
    phone,
    category,
    subject,
    message
  )
  values (
    auth.uid(),
    left(clean_full_name, 160),
    left(clean_email, 254),
    left(clean_phone, 40),
    clean_category,
    left(clean_subject, 180),
    left(clean_message, 5000)
  )
  returning *
  into created_ticket;

  return jsonb_build_object(
    'id', created_ticket.id,
    'status', created_ticket.status,
    'created_at', created_ticket.created_at
  );
end;
$$;

create or replace function public.list_admin_support_tickets(
  p_status text default 'all',
  p_limit integer default 100
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_status text := coalesce(nullif(trim(p_status), ''), 'all');
  safe_limit integer := least(greatest(coalesce(p_limit, 100), 1), 500);
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if safe_status not in (
    'all',
    'open',
    'in_progress',
    'resolved',
    'closed'
  ) then
    raise exception 'Unsupported support ticket status filter.';
  end if;

  return query
  select to_jsonb(tickets.*)
  from public.support_tickets tickets
  where safe_status = 'all'
    or tickets.status = safe_status
  order by tickets.created_at desc
  limit safe_limit;
end;
$$;

create or replace function public.update_admin_support_ticket(
  p_ticket_id uuid,
  p_status text,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_status text := trim(coalesce(p_status, ''));
  clean_notes text := nullif(trim(coalesce(p_admin_notes, '')), '');
  updated_ticket public.support_tickets;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if clean_status not in (
    'open',
    'in_progress',
    'resolved',
    'closed'
  ) then
    raise exception 'Invalid support ticket status.';
  end if;

  update public.support_tickets
  set
    status = clean_status,
    admin_notes = clean_notes,
    resolved_at = case
      when clean_status in ('resolved', 'closed') then coalesce(resolved_at, now())
      else null
    end
  where id = p_ticket_id
  returning *
  into updated_ticket;

  if updated_ticket.id is null then
    raise exception 'Support ticket not found.';
  end if;

  return to_jsonb(updated_ticket);
end;
$$;

revoke all on function public.create_support_ticket(jsonb) from public;
revoke all on function public.list_admin_support_tickets(text, integer) from public;
revoke all on function public.update_admin_support_ticket(uuid, text, text) from public;

grant execute on function public.create_support_ticket(jsonb) to anon, authenticated;
grant execute on function public.list_admin_support_tickets(text, integer) to authenticated;
grant execute on function public.update_admin_support_ticket(uuid, text, text) to authenticated;

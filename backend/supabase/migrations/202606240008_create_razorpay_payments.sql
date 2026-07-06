-- Razorpay payment foundation.
-- Secrets are used only by Supabase Edge Functions, never by browser code.

create extension if not exists pgcrypto;

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

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_key text not null,
  plan_name text not null,
  role_scope text not null check (role_scope in ('student', 'employer')),
  amount integer not null check (amount > 0),
  currency text not null default 'INR',
  receipt text not null unique,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  status text not null default 'initiated' check (
    status in (
      'initiated',
      'created',
      'paid',
      'failed',
      'cancelled'
    )
  ),
  failure_reason text,
  billing_name text,
  billing_email text,
  billing_phone text,
  billing_gst_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  razorpay_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payment_orders_user_created_idx
on public.payment_orders(user_id, created_at desc);

create index if not exists payment_orders_status_created_idx
on public.payment_orders(status, created_at desc);

create index if not exists payment_orders_razorpay_order_idx
on public.payment_orders(razorpay_order_id)
where razorpay_order_id is not null;

create index if not exists payment_webhook_events_created_idx
on public.payment_webhook_events(created_at desc);

create or replace function public.set_payment_order_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_orders_set_updated_at
on public.payment_orders;

create trigger payment_orders_set_updated_at
before update
on public.payment_orders
for each row
execute function public.set_payment_order_updated_at();

alter table public.payment_orders enable row level security;
alter table public.payment_webhook_events enable row level security;

drop policy if exists "payment_orders_owner_or_admin_select"
on public.payment_orders;

create policy "payment_orders_owner_or_admin_select"
on public.payment_orders
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_admin()
);

drop policy if exists "payment_webhook_events_admin_select"
on public.payment_webhook_events;

create policy "payment_webhook_events_admin_select"
on public.payment_webhook_events
for select
to authenticated
using (public.current_user_is_admin());

revoke all on public.payment_orders from anon;
revoke all on public.payment_orders from authenticated;
grant select on public.payment_orders to authenticated;

revoke all on public.payment_webhook_events from anon;
revoke all on public.payment_webhook_events from authenticated;
grant select on public.payment_webhook_events to authenticated;

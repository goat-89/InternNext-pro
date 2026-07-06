-- Subscription and entitlement enforcement foundation.
-- This migration is additive and keeps existing payment order history intact.

create extension if not exists pgcrypto;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  name text not null,
  description text,
  role_scope text not null check (role_scope in ('student', 'employer')),
  amount integer not null check (amount >= 0),
  currency text not null default 'INR',
  billing_period text not null default 'one_time' check (
    billing_period in ('one_time', 'monthly', 'quarterly', 'yearly')
  ),
  duration_days integer not null default 30 check (duration_days > 0),
  is_active boolean not null default true,
  is_public boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  limit_value integer check (limit_value is null or limit_value >= 0),
  reset_period text not null default 'none' check (
    reset_period in ('none', 'monthly', 'billing_period')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, feature_key)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'active' check (
    status in (
      'trialing',
      'active',
      'grace_period',
      'past_due',
      'cancelled',
      'expired',
      'refunded',
      'suspended'
    )
  ),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  grace_until timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,
  source_payment_order_id uuid unique references public.payment_orders(id) on delete set null,
  scheduled_plan_id uuid references public.subscription_plans(id),
  scheduled_change_type text check (
    scheduled_change_type is null
    or scheduled_change_type in ('downgrade', 'cancel')
  ),
  scheduled_change_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlement_usage (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  used integer not null default 0 check (used >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, feature_key, period_start, period_end)
);

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  payment_order_id uuid references public.payment_orders(id) on delete set null,
  event_type text not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  limit_value integer check (limit_value is null or limit_value >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_orders
add column if not exists plan_id uuid references public.subscription_plans(id);

alter table public.payment_orders
add column if not exists subscription_id uuid references public.subscriptions(id);

alter table public.payment_webhook_events
add column if not exists processing_status text not null default 'processed';

alter table public.payment_webhook_events
add column if not exists failure_reason text;

alter table public.payment_webhook_events
add column if not exists affected_payment_order_id uuid references public.payment_orders(id) on delete set null;

alter table public.payment_webhook_events
add column if not exists affected_subscription_id uuid references public.subscriptions(id) on delete set null;

create index if not exists subscription_plans_role_public_idx
on public.subscription_plans(role_scope, is_public, sort_order);

create index if not exists plan_entitlements_plan_feature_idx
on public.plan_entitlements(plan_id, feature_key);

create index if not exists subscriptions_user_status_period_idx
on public.subscriptions(user_id, status, current_period_end desc);

create unique index if not exists subscriptions_one_current_per_user_uidx
on public.subscriptions(user_id)
where status in ('trialing', 'active', 'grace_period', 'past_due', 'suspended');

create index if not exists entitlement_usage_user_feature_period_idx
on public.entitlement_usage(user_id, feature_key, period_start, period_end);

create index if not exists subscription_events_user_created_idx
on public.subscription_events(user_id, created_at desc);

create index if not exists subscription_events_subscription_created_idx
on public.subscription_events(subscription_id, created_at desc);

create index if not exists entitlement_overrides_user_feature_idx
on public.entitlement_overrides(user_id, feature_key, starts_at, ends_at);

create index if not exists payment_orders_subscription_idx
on public.payment_orders(subscription_id)
where subscription_id is not null;

create or replace function public.set_subscription_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscription_plans_set_updated_at
on public.subscription_plans;

create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row
execute function public.set_subscription_updated_at();

drop trigger if exists plan_entitlements_set_updated_at
on public.plan_entitlements;

create trigger plan_entitlements_set_updated_at
before update on public.plan_entitlements
for each row
execute function public.set_subscription_updated_at();

drop trigger if exists subscriptions_set_updated_at
on public.subscriptions;

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_subscription_updated_at();

drop trigger if exists entitlement_usage_set_updated_at
on public.entitlement_usage;

create trigger entitlement_usage_set_updated_at
before update on public.entitlement_usage
for each row
execute function public.set_subscription_updated_at();

drop trigger if exists entitlement_overrides_set_updated_at
on public.entitlement_overrides;

create trigger entitlement_overrides_set_updated_at
before update on public.entitlement_overrides
for each row
execute function public.set_subscription_updated_at();

insert into public.subscription_plans (
  plan_key,
  name,
  description,
  role_scope,
  amount,
  currency,
  billing_period,
  duration_days,
  sort_order,
  metadata
)
values
  (
    'employer_free',
    'Employer Free',
    'Starter employer access with conservative limits.',
    'employer',
    0,
    'INR',
    'monthly',
    30,
    10,
    '{"fallback": true}'::jsonb
  ),
  (
    'employer_single_post',
    'Single Post',
    'One paid internship listing package.',
    'employer',
    99900,
    'INR',
    'monthly',
    30,
    20,
    '{}'::jsonb
  ),
  (
    'employer_growth',
    'Growth',
    'Growth hiring package with more listings and analytics.',
    'employer',
    349900,
    'INR',
    'monthly',
    30,
    30,
    '{"popular": true}'::jsonb
  ),
  (
    'employer_scale',
    'Scale',
    'Scale hiring package for larger campaigns.',
    'employer',
    799900,
    'INR',
    'monthly',
    30,
    40,
    '{}'::jsonb
  ),
  (
    'student_career_pro',
    'Career Pro',
    'Career support package for students.',
    'student',
    149900,
    'INR',
    'monthly',
    30,
    110,
    '{}'::jsonb
  ),
  (
    'student_placement_max',
    'Placement Max',
    'Placement preparation package for students.',
    'student',
    299900,
    'INR',
    'monthly',
    30,
    120,
    '{}'::jsonb
  )
on conflict (plan_key) do update
set
  name = excluded.name,
  description = excluded.description,
  role_scope = excluded.role_scope,
  amount = excluded.amount,
  currency = excluded.currency,
  billing_period = excluded.billing_period,
  duration_days = excluded.duration_days,
  sort_order = excluded.sort_order,
  metadata = public.subscription_plans.metadata || excluded.metadata;

with entitlement_seed(plan_key, feature_key, enabled, limit_value, reset_period, metadata) as (
  values
    ('employer_free', 'active_internships', true, 1, 'none', '{}'::jsonb),
    ('employer_free', 'monthly_posts', true, 1, 'monthly', '{}'::jsonb),
    ('employer_free', 'applicant_access', true, 25, 'billing_period', '{}'::jsonb),
    ('employer_free', 'resume_downloads', false, 0, 'billing_period', '{}'::jsonb),
    ('employer_free', 'analytics', false, 0, 'none', '{}'::jsonb),
    ('employer_free', 'featured_listings', false, 0, 'billing_period', '{}'::jsonb),

    ('employer_single_post', 'active_internships', true, 1, 'none', '{}'::jsonb),
    ('employer_single_post', 'monthly_posts', true, 1, 'monthly', '{}'::jsonb),
    ('employer_single_post', 'applicant_access', true, 100, 'billing_period', '{}'::jsonb),
    ('employer_single_post', 'resume_downloads', true, 25, 'billing_period', '{}'::jsonb),
    ('employer_single_post', 'analytics', false, 0, 'none', '{}'::jsonb),
    ('employer_single_post', 'featured_listings', false, 0, 'billing_period', '{}'::jsonb),

    ('employer_growth', 'active_internships', true, 10, 'none', '{}'::jsonb),
    ('employer_growth', 'monthly_posts', true, 10, 'monthly', '{}'::jsonb),
    ('employer_growth', 'applicant_access', true, null, 'billing_period', '{}'::jsonb),
    ('employer_growth', 'resume_downloads', true, 250, 'billing_period', '{}'::jsonb),
    ('employer_growth', 'analytics', true, 1, 'none', '{}'::jsonb),
    ('employer_growth', 'featured_listings', true, 2, 'billing_period', '{}'::jsonb),

    ('employer_scale', 'active_internships', true, 25, 'none', '{}'::jsonb),
    ('employer_scale', 'monthly_posts', true, 25, 'monthly', '{}'::jsonb),
    ('employer_scale', 'applicant_access', true, null, 'billing_period', '{}'::jsonb),
    ('employer_scale', 'resume_downloads', true, 1000, 'billing_period', '{}'::jsonb),
    ('employer_scale', 'analytics', true, 1, 'none', '{}'::jsonb),
    ('employer_scale', 'featured_listings', true, 6, 'billing_period', '{}'::jsonb),

    ('student_career_pro', 'career_services', true, 1, 'billing_period', '{}'::jsonb),
    ('student_placement_max', 'career_services', true, 1, 'billing_period', '{}'::jsonb),
    ('student_placement_max', 'placement_bundle', true, 1, 'billing_period', '{}'::jsonb)
)
insert into public.plan_entitlements (
  plan_id,
  feature_key,
  enabled,
  limit_value,
  reset_period,
  metadata
)
select
  p.id,
  e.feature_key,
  e.enabled,
  e.limit_value,
  e.reset_period,
  e.metadata
from entitlement_seed e
join public.subscription_plans p
  on p.plan_key = e.plan_key
on conflict (plan_id, feature_key) do update
set
  enabled = excluded.enabled,
  limit_value = excluded.limit_value,
  reset_period = excluded.reset_period,
  metadata = public.plan_entitlements.metadata || excluded.metadata;

create or replace function public.get_effective_subscription_for_user(
  target_user_id uuid
)
returns table (
  subscription_id uuid,
  plan_id uuid,
  plan_key text,
  plan_name text,
  role_scope text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    p.id,
    p.plan_key,
    p.name,
    p.role_scope,
    s.status,
    s.current_period_start,
    s.current_period_end
  from public.subscriptions s
  join public.subscription_plans p
    on p.id = s.plan_id
  where s.user_id = target_user_id
    and s.status in ('trialing', 'active', 'grace_period', 'past_due')
    and (
      s.current_period_end >= now()
      or s.grace_until >= now()
    )
  order by
    case s.status
      when 'active' then 1
      when 'trialing' then 2
      when 'grace_period' then 3
      else 4
    end,
    s.current_period_end desc
  limit 1;
$$;

create or replace function public.get_entitlement_snapshot_for_user(
  target_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_role text;
  subscription_id_value uuid;
  plan_id_value uuid;
  plan_key_value text;
  plan_name_value text;
  role_scope_value text;
  status_value text;
  period_start_value timestamptz;
  period_end_value timestamptz;
  entitlements jsonb := '{}'::jsonb;
  override_record record;
begin
  select role::text
  into target_role
  from public.profiles
  where id = target_user_id;

  select *
  into
    subscription_id_value,
    plan_id_value,
    plan_key_value,
    plan_name_value,
    role_scope_value,
    status_value,
    period_start_value,
    period_end_value
  from public.get_effective_subscription_for_user(target_user_id)
  limit 1;

  if subscription_id_value is null then
    select
      null::uuid as subscription_id,
      p.id as plan_id,
      p.plan_key,
      p.name as plan_name,
      p.role_scope,
      'free'::text as status,
      now() as current_period_start,
      now() + interval '30 days' as current_period_end
    into
      subscription_id_value,
      plan_id_value,
      plan_key_value,
      plan_name_value,
      role_scope_value,
      status_value,
      period_start_value,
      period_end_value
    from public.subscription_plans p
    where p.plan_key =
      case
        when target_role = 'employer' then 'employer_free'
        else null
      end
    limit 1;
  end if;

  if plan_id_value is not null then
    select coalesce(
      jsonb_object_agg(
        pe.feature_key,
        jsonb_build_object(
          'enabled', pe.enabled,
          'limit', pe.limit_value,
          'reset_period', pe.reset_period
        )
      ),
      '{}'::jsonb
    )
    into entitlements
    from public.plan_entitlements pe
    where pe.plan_id = plan_id_value;
  end if;

  for override_record in
    select *
    from public.entitlement_overrides eo
    where eo.user_id = target_user_id
      and eo.starts_at <= now()
      and (
        eo.ends_at is null
        or eo.ends_at > now()
      )
  loop
    entitlements :=
      jsonb_set(
        entitlements,
        array[override_record.feature_key],
        jsonb_build_object(
          'enabled', override_record.enabled,
          'limit', override_record.limit_value,
          'reset_period', 'override',
          'override', true
        ),
        true
      );
  end loop;

  return jsonb_build_object(
    'subscription', jsonb_build_object(
      'id', subscription_id_value,
      'plan_id', plan_id_value,
      'plan_key', plan_key_value,
      'plan_name', plan_name_value,
      'role_scope', role_scope_value,
      'status', status_value,
      'current_period_start', period_start_value,
      'current_period_end', period_end_value
    ),
    'entitlements', entitlements
  );
end;
$$;

create or replace function public.get_my_subscription_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  return public.get_entitlement_snapshot_for_user(current_user_id);
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
  current_user_id uuid := auth.uid();
  profile_role text;
  profile_status text;
  snapshot jsonb;
  entitlements jsonb;
  active_limit integer;
  monthly_limit integer;
  active_count bigint := 0;
  monthly_count bigint := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select
    role::text,
    coalesce(account_status::text, 'active')
  into
    profile_role,
    profile_status
  from public.profiles
  where id = current_user_id;

  if profile_role <> 'employer' then
    raise exception 'Employer access is required.';
  end if;

  if profile_status = 'suspended' then
    raise exception 'This employer account is suspended.';
  end if;

  snapshot := public.get_entitlement_snapshot_for_user(current_user_id);
  entitlements := snapshot -> 'entitlements';

  active_limit := nullif(
    entitlements #>> '{active_internships,limit}',
    ''
  )::integer;

  monthly_limit := nullif(
    entitlements #>> '{monthly_posts,limit}',
    ''
  )::integer;

  select count(*)
  into active_count
  from public.internships i
  where i.employer_id = current_user_id
    and i.status::text = 'approved'
    and (
      i.deadline is null
      or i.deadline >= current_date
    );

  select count(*)
  into monthly_count
  from public.internships i
  where i.employer_id = current_user_id
    and i.created_at >= date_trunc('month', now())
    and i.status::text in (
      'pending',
      'approved',
      'rejected',
      'paused',
      'closed'
    );

  return jsonb_build_object(
    'employer_id', current_user_id,
    'detected_role', profile_role,
    'active_count', active_count,
    'maximum_active', coalesce(active_limit, 2147483647),
    'remaining', case
      when active_limit is null then null
      else greatest(active_limit - active_count::integer, 0)
    end,
    'limit_reached', active_limit is not null and active_count >= active_limit,
    'monthly_posts_used', monthly_count,
    'monthly_posts_limit', monthly_limit,
    'monthly_posts_remaining', case
      when monthly_limit is null then null
      else greatest(monthly_limit - monthly_count::integer, 0)
    end,
    'monthly_posts_limit_reached', monthly_limit is not null and monthly_count >= monthly_limit,
    'subscription', snapshot -> 'subscription',
    'entitlements', entitlements
  );
end;
$$;

create or replace function public.check_employer_entitlement(
  feature_key text,
  requested_amount integer default 1
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  snapshot jsonb;
  entitlement jsonb;
  allowed boolean := false;
  limit_value integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  snapshot := public.get_entitlement_snapshot_for_user(current_user_id);
  entitlement := snapshot -> 'entitlements' -> feature_key;
  allowed := coalesce((entitlement ->> 'enabled')::boolean, false);
  limit_value := nullif(entitlement ->> 'limit', '')::integer;

  return jsonb_build_object(
    'feature_key', feature_key,
    'allowed', allowed and (
      limit_value is null
      or requested_amount <= limit_value
    ),
    'enabled', allowed,
    'limit', limit_value,
    'subscription', snapshot -> 'subscription'
  );
end;
$$;

create or replace function public.activate_subscription_from_payment_order(
  target_payment_order_id uuid,
  provider_payment_id text default null,
  activation_source text default 'verification'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record public.payment_orders%rowtype;
  plan_record public.subscription_plans%rowtype;
  existing_subscription public.subscriptions%rowtype;
  new_subscription public.subscriptions%rowtype;
  start_at timestamptz;
  end_at timestamptz;
begin
  select *
  into order_record
  from public.payment_orders
  where id = target_payment_order_id
  for update;

  if order_record.id is null then
    raise exception 'Payment order not found.';
  end if;

  perform pg_advisory_xact_lock(hashtext(order_record.user_id::text));

  select *
  into plan_record
  from public.subscription_plans
  where plan_key = order_record.plan_key
    and role_scope = order_record.role_scope
  limit 1;

  if plan_record.id is null then
    raise exception 'Subscription plan not found for %.', order_record.plan_key;
  end if;

  update public.payment_orders
  set
    status = 'paid',
    razorpay_payment_id = coalesce(provider_payment_id, razorpay_payment_id),
    failure_reason = null,
    paid_at = coalesce(paid_at, now()),
    plan_id = plan_record.id
  where id = order_record.id
  returning *
  into order_record;

  if order_record.subscription_id is not null then
    select *
    into existing_subscription
    from public.subscriptions
    where id = order_record.subscription_id;

    return jsonb_build_object(
      'subscription_id', existing_subscription.id,
      'status', existing_subscription.status,
      'plan_key', plan_record.plan_key,
      'already_activated', true
    );
  end if;

  select *
  into existing_subscription
  from public.subscriptions
  where source_payment_order_id = order_record.id
  limit 1;

  if existing_subscription.id is not null then
    update public.payment_orders
    set subscription_id = existing_subscription.id
    where id = order_record.id;

    return jsonb_build_object(
      'subscription_id', existing_subscription.id,
      'status', existing_subscription.status,
      'plan_key', plan_record.plan_key,
      'already_activated', true
    );
  end if;

  update public.subscriptions
  set
    status = 'expired',
    expired_at = now(),
    updated_at = now(),
    metadata = metadata || jsonb_build_object(
      'expired_by_payment_order_id',
      order_record.id
    )
  where user_id = order_record.user_id
    and status in ('trialing', 'active', 'grace_period', 'past_due', 'suspended');

  start_at := coalesce(order_record.paid_at, now());
  end_at := start_at + make_interval(days => plan_record.duration_days);

  insert into public.subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    source_payment_order_id,
    metadata
  )
  values (
    order_record.user_id,
    plan_record.id,
    'active',
    start_at,
    end_at,
    order_record.id,
    jsonb_build_object(
      'activation_source',
      activation_source,
      'payment_order_id',
      order_record.id
    )
  )
  returning *
  into new_subscription;

  update public.payment_orders
  set subscription_id = new_subscription.id
  where id = order_record.id;

  insert into public.subscription_events (
    subscription_id,
    user_id,
    payment_order_id,
    event_type,
    metadata
  )
  values (
    new_subscription.id,
    order_record.user_id,
    order_record.id,
    'subscription_activated',
    jsonb_build_object(
      'source',
      activation_source,
      'plan_key',
      plan_record.plan_key
    )
  );

  return jsonb_build_object(
    'subscription_id', new_subscription.id,
    'status', new_subscription.status,
    'plan_key', plan_record.plan_key,
    'already_activated', false
  );
end;
$$;

create or replace function public.record_subscription_payment_failure(
  target_payment_order_id uuid,
  failure_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record public.payment_orders%rowtype;
begin
  update public.payment_orders
  set
    status = 'failed',
    failure_reason = coalesce(nullif(failure_message, ''), 'Payment failed.')
  where id = target_payment_order_id
    and status <> 'paid'
  returning *
  into order_record;

  if order_record.id is not null then
    insert into public.subscription_events (
      user_id,
      payment_order_id,
      event_type,
      metadata
    )
    values (
      order_record.user_id,
      order_record.id,
      'payment_failed',
      jsonb_build_object(
        'failure_reason',
        order_record.failure_reason
      )
    );
  end if;

  return jsonb_build_object(
    'payment_order_id',
    order_record.id,
    'status',
    order_record.status
  );
end;
$$;

create or replace function public.record_subscription_refund(
  target_razorpay_payment_id text,
  refund_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record public.payment_orders%rowtype;
  subscription_record public.subscriptions%rowtype;
begin
  select *
  into order_record
  from public.payment_orders
  where razorpay_payment_id = target_razorpay_payment_id
  limit 1;

  if order_record.id is null then
    return jsonb_build_object('matched', false);
  end if;

  update public.subscriptions
  set
    status = 'refunded',
    expired_at = now(),
    metadata = metadata || jsonb_build_object('refund', refund_payload)
  where id = order_record.subscription_id
  returning *
  into subscription_record;

  insert into public.subscription_events (
    subscription_id,
    user_id,
    payment_order_id,
    event_type,
    metadata
  )
  values (
    subscription_record.id,
    order_record.user_id,
    order_record.id,
    'subscription_refunded',
    refund_payload
  );

  return jsonb_build_object(
    'matched',
    true,
    'subscription_id',
    subscription_record.id
  );
end;
$$;

create or replace function public.enforce_employer_internship_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot jsonb;
  entitlements jsonb;
  active_limit integer;
  monthly_limit integer;
  featured_limit integer;
  active_count bigint;
  monthly_count bigint;
  featured_count bigint;
begin
  snapshot := public.get_entitlement_snapshot_for_user(new.employer_id);
  entitlements := snapshot -> 'entitlements';

  if new.status::text = 'pending'
    and (
      tg_op = 'INSERT'
      or old.status::text is distinct from 'pending'
    )
  then
    monthly_limit := nullif(entitlements #>> '{monthly_posts,limit}', '')::integer;

    if monthly_limit is not null then
      select count(*)
      into monthly_count
      from public.internships i
      where i.employer_id = new.employer_id
        and i.id is distinct from new.id
        and i.created_at >= date_trunc('month', now())
        and i.status::text in (
          'pending',
          'approved',
          'rejected',
          'paused',
          'closed'
        );

      if monthly_count >= monthly_limit then
        raise exception 'Monthly internship post limit reached for the current plan.';
      end if;
    end if;
  end if;

  if new.status::text = 'approved'
    and (
      new.deadline is null
      or new.deadline >= current_date
    )
  then
    active_limit := nullif(entitlements #>> '{active_internships,limit}', '')::integer;

    if active_limit is not null then
      select count(*)
      into active_count
      from public.internships i
      where i.employer_id = new.employer_id
        and i.id is distinct from new.id
        and i.status::text = 'approved'
        and (
          i.deadline is null
          or i.deadline >= current_date
        );

      if active_count >= active_limit then
        raise exception 'Active internship limit reached for the current plan.';
      end if;
    end if;
  end if;

  if coalesce(new.featured, false)
    and (
      tg_op = 'INSERT'
      or coalesce(old.featured, false) is distinct from true
    )
  then
    if coalesce((entitlements #>> '{featured_listings,enabled}')::boolean, false) is not true then
      raise exception 'Featured listings are not available on the current plan.';
    end if;

    featured_limit := nullif(entitlements #>> '{featured_listings,limit}', '')::integer;

    if featured_limit is not null then
      select count(*)
      into featured_count
      from public.internships i
      where i.employer_id = new.employer_id
        and i.id is distinct from new.id
        and i.featured is true
        and i.status::text = 'approved'
        and (
          i.featured_until is null
          or i.featured_until >= now()
        );

      if featured_count >= featured_limit then
        raise exception 'Featured listing limit reached for the current plan.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists internships_entitlement_guard
on public.internships;

create trigger internships_entitlement_guard
before insert or update of status, deadline, employer_id, featured, featured_until
on public.internships
for each row
execute function public.enforce_employer_internship_entitlements();

alter table public.subscription_plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlement_usage enable row level security;
alter table public.subscription_events enable row level security;
alter table public.entitlement_overrides enable row level security;

drop policy if exists subscription_plans_public_select
on public.subscription_plans;

create policy subscription_plans_public_select
on public.subscription_plans
for select
to anon, authenticated
using (is_active and is_public);

drop policy if exists subscription_plans_admin_select
on public.subscription_plans;

create policy subscription_plans_admin_select
on public.subscription_plans
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists plan_entitlements_public_select
on public.plan_entitlements;

create policy plan_entitlements_public_select
on public.plan_entitlements
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.subscription_plans p
    where p.id = plan_id
      and p.is_active
      and p.is_public
  )
);

drop policy if exists subscriptions_owner_or_admin_select
on public.subscriptions;

create policy subscriptions_owner_or_admin_select
on public.subscriptions
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_admin()
);

drop policy if exists entitlement_usage_owner_or_admin_select
on public.entitlement_usage;

create policy entitlement_usage_owner_or_admin_select
on public.entitlement_usage
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_admin()
);

drop policy if exists subscription_events_owner_or_admin_select
on public.subscription_events;

create policy subscription_events_owner_or_admin_select
on public.subscription_events
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_admin()
);

drop policy if exists entitlement_overrides_admin_select
on public.entitlement_overrides;

create policy entitlement_overrides_admin_select
on public.entitlement_overrides
for select
to authenticated
using (public.current_user_is_admin());

revoke all on public.subscription_plans from anon;
revoke all on public.subscription_plans from authenticated;
grant select on public.subscription_plans to anon, authenticated;

revoke all on public.plan_entitlements from anon;
revoke all on public.plan_entitlements from authenticated;
grant select on public.plan_entitlements to anon, authenticated;

revoke all on public.subscriptions from anon;
revoke all on public.subscriptions from authenticated;
grant select on public.subscriptions to authenticated;

revoke all on public.entitlement_usage from anon;
revoke all on public.entitlement_usage from authenticated;
grant select on public.entitlement_usage to authenticated;

revoke all on public.subscription_events from anon;
revoke all on public.subscription_events from authenticated;
grant select on public.subscription_events to authenticated;

revoke all on public.entitlement_overrides from anon;
revoke all on public.entitlement_overrides from authenticated;
grant select on public.entitlement_overrides to authenticated;

revoke all on function public.get_effective_subscription_for_user(uuid) from public;
revoke all on function public.get_entitlement_snapshot_for_user(uuid) from public;
revoke all on function public.activate_subscription_from_payment_order(uuid, text, text) from public;
revoke all on function public.record_subscription_payment_failure(uuid, text) from public;
revoke all on function public.record_subscription_refund(text, jsonb) from public;
revoke all on function public.enforce_employer_internship_entitlements() from public;

grant execute on function public.get_my_subscription_overview() to authenticated;
grant execute on function public.get_employer_internship_limit_status() to authenticated;
grant execute on function public.check_employer_entitlement(text, integer) to authenticated;

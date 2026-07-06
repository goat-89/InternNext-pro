-- Trusted notification event producers for core workflows.
-- Depends on notification engine foundation and recipient policy migrations.

create or replace function public.try_publish_domain_notification_event(
  p_event_key text,
  p_aggregate_type text default null,
  p_aggregate_id uuid default null,
  p_actor_user_id uuid default null,
  p_idempotency_key text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.publish_domain_notification_event(
    p_event_key,
    p_aggregate_type,
    p_aggregate_id,
    p_actor_user_id,
    p_idempotency_key,
    p_payload
  );
exception
  when others then
    raise warning 'Notification event publish failed: %, aggregate %, id %',
      p_event_key,
      p_aggregate_type,
      p_aggregate_id;

    return jsonb_build_object(
      'event_key',
      p_event_key,
      'created_notifications',
      0,
      'error',
      'NOTIFICATION_DELIVERY_FAILED'
    );
end;
$$;

create or replace function public.notification_application_payload(
  target_application_id uuid,
  extra_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  select jsonb_build_object(
    'application_id', a.id,
    'student_id', a.student_id,
    'student_name', coalesce(p.full_name, 'Candidate'),
    'internship_id', i.id,
    'internship_title', coalesce(i.title, 'this internship'),
    'employer_id', i.employer_id,
    'company_id', i.company_id,
    'application_status', a.status
  )
  into payload
  from public.applications a
  join public.internships i
    on i.id = a.internship_id
  left join public.profiles p
    on p.id = a.student_id
  where a.id = target_application_id;

  return coalesce(payload, '{}'::jsonb) || coalesce(extra_payload, '{}'::jsonb);
end;
$$;

create or replace function public.publish_application_notification_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_payload jsonb;
  status_event text;
begin
  base_payload := public.notification_application_payload(new.id);

  if tg_op = 'INSERT' then
    perform public.try_publish_domain_notification_event(
      'application_submitted',
      'application',
      new.id,
      new.student_id,
      'application-submitted:' || new.id::text,
      base_payload || jsonb_build_object(
        'deep_link',
        '/student/applications'
      )
    );

    perform public.try_publish_domain_notification_event(
      'application_received',
      'application',
      new.id,
      new.student_id,
      'application-received:' || new.id::text,
      base_payload || jsonb_build_object(
        'deep_link',
        '/employer/applicants'
      )
    );

    return new;
  end if;

  if old.status is distinct from new.status then
    status_event :=
      case new.status::text
        when 'under_review' then 'application_under_review'
        when 'shortlisted' then 'application_shortlisted'
        when 'rejected' then 'application_rejected'
        when 'selected' then 'application_selected'
        when 'withdrawn' then 'application_withdrawn'
        else null
      end;

    if status_event is not null then
      perform public.try_publish_domain_notification_event(
        status_event,
        'application',
        new.id,
        auth.uid(),
        'application-status:' || new.id::text || ':' || new.status::text || ':' || coalesce(new.updated_at, now())::text,
        base_payload || jsonb_build_object(
          'deep_link',
          case
            when status_event = 'application_withdrawn'
              then '/employer/applicants'
            else '/student/applications'
          end
        )
      );
    end if;
  end if;

  if new.status::text = 'interview_scheduled'
    and (
      old.status is distinct from new.status
      or old.interview_at is distinct from new.interview_at
      or old.meeting_link is distinct from new.meeting_link
      or old.interview_location is distinct from new.interview_location
    )
  then
    perform public.try_publish_domain_notification_event(
      case
        when old.status::text = 'interview_scheduled'
          then 'interview_rescheduled'
        else 'interview_scheduled'
      end,
      'application',
      new.id,
      auth.uid(),
      'interview-scheduled:' || new.id::text || ':' || coalesce(new.interview_at::text, 'none'),
      base_payload || jsonb_build_object(
        'interview_time',
        coalesce(new.interview_at::text, 'the scheduled time'),
        'deep_link',
        '/student/interviews'
      )
    );
  end if;

  if old.status::text = 'interview_scheduled'
    and new.status::text <> 'interview_scheduled'
    and old.interview_at is not null
    and new.interview_at is null
  then
    perform public.try_publish_domain_notification_event(
      'interview_cancelled',
      'application',
      new.id,
      auth.uid(),
      'interview-cancelled:' || new.id::text || ':' || coalesce(new.updated_at, now())::text,
      base_payload || jsonb_build_object(
        'deep_link',
        '/student/applications'
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists applications_notification_events
on public.applications;

create trigger applications_notification_events
after insert or update of status, interview_at, meeting_link, interview_location
on public.applications
for each row
execute function public.publish_application_notification_events();

create or replace function public.publish_support_ticket_notification_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'support_ticket_id', new.id,
    'subject', new.subject,
    'status', new.status,
    'category', new.category
  );

  if tg_op = 'INSERT' then
    perform public.try_publish_domain_notification_event(
      'support_ticket_created',
      'support_ticket',
      new.id,
      new.requester_user_id,
      'support-ticket-created:' || new.id::text,
      payload
    );

    return new;
  end if;

  if old.status is distinct from new.status
    or old.admin_notes is distinct from new.admin_notes
  then
    perform public.try_publish_domain_notification_event(
      'support_ticket_updated',
      'support_ticket',
      new.id,
      auth.uid(),
      'support-ticket-updated:' || new.id::text || ':' || coalesce(new.updated_at, now())::text,
      payload
    );
  end if;

  return new;
end;
$$;

drop trigger if exists support_tickets_notification_events
on public.support_tickets;

create trigger support_tickets_notification_events
after insert or update of status, admin_notes
on public.support_tickets
for each row
execute function public.publish_support_ticket_notification_events();

create or replace function public.publish_payment_order_notification_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  link_path text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  link_path :=
    case
      when new.role_scope = 'employer' then '/employer/billing'
      else '/student/billing'
    end;

  if new.status = 'paid' then
    perform public.try_publish_domain_notification_event(
      'payment_success',
      'payment_order',
      new.id,
      new.user_id,
      'payment-success:' || new.id::text,
      jsonb_build_object(
        'payment_order_id', new.id,
        'plan_name', new.plan_name,
        'amount', new.amount,
        'currency', new.currency,
        'deep_link', link_path
      )
    );
  end if;

  if new.status = 'failed' then
    perform public.try_publish_domain_notification_event(
      'payment_failed',
      'payment_order',
      new.id,
      new.user_id,
      'payment-failed:' || new.id::text || ':' || coalesce(new.updated_at, now())::text,
      jsonb_build_object(
        'payment_order_id', new.id,
        'plan_name', new.plan_name,
        'failure_reason', coalesce(new.failure_reason, 'Payment failed.'),
        'deep_link', link_path
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists payment_orders_notification_events
on public.payment_orders;

create trigger payment_orders_notification_events
after update of status
on public.payment_orders
for each row
execute function public.publish_payment_order_notification_events();

create or replace function public.publish_subscription_notification_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_record record;
  profile_role text;
  link_path text;
begin
  select p.plan_key, p.name
  into plan_record
  from public.subscription_plans p
  where p.id = new.plan_id;

  select role::text
  into profile_role
  from public.profiles
  where id = new.user_id;

  link_path :=
    case
      when profile_role = 'employer' then '/employer/billing'
      else '/student/billing'
    end;

  if tg_op = 'INSERT' and new.status = 'active' then
    perform public.try_publish_domain_notification_event(
      'subscription_activated',
      'subscription',
      new.id,
      new.user_id,
      'subscription-activated:' || new.id::text,
      jsonb_build_object(
        'subscription_id', new.id,
        'plan_name', coalesce(plan_record.name, 'Your plan'),
        'deep_link', link_path
      )
    );

    return new;
  end if;

  if old.status is distinct from new.status then
    perform public.try_publish_domain_notification_event(
      case
        when new.status in ('expired', 'cancelled', 'refunded') then 'subscription_expired'
        else 'subscription_update'
      end,
      'subscription',
      new.id,
      new.user_id,
      'subscription-status:' || new.id::text || ':' || new.status::text || ':' || coalesce(new.updated_at, now())::text,
      jsonb_build_object(
        'subscription_id', new.id,
        'plan_name', coalesce(plan_record.name, 'Your plan'),
        'status', new.status,
        'deep_link', link_path
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists subscriptions_notification_events
on public.subscriptions;

create trigger subscriptions_notification_events
after insert or update of status
on public.subscriptions
for each row
execute function public.publish_subscription_notification_events();

create or replace function public.admin_approve_company(
  p_company_id uuid
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  old_company public.companies;
  updated_company public.companies;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select *
  into old_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception 'Company not found.';
  end if;

  if old_company.status <> 'pending' then
    raise exception 'Only pending companies can be approved.';
  end if;

  update public.companies
  set
    status = 'approved',
    rejection_reason = null,
    verified_at = now(),
    updated_at = now()
  where id = p_company_id
  returning *
  into updated_company;

  perform public.audit_admin_action(
    'company',
    updated_company.id::text,
    'approve_company',
    to_jsonb(old_company),
    to_jsonb(updated_company)
  );

  perform public.try_publish_domain_notification_event(
    'company_verification_update',
    'company',
    updated_company.id,
    auth.uid(),
    'company-verification:' || updated_company.id::text || ':approved:' || updated_company.updated_at::text,
    jsonb_build_object(
      'company_name', updated_company.name,
      'status', updated_company.status,
      'deep_link', '/employer/settings'
    )
  );

  return updated_company;
end;
$$;

create or replace function public.admin_reject_company(
  p_company_id uuid,
  p_rejection_reason text
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_reason text := trim(coalesce(p_rejection_reason, ''));
  old_company public.companies;
  updated_company public.companies;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if clean_reason = '' then
    raise exception 'A rejection reason is required.';
  end if;

  select *
  into old_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception 'Company not found.';
  end if;

  if old_company.status <> 'pending' then
    raise exception 'Only pending companies can be rejected.';
  end if;

  update public.companies
  set
    status = 'rejected',
    rejection_reason = clean_reason,
    verified_at = null,
    updated_at = now()
  where id = p_company_id
  returning *
  into updated_company;

  perform public.audit_admin_action(
    'company',
    updated_company.id::text,
    'reject_company',
    to_jsonb(old_company),
    to_jsonb(updated_company)
  );

  perform public.try_publish_domain_notification_event(
    'company_verification_update',
    'company',
    updated_company.id,
    auth.uid(),
    'company-verification:' || updated_company.id::text || ':rejected:' || updated_company.updated_at::text,
    jsonb_build_object(
      'company_name', updated_company.name,
      'status', updated_company.status,
      'reason', clean_reason,
      'deep_link', '/employer/settings'
    )
  );

  return updated_company;
end;
$$;

create or replace function public.admin_return_company_to_pending(
  p_company_id uuid
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  old_company public.companies;
  updated_company public.companies;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select *
  into old_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception 'Company not found.';
  end if;

  if old_company.status not in ('approved', 'rejected') then
    raise exception 'The company could not be returned to pending review.';
  end if;

  update public.companies
  set
    status = 'pending',
    rejection_reason = null,
    verified_at = null,
    updated_at = now()
  where id = p_company_id
  returning *
  into updated_company;

  perform public.audit_admin_action(
    'company',
    updated_company.id::text,
    'return_company_to_pending',
    to_jsonb(old_company),
    to_jsonb(updated_company)
  );

  perform public.try_publish_domain_notification_event(
    'company_verification_update',
    'company',
    updated_company.id,
    auth.uid(),
    'company-verification:' || updated_company.id::text || ':pending:' || updated_company.updated_at::text,
    jsonb_build_object(
      'company_name', updated_company.name,
      'status', updated_company.status,
      'deep_link', '/employer/settings'
    )
  );

  return updated_company;
end;
$$;

create or replace function public.admin_approve_internship(
  p_internship_id uuid
)
returns public.internships
language plpgsql
security definer
set search_path = public
as $$
declare
  old_internship public.internships;
  updated_internship public.internships;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select *
  into old_internship
  from public.internships
  where id = p_internship_id
  for update;

  if not found then
    raise exception 'Internship not found.';
  end if;

  if old_internship.status <> 'pending' then
    raise exception 'Only pending internships can be approved.';
  end if;

  update public.internships
  set
    status = 'approved',
    rejection_reason = null,
    published_at = now(),
    updated_at = now()
  where id = p_internship_id
  returning *
  into updated_internship;

  perform public.audit_admin_action(
    'internship',
    updated_internship.id::text,
    'approve_internship',
    to_jsonb(old_internship),
    to_jsonb(updated_internship)
  );

  perform public.try_publish_domain_notification_event(
    'internship_approved',
    'internship',
    updated_internship.id,
    auth.uid(),
    'internship-moderation:' || updated_internship.id::text || ':approved:' || updated_internship.updated_at::text,
    jsonb_build_object(
      'internship_title', updated_internship.title,
      'deep_link', '/employer/listings'
    )
  );

  return updated_internship;
end;
$$;

create or replace function public.admin_reject_internship(
  p_internship_id uuid,
  p_rejection_reason text
)
returns public.internships
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_reason text := trim(coalesce(p_rejection_reason, ''));
  old_internship public.internships;
  updated_internship public.internships;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if clean_reason = '' then
    raise exception 'A rejection reason is required.';
  end if;

  select *
  into old_internship
  from public.internships
  where id = p_internship_id
  for update;

  if not found then
    raise exception 'Internship not found.';
  end if;

  if old_internship.status <> 'pending' then
    raise exception 'Only pending internships can be rejected.';
  end if;

  update public.internships
  set
    status = 'rejected',
    rejection_reason = clean_reason,
    published_at = null,
    updated_at = now()
  where id = p_internship_id
  returning *
  into updated_internship;

  perform public.audit_admin_action(
    'internship',
    updated_internship.id::text,
    'reject_internship',
    to_jsonb(old_internship),
    to_jsonb(updated_internship)
  );

  perform public.try_publish_domain_notification_event(
    'internship_rejected',
    'internship',
    updated_internship.id,
    auth.uid(),
    'internship-moderation:' || updated_internship.id::text || ':rejected:' || updated_internship.updated_at::text,
    jsonb_build_object(
      'internship_title', updated_internship.title,
      'reason', clean_reason,
      'deep_link', '/employer/listings'
    )
  );

  return updated_internship;
end;
$$;

create or replace function public.admin_update_student_account_status(
  p_student_id uuid,
  p_account_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  old_profile public.profiles;
  updated_profile public.profiles;
  event_key text;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if p_account_status is null
    or p_account_status not in ('active', 'suspended')
  then
    raise exception 'Invalid account status.';
  end if;

  select *
  into old_profile
  from public.profiles
  where id = p_student_id
    and role = 'student'
  for update;

  if not found then
    raise exception 'Student not found or access denied.';
  end if;

  update public.profiles
  set
    account_status = p_account_status,
    updated_at = now()
  where id = p_student_id
    and role = 'student'
  returning *
  into updated_profile;

  perform public.audit_admin_action(
    'profile',
    updated_profile.id::text,
    case
      when p_account_status = 'suspended'
        then 'suspend_student'
      else 'reactivate_student'
    end,
    to_jsonb(old_profile),
    to_jsonb(updated_profile)
  );

  event_key :=
    case
      when p_account_status = 'suspended'
        then 'account_suspended'
      else 'account_restored'
    end;

  perform public.try_publish_domain_notification_event(
    event_key,
    'profile',
    updated_profile.id,
    auth.uid(),
    'student-account-status:' || updated_profile.id::text || ':' || updated_profile.account_status::text || ':' || updated_profile.updated_at::text,
    jsonb_build_object(
      'status', updated_profile.account_status,
      'deep_link', '/student/notifications'
    )
  );

  return updated_profile;
end;
$$;

revoke all on function public.try_publish_domain_notification_event(text, text, uuid, uuid, text, jsonb) from public;
revoke all on function public.notification_application_payload(uuid, jsonb) from public;
revoke all on function public.publish_application_notification_events() from public;
revoke all on function public.publish_support_ticket_notification_events() from public;
revoke all on function public.publish_payment_order_notification_events() from public;
revoke all on function public.publish_subscription_notification_events() from public;

-- Notification recipient resolution and policy layer.
-- Depends on 202606260001_create_notification_event_engine.sql.

create table if not exists public.notification_event_catalog (
  event_key text primary key,
  category text not null check (
    category in (
      'application',
      'interview',
      'payment',
      'subscription',
      'support',
      'moderation',
      'security',
      'system',
      'employer',
      'student'
    )
  ),
  default_priority text not null default 'normal' check (
    default_priority in (
      'low',
      'normal',
      'high',
      'critical'
    )
  ),
  default_channels text[] not null default array['in_app']::text[],
  critical boolean not null default false,
  preference_controlled boolean not null default true,
  quiet_hours_allowed boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_notification_catalog_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notification_event_catalog_set_updated_at
on public.notification_event_catalog;

create trigger notification_event_catalog_set_updated_at
before update on public.notification_event_catalog
for each row
execute function public.set_notification_catalog_updated_at();

create unique index if not exists notification_delivery_jobs_notification_channel_uidx
on public.notification_delivery_jobs(notification_id, channel)
where notification_id is not null;

with catalog_seed (
  event_key,
  category,
  default_priority,
  default_channels,
  critical,
  preference_controlled,
  quiet_hours_allowed,
  description
) as (
  values
    ('application_submitted', 'application', 'normal', array['in_app', 'email']::text[], false, true, true, 'Student submitted an application.'),
    ('application_received', 'application', 'normal', array['in_app', 'email']::text[], false, true, true, 'Employer received a new application.'),
    ('application_viewed', 'application', 'low', array['in_app']::text[], false, true, true, 'Employer viewed an application.'),
    ('application_under_review', 'application', 'normal', array['in_app', 'email']::text[], false, true, true, 'Application moved to under review.'),
    ('application_shortlisted', 'application', 'high', array['in_app', 'email', 'web_push']::text[], false, true, true, 'Application was shortlisted.'),
    ('application_rejected', 'application', 'normal', array['in_app', 'email']::text[], false, true, true, 'Application was rejected.'),
    ('application_selected', 'application', 'high', array['in_app', 'email', 'web_push']::text[], false, true, true, 'Application was selected.'),
    ('application_withdrawn', 'application', 'normal', array['in_app', 'email']::text[], false, true, true, 'Application was withdrawn.'),
    ('interview_scheduled', 'interview', 'high', array['in_app', 'email', 'web_push']::text[], false, true, true, 'Interview was scheduled.'),
    ('interview_rescheduled', 'interview', 'high', array['in_app', 'email', 'web_push']::text[], false, true, true, 'Interview was rescheduled.'),
    ('interview_cancelled', 'interview', 'high', array['in_app', 'email', 'web_push']::text[], false, true, true, 'Interview was cancelled.'),
    ('interview_reminder', 'interview', 'high', array['in_app', 'email', 'web_push']::text[], false, true, false, 'Interview reminder.'),
    ('payment_success', 'payment', 'high', array['in_app', 'email']::text[], false, true, false, 'Payment succeeded.'),
    ('payment_failed', 'payment', 'critical', array['in_app', 'email', 'web_push']::text[], true, false, false, 'Payment failed.'),
    ('refund_processed', 'payment', 'high', array['in_app', 'email']::text[], false, true, false, 'Refund processed.'),
    ('subscription_activated', 'subscription', 'high', array['in_app', 'email']::text[], false, true, false, 'Subscription activated.'),
    ('subscription_update', 'subscription', 'normal', array['in_app', 'email']::text[], false, true, true, 'Subscription updated.'),
    ('subscription_expiring', 'subscription', 'high', array['in_app', 'email', 'web_push']::text[], false, true, true, 'Subscription expiring.'),
    ('subscription_expired', 'subscription', 'high', array['in_app', 'email']::text[], false, true, false, 'Subscription expired.'),
    ('plan_limit_warning', 'subscription', 'normal', array['in_app', 'email']::text[], false, true, true, 'Plan limit warning.'),
    ('plan_limit_reached', 'subscription', 'high', array['in_app', 'email']::text[], false, true, false, 'Plan limit reached.'),
    ('support_ticket_created', 'support', 'normal', array['in_app', 'email']::text[], false, true, true, 'Support ticket created.'),
    ('support_ticket_updated', 'support', 'normal', array['in_app', 'email']::text[], false, true, true, 'Support ticket updated.'),
    ('support_ticket_escalated', 'support', 'high', array['in_app', 'email']::text[], false, true, false, 'Support ticket escalated.'),
    ('company_review_required', 'moderation', 'normal', array['in_app']::text[], false, true, true, 'Company requires review.'),
    ('company_verification_update', 'moderation', 'normal', array['in_app', 'email']::text[], false, true, true, 'Company verification updated.'),
    ('internship_submitted', 'moderation', 'normal', array['in_app']::text[], false, true, true, 'Internship submitted for review.'),
    ('internship_review_required', 'moderation', 'normal', array['in_app']::text[], false, true, true, 'Internship requires review.'),
    ('internship_approved', 'moderation', 'normal', array['in_app', 'email']::text[], false, true, true, 'Internship approved.'),
    ('internship_rejected', 'moderation', 'normal', array['in_app', 'email']::text[], false, true, true, 'Internship rejected.'),
    ('account_security_alert', 'security', 'critical', array['in_app', 'email', 'web_push']::text[], true, false, false, 'Account security alert.'),
    ('account_suspended', 'security', 'critical', array['in_app', 'email']::text[], true, false, false, 'Account suspended.'),
    ('account_restored', 'security', 'high', array['in_app', 'email']::text[], false, false, false, 'Account restored.'),
    ('notification_delivery_failure', 'system', 'critical', array['in_app']::text[], true, false, false, 'Notification delivery failure.'),
    ('failed_webhook', 'system', 'critical', array['in_app']::text[], true, false, false, 'Webhook processing failed.'),
    ('edge_function_failure', 'system', 'critical', array['in_app']::text[], true, false, false, 'Edge Function failure.')
)
insert into public.notification_event_catalog (
  event_key,
  category,
  default_priority,
  default_channels,
  critical,
  preference_controlled,
  quiet_hours_allowed,
  description
)
select
  event_key,
  category,
  default_priority,
  default_channels,
  critical,
  preference_controlled,
  quiet_hours_allowed,
  description
from catalog_seed
on conflict (event_key) do update
set
  category = excluded.category,
  default_priority = excluded.default_priority,
  default_channels = excluded.default_channels,
  critical = excluded.critical,
  preference_controlled = excluded.preference_controlled,
  quiet_hours_allowed = excluded.quiet_hours_allowed,
  description = excluded.description;

with template_seed (
  template_key,
  event_key,
  title_template,
  body_template,
  cta_label
) as (
  values
    ('application_submitted_in_app_v1', 'application_submitted', 'Application submitted', 'Your application for {{internship_title}} was submitted successfully.', 'View application'),
    ('application_received_in_app_v1', 'application_received', 'New application received', '{{student_name}} applied for {{internship_title}}.', 'Review applicant'),
    ('application_under_review_in_app_v1', 'application_under_review', 'Application under review', 'Your application for {{internship_title}} is now under review.', 'View application'),
    ('application_shortlisted_in_app_v1', 'application_shortlisted', 'Application shortlisted', 'You were shortlisted for {{internship_title}}.', 'View details'),
    ('application_rejected_in_app_v1', 'application_rejected', 'Application update', 'Your application for {{internship_title}} was not selected this time.', 'View application'),
    ('application_selected_in_app_v1', 'application_selected', 'Application selected', 'You were selected for {{internship_title}}.', 'View application'),
    ('application_withdrawn_in_app_v1', 'application_withdrawn', 'Application withdrawn', '{{student_name}} withdrew from {{internship_title}}.', 'View applicants'),
    ('interview_scheduled_in_app_v1', 'interview_scheduled', 'Interview scheduled', 'Your interview for {{internship_title}} is scheduled for {{interview_time}}.', 'View interview'),
    ('interview_cancelled_in_app_v1', 'interview_cancelled', 'Interview cancelled', 'Your interview for {{internship_title}} was cancelled.', 'View application'),
    ('payment_success_in_app_v1', 'payment_success', 'Payment successful', 'Your payment for {{plan_name}} was verified.', 'View billing'),
    ('payment_failed_in_app_v1', 'payment_failed', 'Payment failed', 'Your payment for {{plan_name}} could not be completed.', 'Review payment'),
    ('subscription_activated_in_app_v1', 'subscription_activated', 'Subscription activated', '{{plan_name}} is now active.', 'View billing'),
    ('refund_processed_in_app_v1', 'refund_processed', 'Refund processed', 'A refund was processed for {{plan_name}}.', 'View billing'),
    ('support_ticket_created_in_app_v1', 'support_ticket_created', 'Support ticket created', 'We received your support request: {{subject}}.', 'View support'),
    ('support_ticket_updated_in_app_v1', 'support_ticket_updated', 'Support ticket updated', 'Your support ticket was updated.', 'View support'),
    ('company_verification_update_in_app_v1', 'company_verification_update', 'Company verification update', '{{company_name}} verification status changed to {{status}}.', 'View company'),
    ('internship_approved_in_app_v1', 'internship_approved', 'Internship approved', '{{internship_title}} is approved and visible to students.', 'View listings'),
    ('internship_rejected_in_app_v1', 'internship_rejected', 'Internship changes requested', '{{internship_title}} needs changes before approval.', 'View listings'),
    ('account_security_alert_in_app_v1', 'account_security_alert', 'Security alert', 'A security-sensitive account event occurred.', 'Review account')
)
insert into public.notification_templates (
  template_key,
  event_key,
  channel,
  locale,
  version,
  title_template,
  body_template,
  cta_label
)
select
  template_key,
  event_key,
  'in_app',
  'en-IN',
  1,
  title_template,
  body_template,
  cta_label
from template_seed
on conflict (template_key, channel, locale, version) do update
set
  event_key = excluded.event_key,
  title_template = excluded.title_template,
  body_template = excluded.body_template,
  cta_label = excluded.cta_label,
  is_active = true;

create or replace function public.get_active_admin_user_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(p.id order by p.created_at), '{}'::uuid[])
  from public.profiles p
  where p.role::text = 'admin'
    and coalesce(p.account_status::text, 'active') = 'active';
$$;

create or replace function public.get_notification_event_policy(
  p_event_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  catalog_record public.notification_event_catalog;
begin
  select *
  into catalog_record
  from public.notification_event_catalog
  where event_key = p_event_key;

  if catalog_record.event_key is null then
    raise exception 'NOTIFICATION_EVENT_INVALID';
  end if;

  return jsonb_build_object(
    'event_key', catalog_record.event_key,
    'category', catalog_record.category,
    'priority', catalog_record.default_priority,
    'channels', catalog_record.default_channels,
    'critical', catalog_record.critical,
    'preference_controlled', catalog_record.preference_controlled,
    'quiet_hours_allowed', catalog_record.quiet_hours_allowed
  );
end;
$$;

create or replace function public.render_notification_template(
  p_event_key text,
  p_channel text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  template_record public.notification_templates;
  rendered_title text;
  rendered_body text;
  rendered_subject text;
  rendered_cta_label text;
  variable_record record;
begin
  select *
  into template_record
  from public.notification_templates
  where event_key = p_event_key
    and channel = p_channel
    and locale = 'en-IN'
    and is_active
  order by version desc
  limit 1;

  if template_record.id is null then
    rendered_title := initcap(replace(p_event_key, '_', ' '));
    rendered_body := 'You have a new InternNext update.';
    rendered_subject := rendered_title;
    rendered_cta_label := null;
  else
    rendered_title := coalesce(template_record.title_template, template_record.subject_template, initcap(replace(p_event_key, '_', ' ')));
    rendered_body := template_record.body_template;
    rendered_subject := template_record.subject_template;
    rendered_cta_label := template_record.cta_label;
  end if;

  for variable_record in
    select key, value
    from jsonb_each_text(coalesce(p_payload, '{}'::jsonb))
  loop
    rendered_title := replace(rendered_title, '{{' || variable_record.key || '}}', left(variable_record.value, 500));
    rendered_body := replace(rendered_body, '{{' || variable_record.key || '}}', left(variable_record.value, 1000));

    if rendered_subject is not null then
      rendered_subject := replace(rendered_subject, '{{' || variable_record.key || '}}', left(variable_record.value, 500));
    end if;

    if rendered_cta_label is not null then
      rendered_cta_label := replace(rendered_cta_label, '{{' || variable_record.key || '}}', left(variable_record.value, 120));
    end if;
  end loop;

  return jsonb_build_object(
    'title', rendered_title,
    'body', rendered_body,
    'subject', rendered_subject,
    'cta_label', rendered_cta_label
  );
end;
$$;

create or replace function public.resolve_notification_recipients(
  p_event_key text,
  p_aggregate_type text default null,
  p_aggregate_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  recipients uuid[] := '{}'::uuid[];
  application_record record;
  internship_record record;
  company_record record;
  support_record record;
  payment_record record;
  subscription_record record;
begin
  if p_aggregate_type = 'application' and p_aggregate_id is not null then
    select
      a.id,
      a.student_id,
      i.employer_id,
      i.title as internship_title
    into application_record
    from public.applications a
    join public.internships i
      on i.id = a.internship_id
    where a.id = p_aggregate_id;

    if p_event_key in (
      'application_submitted',
      'application_under_review',
      'application_shortlisted',
      'application_rejected',
      'application_selected',
      'interview_scheduled',
      'interview_rescheduled',
      'interview_cancelled',
      'interview_reminder'
    ) then
      recipients := recipients || application_record.student_id;
    end if;

    if p_event_key in (
      'application_received',
      'application_withdrawn'
    ) then
      recipients := recipients || application_record.employer_id;
    end if;
  end if;

  if p_aggregate_type = 'internship' and p_aggregate_id is not null then
    select id, employer_id, title, status
    into internship_record
    from public.internships
    where id = p_aggregate_id;

    if p_event_key in (
      'internship_approved',
      'internship_rejected',
      'internship_changes_requested',
      'internship_expiring',
      'internship_expired'
    ) then
      recipients := recipients || internship_record.employer_id;
    end if;

    if p_event_key in (
      'internship_submitted',
      'internship_review_required'
    ) then
      recipients := recipients || public.get_active_admin_user_ids();
    end if;
  end if;

  if p_aggregate_type = 'company' and p_aggregate_id is not null then
    select id, owner_id, name, status
    into company_record
    from public.companies
    where id = p_aggregate_id;

    if p_event_key = 'company_verification_update' then
      recipients := recipients || company_record.owner_id;
    end if;

    if p_event_key = 'company_review_required' then
      recipients := recipients || public.get_active_admin_user_ids();
    end if;
  end if;

  if p_aggregate_type = 'support_ticket' and p_aggregate_id is not null then
    select id, requester_user_id, status
    into support_record
    from public.support_tickets
    where id = p_aggregate_id;

    if p_event_key in (
      'support_ticket_created',
      'support_ticket_updated'
    ) then
      recipients := recipients || support_record.requester_user_id;
    end if;

    if p_event_key in (
      'support_ticket_created',
      'support_ticket_escalated'
    ) then
      recipients := recipients || public.get_active_admin_user_ids();
    end if;
  end if;

  if p_aggregate_type = 'payment_order' and p_aggregate_id is not null then
    select id, user_id, plan_name, status
    into payment_record
    from public.payment_orders
    where id = p_aggregate_id;

    if p_event_key in (
      'payment_success',
      'payment_failed',
      'refund_processed'
    ) then
      recipients := recipients || payment_record.user_id;
    end if;

    if p_event_key in (
      'payment_failed',
      'payment_review_required',
      'refund_review_required'
    ) then
      recipients := recipients || public.get_active_admin_user_ids();
    end if;
  end if;

  if p_aggregate_type = 'subscription' and p_aggregate_id is not null then
    select id, user_id, status
    into subscription_record
    from public.subscriptions
    where id = p_aggregate_id;

    recipients := recipients || subscription_record.user_id;
  end if;

  if p_event_key in (
    'notification_delivery_failure',
    'failed_webhook',
    'edge_function_failure'
  ) then
    recipients := recipients || public.get_active_admin_user_ids();
  end if;

  if p_aggregate_type = 'profile' and p_aggregate_id is not null then
    if p_event_key in (
      'account_security_alert',
      'account_suspended',
      'account_restored'
    ) then
      recipients := recipients || p_aggregate_id;
    end if;
  end if;

  return coalesce(
    (
      select array_agg(distinct recipient_id)
      from unnest(recipients) as resolved(recipient_id)
      where recipient_id is not null
    ),
    '{}'::uuid[]
  );
end;
$$;

create or replace function public.publish_domain_notification_event(
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
declare
  policy jsonb;
  recipients uuid[];
  rendered jsonb;
  publish_result jsonb;
  event_id_value uuid;
  notification_record record;
begin
  policy := public.get_notification_event_policy(p_event_key);
  recipients := public.resolve_notification_recipients(
    p_event_key,
    p_aggregate_type,
    p_aggregate_id,
    p_payload
  );

  if coalesce(array_length(recipients, 1), 0) = 0 then
    return jsonb_build_object(
      'event_key',
      p_event_key,
      'created_notifications',
      0,
      'reason',
      'NOTIFICATION_RECIPIENT_NOT_FOUND'
    );
  end if;

  rendered := public.render_notification_template(
    p_event_key,
    'in_app',
    p_payload
  );

  publish_result := public.publish_notification_event(
    p_event_key,
    recipients,
    rendered ->> 'title',
    rendered ->> 'body',
    p_payload ->> 'deep_link',
    policy ->> 'category',
    policy ->> 'priority',
    p_aggregate_type,
    p_aggregate_id,
    p_actor_user_id,
    p_idempotency_key,
    p_payload
  );

  event_id_value := (publish_result ->> 'event_id')::uuid;

  for notification_record in
    select id, recipient_user_id
    from public.notifications
    where event_id = event_id_value
  loop
    insert into public.notification_delivery_jobs (
      notification_id,
      recipient_user_id,
      channel,
      provider,
      status,
      delivered_at,
      metadata
    )
    values (
      notification_record.id,
      notification_record.recipient_user_id,
      'in_app',
      'internal',
      'delivered',
      now(),
      jsonb_build_object(
        'event_key',
        p_event_key,
        'policy',
        policy
      )
    )
    on conflict do nothing;
  end loop;

  return publish_result || jsonb_build_object(
    'recipients',
    recipients,
    'policy',
    policy
  );
end;
$$;

alter table public.notification_event_catalog enable row level security;

drop policy if exists notification_event_catalog_admin_select
on public.notification_event_catalog;

create policy notification_event_catalog_admin_select
on public.notification_event_catalog
for select
to authenticated
using (public.current_user_is_admin());

revoke all on public.notification_event_catalog from anon;
revoke all on public.notification_event_catalog from authenticated;
grant select on public.notification_event_catalog to authenticated;

revoke all on function public.get_active_admin_user_ids() from public;
revoke all on function public.get_notification_event_policy(text) from public;
revoke all on function public.render_notification_template(text, text, jsonb) from public;
revoke all on function public.resolve_notification_recipients(text, text, uuid, jsonb) from public;
revoke all on function public.publish_domain_notification_event(text, text, uuid, uuid, text, jsonb) from public;

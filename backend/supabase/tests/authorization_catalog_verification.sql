-- Read-only catalog verification. Safe to run in staging or production.

do $$
declare
  missing_rls text[];
  missing_policies text[];
  missing_buckets text[];
begin
  select array_agg(required.table_name order by required.table_name)
  into missing_rls
  from (
    values
      ('profiles'),
      ('student_profiles'),
      ('employer_profiles'),
      ('companies'),
      ('internships'),
      ('applications'),
      ('saved_internships'),
      ('notifications'),
      ('platform_settings'),
      ('admin_audit_logs'),
      ('employer_access_invites'),
      ('support_tickets'),
      ('payment_orders'),
      ('payment_webhook_events'),
      ('subscription_plans'),
      ('plan_entitlements'),
      ('subscriptions'),
      ('entitlement_usage'),
      ('subscription_events'),
      ('entitlement_overrides'),
      ('notification_events'),
      ('notification_event_catalog'),
      ('notification_templates'),
      ('notification_preferences'),
      ('notification_category_preferences'),
      ('notification_user_settings'),
      ('push_subscriptions'),
      ('notification_delivery_jobs'),
      ('notification_delivery_attempts'),
      ('notification_provider_settings'),
      ('notification_worker_runs'),
      ('notification_retention_settings'),
      ('notification_digest_state'),
      ('operational_event_retention_settings')
  ) as required(table_name)
  left join pg_catalog.pg_namespace n
    on n.nspname = 'public'
  left join pg_catalog.pg_class c
    on c.relnamespace = n.oid
    and c.relname = required.table_name
  where c.oid is null
    or c.relrowsecurity is not true;

  if missing_rls is not null then
    raise exception
      'Missing table or RLS disabled: %',
      array_to_string(missing_rls, ', ');
  end if;

  select array_agg(
    required.table_name || ':' || required.command
    order by required.table_name, required.command
  )
  into missing_policies
  from (
    values
      ('profiles', 'SELECT'),
      ('student_profiles', 'UPDATE'),
      ('employer_profiles', 'UPDATE'),
      ('companies', 'UPDATE'),
      ('internships', 'UPDATE'),
      ('applications', 'SELECT'),
      ('applications', 'INSERT'),
      ('applications', 'UPDATE'),
      ('applications', 'DELETE'),
      ('saved_internships', 'SELECT'),
      ('saved_internships', 'INSERT'),
      ('saved_internships', 'DELETE'),
      ('notifications', 'SELECT'),
      ('notifications', 'UPDATE'),
      ('notifications', 'DELETE'),
      ('payment_orders', 'SELECT'),
      ('payment_webhook_events', 'SELECT'),
      ('subscriptions', 'SELECT'),
      ('entitlement_usage', 'SELECT'),
      ('operational_event_retention_settings', 'SELECT'),
      ('operational_event_retention_settings', 'UPDATE')
  ) as required(table_name, command)
  left join pg_catalog.pg_policies p
    on p.schemaname = 'public'
    and p.tablename = required.table_name
    and p.cmd = required.command
  where p.tablename is null;

  if missing_policies is not null then
    raise exception
      'Missing required policies: %',
      array_to_string(missing_policies, ', ');
  end if;

  select array_agg(required.bucket_id order by required.bucket_id)
  into missing_buckets
  from (
    values
      ('student-avatars'),
      ('student-resumes'),
      ('company-assets')
  ) as required(bucket_id)
  left join storage.buckets b
    on b.id = required.bucket_id
  where b.id is null;

  if missing_buckets is not null then
    raise exception
      'Missing Storage buckets: %',
      array_to_string(missing_buckets, ', ');
  end if;

  if has_column_privilege(
    'authenticated',
    'public.applications',
    'employer_notes',
    'select'
  ) then
    raise exception
      'authenticated must not have direct SELECT access to applications.employer_notes';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.payment_orders',
    'insert,update,delete'
  ) then
    raise exception
      'authenticated has a forbidden payment_orders write privilege';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.subscriptions',
    'insert,update,delete'
  ) then
    raise exception
      'authenticated has a forbidden subscriptions write privilege';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.operational_event_retention_settings',
    'select,insert,update,delete'
  ) then
    raise exception
      'authenticated must use secured operational retention RPCs';
  end if;

  if has_function_privilege(
    'anon',
    'public.get_platform_health_probe()',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.get_platform_health_probe()',
    'execute'
  ) then
    raise exception
      'platform health database probe must be service-role only';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.cleanup_operational_event_retention(boolean)',
    'execute'
  ) then
    raise exception
      'authenticated must not execute the unguarded retention cleanup function';
  end if;

  raise notice
    'Authorization catalog verification passed.';
end;
$$;

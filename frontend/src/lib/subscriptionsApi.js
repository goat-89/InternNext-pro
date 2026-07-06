import { supabase } from './supabase'

function normalizeSubscriptionPayload(
  payload
) {
  return {
    subscription:
      payload?.subscription ?? null,
    entitlements:
      payload?.entitlements ?? {},
  }
}

export async function getSubscriptionPlans({
  roleScope,
} = {}) {
  let query = supabase
    .from('subscription_plans')
    .select(`
      id,
      plan_key,
      name,
      description,
      role_scope,
      amount,
      currency,
      billing_period,
      duration_days,
      is_active,
      is_public,
      sort_order,
      metadata,
      plan_entitlements (
        feature_key,
        enabled,
        limit_value,
        reset_period
      )
    `)
    .eq('is_active', true)
    .eq('is_public', true)

  if (roleScope) {
    query = query.eq(
      'role_scope',
      roleScope
    )
  }

  query = query.order('sort_order', {
    ascending: true,
  })

  const { data, error } =
    await query

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getMySubscriptionOverview() {
  const { data, error } =
    await supabase.rpc(
      'get_my_subscription_overview'
    )

  if (error) {
    throw error
  }

  return normalizeSubscriptionPayload(
    data
  )
}

export async function getEmployerEntitlementStatus() {
  const { data, error } =
    await supabase.rpc(
      'get_employer_internship_limit_status'
    )

  if (error) {
    throw error
  }

  return {
    employerId:
      data?.employer_id ?? null,
    detectedRole:
      data?.detected_role ?? null,
    activeCount: Number(
      data?.active_count ?? 0
    ),
    maximumActive:
      data?.maximum_active === null
        ? null
        : Number(
            data?.maximum_active ?? 0
          ),
    remaining:
      data?.remaining === null
        ? null
        : Number(
            data?.remaining ?? 0
          ),
    limitReached: Boolean(
      data?.limit_reached
    ),
    monthlyPostsUsed: Number(
      data?.monthly_posts_used ?? 0
    ),
    monthlyPostsLimit:
      data?.monthly_posts_limit === null
        ? null
        : Number(
            data?.monthly_posts_limit ??
              0
          ),
    monthlyPostsRemaining:
      data?.monthly_posts_remaining ===
      null
        ? null
        : Number(
            data?.monthly_posts_remaining ??
              0
          ),
    monthlyPostsLimitReached:
      Boolean(
        data?.monthly_posts_limit_reached
      ),
    subscription:
      data?.subscription ?? null,
    entitlements:
      data?.entitlements ?? {},
  }
}

export async function checkEmployerEntitlement(
  featureKey,
  requestedAmount = 1
) {
  const { data, error } =
    await supabase.rpc(
      'check_employer_entitlement',
      {
        feature_key: featureKey,
        requested_amount:
          requestedAmount,
      }
    )

  if (error) {
    throw error
  }

  return data
}

export async function getAdminSubscriptions({
  status = 'all',
  limit = 200,
} = {}) {
  let query = supabase
    .from('subscriptions')
    .select(`
      id,
      user_id,
      status,
      current_period_start,
      current_period_end,
      grace_until,
      cancelled_at,
      expired_at,
      created_at,
      updated_at,
      subscription_plans (
        plan_key,
        name,
        role_scope,
        amount,
        currency,
        billing_period
      )
    `)
    .order('created_at', {
      ascending: false,
    })
    .limit(limit)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } =
    await query

  if (error) {
    throw error
  }

  return data ?? []
}

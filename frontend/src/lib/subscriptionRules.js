export function normalizeEntitlement(
  entitlement
) {
  return {
    enabled: Boolean(
      entitlement?.enabled
    ),
    limit:
      entitlement?.limit === null ||
      entitlement?.limit === undefined
        ? null
        : Number(entitlement.limit),
    resetPeriod:
      entitlement?.reset_period ||
      entitlement?.resetPeriod ||
      'none',
    override: Boolean(
      entitlement?.override
    ),
  }
}

export function canUseEntitlement(
  entitlement,
  used = 0
) {
  const normalized =
    normalizeEntitlement(
      entitlement
    )

  if (!normalized.enabled) {
    return false
  }

  if (normalized.limit === null) {
    return true
  }

  return Number(used || 0) <
    normalized.limit
}

export function getEntitlementRemaining(
  entitlement,
  used = 0
) {
  const normalized =
    normalizeEntitlement(
      entitlement
    )

  if (!normalized.enabled) {
    return 0
  }

  if (normalized.limit === null) {
    return null
  }

  return Math.max(
    normalized.limit -
      Number(used || 0),
    0
  )
}

export function getSubscriptionStatusLabel(
  status
) {
  const labels = {
    active: 'Active',
    trialing: 'Trial',
    grace_period: 'Grace period',
    past_due: 'Past due',
    cancelled: 'Cancelled',
    expired: 'Expired',
    refunded: 'Refunded',
    suspended: 'Suspended',
    free: 'Free',
  }

  return (
    labels[status] ||
    'Not active'
  )
}

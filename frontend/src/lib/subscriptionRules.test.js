import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  canUseEntitlement,
  getEntitlementRemaining,
  getSubscriptionStatusLabel,
  normalizeEntitlement,
} from './subscriptionRules'

describe('subscription rule helpers', () => {
  it('normalizes entitlement fields', () => {
    expect(
      normalizeEntitlement({
        enabled: true,
        limit: '10',
        reset_period: 'monthly',
      })
    ).toEqual({
      enabled: true,
      limit: 10,
      resetPeriod: 'monthly',
      override: false,
    })
  })

  it('allows unlimited enabled entitlements', () => {
    expect(
      canUseEntitlement({
        enabled: true,
        limit: null,
      })
    ).toBe(true)

    expect(
      getEntitlementRemaining({
        enabled: true,
        limit: null,
      })
    ).toBeNull()
  })

  it('blocks disabled or exhausted entitlements', () => {
    expect(
      canUseEntitlement({
        enabled: false,
        limit: 10,
      })
    ).toBe(false)

    expect(
      canUseEntitlement(
        {
          enabled: true,
          limit: 2,
        },
        2
      )
    ).toBe(false)
  })

  it('calculates remaining usage', () => {
    expect(
      getEntitlementRemaining(
        {
          enabled: true,
          limit: 5,
        },
        2
      )
    ).toBe(3)
  })

  it('labels subscription statuses', () => {
    expect(
      getSubscriptionStatusLabel(
        'active'
      )
    ).toBe('Active')

    expect(
      getSubscriptionStatusLabel(
        'unknown'
      )
    ).toBe('Not active')
  })
})

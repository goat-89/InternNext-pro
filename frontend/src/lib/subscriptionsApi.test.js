import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
const from = vi.hoisted(() => vi.fn())
const select = vi.hoisted(() => vi.fn())
const eq = vi.hoisted(() => vi.fn())
const order = vi.hoisted(() => vi.fn())
const limit = vi.hoisted(() => vi.fn())

vi.mock('./supabase', () => ({
  supabase: {
    rpc,
    from,
  },
}))

import {
  checkEmployerEntitlement,
  getAdminSubscriptions,
  getEmployerEntitlementStatus,
  getMySubscriptionOverview,
  getSubscriptionPlans,
} from './subscriptionsApi'

describe('subscription API helpers', () => {
  beforeEach(() => {
    rpc.mockReset()
    from.mockReset()
    select.mockReset()
    eq.mockReset()
    order.mockReset()
    limit.mockReset()

    from.mockReturnValue({
      select,
    })
    select.mockReturnValue({
      eq,
      order,
    })
    eq.mockReturnValue({
      eq,
      order,
    })
    order.mockReturnValue({
      limit,
      then(resolve) {
        return Promise.resolve(
          resolve({
            data: [],
            error: null,
          })
        )
      },
    })
    limit.mockReturnValue({
      eq,
      then(resolve) {
        return Promise.resolve(
          resolve({
            data: [],
            error: null,
          })
        )
      },
    })
  })

  it('loads public plans for a role', async () => {
    await expect(
      getSubscriptionPlans({
        roleScope: 'employer',
      })
    ).resolves.toEqual([])

    expect(from).toHaveBeenCalledWith(
      'subscription_plans'
    )
    expect(eq).toHaveBeenCalledWith(
      'role_scope',
      'employer'
    )
  })

  it('loads the current subscription overview through RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        subscription: {
          status: 'active',
        },
        entitlements: {},
      },
      error: null,
    })

    await expect(
      getMySubscriptionOverview()
    ).resolves.toEqual({
      subscription: {
        status: 'active',
      },
      entitlements: {},
    })

    expect(rpc).toHaveBeenCalledWith(
      'get_my_subscription_overview'
    )
  })

  it('normalizes employer entitlement status', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        active_count: 2,
        maximum_active: 10,
        remaining: 8,
        limit_reached: false,
        monthly_posts_used: 1,
        monthly_posts_limit: 5,
        monthly_posts_remaining: 4,
        monthly_posts_limit_reached: false,
        subscription: {
          plan_key:
            'employer_growth',
        },
        entitlements: {},
      },
      error: null,
    })

    await expect(
      getEmployerEntitlementStatus()
    ).resolves.toMatchObject({
      activeCount: 2,
      maximumActive: 10,
      monthlyPostsRemaining: 4,
      limitReached: false,
    })
  })

  it('checks a single employer entitlement through RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        allowed: true,
      },
      error: null,
    })

    await expect(
      checkEmployerEntitlement(
        'analytics'
      )
    ).resolves.toEqual({
      allowed: true,
    })

    expect(rpc).toHaveBeenCalledWith(
      'check_employer_entitlement',
      {
        feature_key: 'analytics',
        requested_amount: 1,
      }
    )
  })

  it('filters admin subscriptions by status', async () => {
    await expect(
      getAdminSubscriptions({
        status: 'active',
        limit: 50,
      })
    ).resolves.toEqual([])

    expect(limit).toHaveBeenCalledWith(50)
    expect(eq).toHaveBeenCalledWith(
      'status',
      'active'
    )
  })
})

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const invoke = vi.hoisted(() => vi.fn())
const order = vi.hoisted(() => vi.fn())
const limit = vi.hoisted(() => vi.fn())
const eq = vi.hoisted(() => vi.fn())
const select = vi.hoisted(() => vi.fn())
const from = vi.hoisted(() => vi.fn())

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke,
    },
    from,
  },
}))

import {
  createRazorpayOrder,
  formatPaymentAmount,
  getAdminPaymentOrders,
  getMyPaymentOrders,
  verifyRazorpayPayment,
} from './paymentsApi'

describe('payment API helpers', () => {
  beforeEach(() => {
    invoke.mockReset()
    order.mockReset()
    limit.mockReset()
    eq.mockReset()
    select.mockReset()
    from.mockReset()

    from.mockReturnValue({
      select,
    })
    select.mockReturnValue({
      order,
    })
    order.mockReturnValue({
      limit,
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
    eq.mockReturnValue({
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

  it('formats payment amounts from paise', () => {
    expect(
      formatPaymentAmount(149900, 'INR')
    ).toBe('₹1,499')

    expect(
      formatPaymentAmount(0, 'INR')
    ).toBe('₹0')

    expect(
      formatPaymentAmount(null, 'INR')
    ).toBe('₹0')
  })

  it('creates Razorpay orders through the edge function', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        id: 'order-1',
      },
      error: null,
    })

    await expect(
      createRazorpayOrder({
        plan_key: 'student_career_pro',
      })
    ).resolves.toEqual({
      id: 'order-1',
    })

    expect(invoke).toHaveBeenCalledWith(
      'razorpay-create-order',
      {
        body: {
          plan_key: 'student_career_pro',
        },
      }
    )
  })

  it('verifies Razorpay payments through the edge function', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        verified: true,
      },
      error: null,
    })

    await expect(
      verifyRazorpayPayment({
        razorpay_payment_id: 'pay_123',
      })
    ).resolves.toEqual({
      verified: true,
    })

    expect(invoke).toHaveBeenCalledWith(
      'razorpay-verify-payment',
      {
        body: {
          razorpay_payment_id: 'pay_123',
        },
      }
    )
  })

  it('loads current user payment orders in newest-first order', async () => {
    order.mockReturnValueOnce({
      then(resolve) {
        return Promise.resolve(
          resolve({
            data: [
              {
                id: 'payment-1',
              },
            ],
            error: null,
          })
        )
      },
    })

    await expect(
      getMyPaymentOrders()
    ).resolves.toEqual([
      {
        id: 'payment-1',
      },
    ])

    expect(from).toHaveBeenCalledWith(
      'payment_orders'
    )
    expect(order).toHaveBeenCalledWith(
      'created_at',
      {
        ascending: false,
      }
    )
  })

  it('filters admin payment orders by status when requested', async () => {
    await expect(
      getAdminPaymentOrders({
        status: 'paid',
        limit: 50,
      })
    ).resolves.toEqual([])

    expect(limit).toHaveBeenCalledWith(50)
    expect(eq).toHaveBeenCalledWith(
      'status',
      'paid'
    )
  })

  it('does not add a status filter for all admin payment orders', async () => {
    await expect(
      getAdminPaymentOrders({
        status: 'all',
      })
    ).resolves.toEqual([])

    expect(limit).toHaveBeenCalledWith(200)
    expect(eq).not.toHaveBeenCalled()
  })
})

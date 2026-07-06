import { supabase } from './supabase'

export async function createRazorpayOrder(
  payload
) {
  const { data, error } =
    await supabase.functions.invoke(
      'razorpay-create-order',
      {
        body: payload,
      }
    )

  if (error) {
    throw error
  }

  return data
}

export async function verifyRazorpayPayment(
  payload
) {
  const { data, error } =
    await supabase.functions.invoke(
      'razorpay-verify-payment',
      {
        body: payload,
      }
    )

  if (error) {
    throw error
  }

  return data
}

export async function getMyPaymentOrders() {
  const { data, error } =
    await supabase
      .from('payment_orders')
      .select(`
        id,
        plan_key,
        plan_name,
        role_scope,
        amount,
        currency,
        receipt,
        razorpay_order_id,
        razorpay_payment_id,
        status,
        failure_reason,
        created_at,
        updated_at,
        paid_at
      `)
      .order('created_at', {
        ascending: false,
      })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getAdminPaymentOrders({
  status = 'all',
  limit = 200,
} = {}) {
  let query = supabase
    .from('payment_orders')
    .select(`
      id,
      user_id,
      plan_key,
      plan_name,
      role_scope,
      amount,
      currency,
      receipt,
      razorpay_order_id,
      razorpay_payment_id,
      status,
      failure_reason,
      billing_name,
      billing_email,
      billing_phone,
      billing_gst_number,
      created_at,
      updated_at,
      paid_at
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

export function formatPaymentAmount(
  amount,
  currency = 'INR'
) {
  const majorAmount =
    Number(amount || 0) / 100

  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }
  ).format(majorAmount)
}

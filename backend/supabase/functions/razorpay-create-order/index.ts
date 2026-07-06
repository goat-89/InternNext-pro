import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import {
  errorResponse,
  jsonResponse,
  readJsonBody,
  resolvePaymentCors,
} from '../_shared/paymentHttp.ts'

function cleanText(value: unknown) {
  return String(value ?? '').trim()
}

function logFailure(
  requestId: string,
  code: string
) {
  console.error(
    JSON.stringify({
      event: 'razorpay_create_order_failed',
      request_id: requestId,
      code,
    })
  )
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID()
  const cors = resolvePaymentCors(
    request,
    Deno.env.get(
      'PAYMENT_ALLOWED_ORIGINS'
    )
  )

  if (!cors.allowed) {
    return errorResponse(
      'ORIGIN_NOT_ALLOWED',
      'Request origin is not allowed.',
      403,
      cors.headers,
      requestId
    )
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors.headers,
        'X-Request-Id': requestId,
      },
    })
  }

  if (request.method !== 'POST') {
    return errorResponse(
      'METHOD_NOT_ALLOWED',
      'Method not allowed.',
      405,
      cors.headers,
      requestId
    )
  }

  try {
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')
    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      )
    const razorpayKeyId =
      Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret =
      Deno.env.get(
        'RAZORPAY_KEY_SECRET'
      )

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !razorpayKeyId ||
      !razorpayKeySecret
    ) {
      logFailure(
        requestId,
        'PAYMENT_NOT_CONFIGURED'
      )

      return errorResponse(
        'PAYMENT_NOT_CONFIGURED',
        'Payment service is unavailable.',
        503,
        cors.headers,
        requestId
      )
    }

    const authHeader =
      request.headers.get(
        'Authorization'
      ) || ''
    const jwt = authHeader.replace(
      /^Bearer\s+/i,
      ''
    )

    if (!jwt) {
      return errorResponse(
        'AUTH_REQUIRED',
        'Authentication is required.',
        401,
        cors.headers,
        requestId
      )
    }

    const bodyResult =
      await readJsonBody(request)

    if (!bodyResult.ok) {
      const tooLarge =
        bodyResult.code ===
        'PAYLOAD_TOO_LARGE'

      return errorResponse(
        bodyResult.code,
        tooLarge
          ? 'Request body is too large.'
          : 'Request body must be valid JSON.',
        tooLarge ? 413 : 400,
        cors.headers,
        requestId
      )
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    const {
      data: userResult,
      error: userError,
    } = await supabase.auth.getUser(jwt)

    if (userError || !userResult?.user) {
      return errorResponse(
        'AUTH_REQUIRED',
        'Authentication is required.',
        401,
        cors.headers,
        requestId
      )
    }

    const payload =
      bodyResult.value as Record<
        string,
        unknown
      >
    const planKey = cleanText(
      payload?.plan_key
    )

    if (!planKey) {
      return errorResponse(
        'PLAN_NOT_AVAILABLE',
        'The selected plan is unavailable.',
        400,
        cors.headers,
        requestId
      )
    }

    const {
      data: plan,
      error: planError,
    } = await supabase
      .from('subscription_plans')
      .select(
        'id, plan_key, name, role_scope, amount, currency, is_active, is_public'
      )
      .eq('plan_key', planKey)
      .eq('is_active', true)
      .maybeSingle()

    if (
      planError ||
      !plan ||
      !plan.is_public
    ) {
      return errorResponse(
        'PLAN_NOT_AVAILABLE',
        'The selected plan is unavailable.',
        400,
        cors.headers,
        requestId
      )
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(
        'id, role, account_status, email, full_name, phone'
      )
      .eq('id', userResult.user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return errorResponse(
        'ACCOUNT_NOT_ELIGIBLE',
        'This account cannot start checkout.',
        403,
        cors.headers,
        requestId
      )
    }

    if (
      profile.account_status !== 'active'
    ) {
      return errorResponse(
        'ACCOUNT_NOT_ELIGIBLE',
        'This account cannot start checkout.',
        403,
        cors.headers,
        requestId
      )
    }

    if (profile.role !== plan.role_scope) {
      return errorResponse(
        'PLAN_ROLE_MISMATCH',
        'This plan is not available for your account.',
        403,
        cors.headers,
        requestId
      )
    }

    const billing =
      payload?.billing &&
      typeof payload.billing === 'object'
        ? (payload.billing as Record<
            string,
            unknown
          >)
        : {}

    const {
      data: orderRow,
      error: orderError,
    } = await supabase
      .from('payment_orders')
      .insert({
        user_id: userResult.user.id,
        plan_id: plan.id,
        plan_key: planKey,
        plan_name: plan.name,
        role_scope: plan.role_scope,
        amount: plan.amount,
        currency: plan.currency || 'INR',
        receipt:
          'in_' +
          crypto.randomUUID()
            .replaceAll('-', '')
            .slice(0, 32),
        billing_name:
          cleanText(billing.full_name) ||
          profile.full_name,
        billing_email:
          cleanText(billing.email) ||
          profile.email,
        billing_phone:
          cleanText(billing.phone) ||
          profile.phone,
        billing_gst_number:
          cleanText(
            billing.gst_number
          ) || null,
        metadata: {
          source: 'checkout',
          subscription_plan_id: plan.id,
          request_id: requestId,
        },
      })
      .select('*')
      .single()

    if (orderError || !orderRow) {
      logFailure(
        requestId,
        'PAYMENT_ORDER_CREATE_FAILED'
      )

      return errorResponse(
        'PAYMENT_ORDER_CREATE_FAILED',
        'Unable to start payment.',
        500,
        cors.headers,
        requestId
      )
    }

    const authToken = btoa(
      razorpayKeyId +
        ':' +
        razorpayKeySecret
    )

    const razorpayResponse = await fetch(
      'https://api.razorpay.com/v1/orders',
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + authToken,
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          amount: orderRow.amount,
          currency: orderRow.currency,
          receipt: orderRow.receipt,
          notes: {
            payment_order_id:
              orderRow.id,
            user_id:
              userResult.user.id,
            plan_key: planKey,
            role_scope:
              plan.role_scope,
            subscription_plan_id:
              plan.id,
          },
        }),
      }
    )

    const razorpayOrder =
      await razorpayResponse
        .json()
        .catch(() => ({}))

    if (!razorpayResponse.ok) {
      const internalReason =
        cleanText(
          razorpayOrder?.error
            ?.description
        ).slice(0, 500) ||
        'Razorpay order creation failed.'

      await supabase
        .from('payment_orders')
        .update({
          status: 'failed',
          failure_reason: internalReason,
        })
        .eq('id', orderRow.id)

      logFailure(
        requestId,
        'PAYMENT_PROVIDER_UNAVAILABLE'
      )

      return errorResponse(
        'PAYMENT_PROVIDER_UNAVAILABLE',
        'Payment provider is temporarily unavailable.',
        502,
        cors.headers,
        requestId
      )
    }

    if (!cleanText(razorpayOrder?.id)) {
      logFailure(
        requestId,
        'PAYMENT_PROVIDER_INVALID_RESPONSE'
      )

      return errorResponse(
        'PAYMENT_PROVIDER_INVALID_RESPONSE',
        'Payment provider returned an invalid response.',
        502,
        cors.headers,
        requestId
      )
    }

    const {
      data: updatedOrder,
      error: updateError,
    } = await supabase
      .from('payment_orders')
      .update({
        status: 'created',
        razorpay_order_id:
          razorpayOrder.id,
      })
      .eq('id', orderRow.id)
      .select('*')
      .single()

    if (updateError || !updatedOrder) {
      logFailure(
        requestId,
        'PAYMENT_ORDER_UPDATE_FAILED'
      )

      return errorResponse(
        'PAYMENT_ORDER_UPDATE_FAILED',
        'Unable to finalize payment setup.',
        500,
        cors.headers,
        requestId
      )
    }

    return jsonResponse(
      {
        payment_order_id:
          updatedOrder.id,
        key_id: razorpayKeyId,
        razorpay_order_id:
          razorpayOrder.id,
        amount: orderRow.amount,
        currency: orderRow.currency,
        plan_name: orderRow.plan_name,
        billing: {
          name:
            orderRow.billing_name ||
            profile.full_name ||
            '',
          email:
            orderRow.billing_email ||
            profile.email ||
            '',
          contact:
            orderRow.billing_phone ||
            profile.phone ||
            '',
        },
      },
      {
        headers: cors.headers,
        requestId,
      }
    )
  } catch {
    logFailure(
      requestId,
      'PAYMENT_INTERNAL_ERROR'
    )

    return errorResponse(
      'PAYMENT_INTERNAL_ERROR',
      'Payment service is temporarily unavailable.',
      500,
      cors.headers,
      requestId
    )
  }
})

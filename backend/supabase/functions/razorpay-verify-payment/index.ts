import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import {
  errorResponse,
  jsonResponse,
  readJsonBody,
  resolvePaymentCors,
} from '../_shared/paymentHttp.ts'
import {
  hmacSha256Hex,
  safeEqual,
} from '../_shared/razorpaySignature.ts'

function cleanText(value: unknown) {
  return String(value ?? '').trim()
}

function logFailure(
  requestId: string,
  code: string
) {
  console.error(
    JSON.stringify({
      event:
        'razorpay_payment_verification_failed',
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
    const razorpayKeySecret =
      Deno.env.get(
        'RAZORPAY_KEY_SECRET'
      )

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
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
    const paymentOrderId = cleanText(
      payload?.payment_order_id
    )
    const razorpayPaymentId = cleanText(
      payload?.razorpay_payment_id
    )
    const razorpayOrderId = cleanText(
      payload?.razorpay_order_id
    )
    const razorpaySignature = cleanText(
      payload?.razorpay_signature
    )

    if (
      !paymentOrderId ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return errorResponse(
        'PAYMENT_DETAILS_INCOMPLETE',
        'Payment verification details are incomplete.',
        400,
        cors.headers,
        requestId
      )
    }

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', paymentOrderId)
      .eq(
        'user_id',
        userResult.user.id
      )
      .maybeSingle()

    if (orderError) {
      logFailure(
        requestId,
        'PAYMENT_ORDER_LOOKUP_FAILED'
      )

      return errorResponse(
        'PAYMENT_ORDER_LOOKUP_FAILED',
        'Unable to verify payment.',
        500,
        cors.headers,
        requestId
      )
    }

    if (!order) {
      return errorResponse(
        'PAYMENT_ORDER_NOT_FOUND',
        'Payment order was not found.',
        404,
        cors.headers,
        requestId
      )
    }

    if (
      order.razorpay_order_id !==
      razorpayOrderId
    ) {
      return errorResponse(
        'PAYMENT_ORDER_MISMATCH',
        'Payment details do not match.',
        400,
        cors.headers,
        requestId
      )
    }

    const expectedSignature =
      await hmacSha256Hex(
        order.razorpay_order_id +
          '|' +
          razorpayPaymentId,
        razorpayKeySecret
      )

    if (
      !safeEqual(
        expectedSignature,
        razorpaySignature
      )
    ) {
      await supabase
        .from('payment_orders')
        .update({
          status: 'failed',
          failure_reason:
            'Payment signature verification failed.',
        })
        .eq('id', order.id)

      return errorResponse(
        'PAYMENT_SIGNATURE_INVALID',
        'Payment verification failed.',
        400,
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
        status: 'paid',
        razorpay_payment_id:
          razorpayPaymentId,
        failure_reason: null,
        paid_at:
          order.paid_at ||
          new Date().toISOString(),
      })
      .eq('id', order.id)
      .select('*')
      .single()

    if (updateError || !updatedOrder) {
      logFailure(
        requestId,
        'PAYMENT_STATUS_UPDATE_FAILED'
      )

      return errorResponse(
        'PAYMENT_STATUS_UPDATE_FAILED',
        'Payment verification could not be completed.',
        500,
        cors.headers,
        requestId
      )
    }

    const {
      data: activation,
      error: activationError,
    } = await supabase.rpc(
      'activate_subscription_from_payment_order',
      {
        target_payment_order_id:
          order.id,
        provider_payment_id:
          razorpayPaymentId,
        activation_source:
          'checkout_verification',
      }
    )

    if (activationError) {
      logFailure(
        requestId,
        'SUBSCRIPTION_ACTIVATION_FAILED'
      )

      return errorResponse(
        'SUBSCRIPTION_ACTIVATION_FAILED',
        'Payment was verified, but plan activation is pending.',
        500,
        cors.headers,
        requestId
      )
    }

    return jsonResponse(
      {
        verified: true,
        order: updatedOrder,
        subscription: activation,
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

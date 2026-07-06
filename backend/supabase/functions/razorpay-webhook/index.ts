import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import {
  errorResponse,
  jsonResponse,
  readTextBody,
} from '../_shared/paymentHttp.ts'
import {
  hmacSha256Hex,
  safeEqual,
} from '../_shared/razorpaySignature.ts'

const webhookHeaders: Record<
  string,
  string
> = {}

function logFailure(
  requestId: string,
  code: string
) {
  console.error(
    JSON.stringify({
      event: 'razorpay_webhook_failed',
      request_id: requestId,
      code,
    })
  )
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID()

  if (request.method !== 'POST') {
    return errorResponse(
      'METHOD_NOT_ALLOWED',
      'Method not allowed.',
      405,
      webhookHeaders,
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
    const webhookSecret =
      Deno.env.get(
        'RAZORPAY_WEBHOOK_SECRET'
      )

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !webhookSecret
    ) {
      logFailure(
        requestId,
        'WEBHOOK_NOT_CONFIGURED'
      )

      return errorResponse(
        'WEBHOOK_NOT_CONFIGURED',
        'Webhook service is unavailable.',
        503,
        webhookHeaders,
        requestId
      )
    }

    const bodyResult =
      await readTextBody(
        request,
        1024 * 1024
      )

    if (!bodyResult.ok) {
      return errorResponse(
        bodyResult.code,
        'Webhook payload is too large.',
        413,
        webhookHeaders,
        requestId
      )
    }

    const receivedSignature =
      request.headers.get(
        'X-Razorpay-Signature'
      ) || ''
    const eventId =
      request.headers.get(
        'x-razorpay-event-id'
      ) || ''

    if (!receivedSignature || !eventId) {
      return errorResponse(
        'WEBHOOK_HEADERS_MISSING',
        'Required webhook headers are missing.',
        400,
        webhookHeaders,
        requestId
      )
    }

    const expectedSignature =
      await hmacSha256Hex(
        bodyResult.text,
        webhookSecret
      )

    if (
      !safeEqual(
        expectedSignature,
        receivedSignature
      )
    ) {
      return errorResponse(
        'WEBHOOK_SIGNATURE_INVALID',
        'Webhook signature is invalid.',
        400,
        webhookHeaders,
        requestId
      )
    }

    let payload: Record<string, any>

    try {
      payload = JSON.parse(
        bodyResult.text
      )
    } catch {
      return errorResponse(
        'INVALID_JSON',
        'Webhook payload must be valid JSON.',
        400,
        webhookHeaders,
        requestId
      )
    }

    const eventType = String(
      payload?.event || ''
    )

    if (!eventType) {
      return errorResponse(
        'WEBHOOK_EVENT_MISSING',
        'Webhook event type is missing.',
        400,
        webhookHeaders,
        requestId
      )
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    const {
      data: existingEvent,
      error: existingEventError,
    } = await supabase
      .from('payment_webhook_events')
      .select('id, processed_at')
      .eq('razorpay_event_id', eventId)
      .maybeSingle()

    if (existingEventError) {
      logFailure(
        requestId,
        'WEBHOOK_LOOKUP_FAILED'
      )

      return errorResponse(
        'WEBHOOK_PROCESSING_FAILED',
        'Webhook could not be processed.',
        500,
        webhookHeaders,
        requestId
      )
    }

    if (existingEvent) {
      return jsonResponse(
        {
          received: true,
          duplicate: true,
        },
        { requestId }
      )
    }

    const {
      data: eventRow,
      error: insertError,
    } = await supabase
      .from('payment_webhook_events')
      .insert({
        razorpay_event_id: eventId,
        event_type: eventType,
        payload,
        processing_status: 'processing',
      })
      .select('id')
      .single()

    if (
      insertError?.code === '23505'
    ) {
      return jsonResponse(
        {
          received: true,
          duplicate: true,
        },
        { requestId }
      )
    }

    if (insertError || !eventRow) {
      logFailure(
        requestId,
        'WEBHOOK_STORE_FAILED'
      )

      return errorResponse(
        'WEBHOOK_PROCESSING_FAILED',
        'Webhook could not be processed.',
        500,
        webhookHeaders,
        requestId
      )
    }

    const payment =
      payload?.payload?.payment?.entity
    const refund =
      payload?.payload?.refund?.entity
    const razorpayOrderId =
      payment?.order_id || ''
    const razorpayPaymentId =
      payment?.id ||
      refund?.payment_id ||
      ''

    let processingFailed = false
    let processingFailureReason:
      | string
      | null = null

    if (
      eventType === 'payment.captured' &&
      razorpayOrderId &&
      razorpayPaymentId
    ) {
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
            new Date().toISOString(),
        })
        .eq(
          'razorpay_order_id',
          razorpayOrderId
        )
        .neq('status', 'paid')
        .select('id')
        .maybeSingle()

      if (updateError) {
        processingFailed = true
        processingFailureReason =
          'Payment order update failed.'
      }

      const {
        data: existingPaidOrder,
        error: paidOrderError,
      } =
        updatedOrder || updateError
          ? {
              data: null,
              error: null,
            }
          : await supabase
              .from('payment_orders')
              .select('id')
              .eq(
                'razorpay_order_id',
                razorpayOrderId
              )
              .eq('status', 'paid')
              .maybeSingle()

      if (paidOrderError) {
        processingFailed = true
        processingFailureReason =
          'Payment order lookup failed.'
      }

      const paymentOrder =
        updatedOrder ||
        existingPaidOrder

      if (paymentOrder?.id) {
        const {
          data: activation,
          error: activationError,
        } = await supabase.rpc(
          'activate_subscription_from_payment_order',
          {
            target_payment_order_id:
              paymentOrder.id,
            provider_payment_id:
              razorpayPaymentId,
            activation_source:
              'razorpay_webhook',
          }
        )

        if (activationError) {
          processingFailed = true
          processingFailureReason =
            'Subscription activation failed.'
        }

        await supabase
          .from(
            'payment_webhook_events'
          )
          .update({
            affected_payment_order_id:
              paymentOrder.id,
            affected_subscription_id:
              activation
                ?.subscription_id ||
              null,
          })
          .eq('id', eventRow.id)
      }
    }

    if (
      eventType === 'payment.failed' &&
      razorpayOrderId
    ) {
      const {
        data: failedOrder,
        error: failedOrderError,
      } = await supabase
        .from('payment_orders')
        .update({
          status: 'failed',
          razorpay_payment_id:
            razorpayPaymentId || null,
          failure_reason:
            payment?.error_description ||
            'Payment failed.',
        })
        .eq(
          'razorpay_order_id',
          razorpayOrderId
        )
        .neq('status', 'paid')
        .select('id')
        .maybeSingle()

      if (failedOrderError) {
        processingFailed = true
        processingFailureReason =
          'Payment failure update failed.'
      }

      if (failedOrder?.id) {
        const { error: failureError } =
          await supabase.rpc(
            'record_subscription_payment_failure',
            {
              target_payment_order_id:
                failedOrder.id,
              failure_message:
                payment
                  ?.error_description ||
                'Payment failed.',
            }
          )

        if (failureError) {
          processingFailed = true
          processingFailureReason =
            'Subscription failure recording failed.'
        }

        await supabase
          .from(
            'payment_webhook_events'
          )
          .update({
            affected_payment_order_id:
              failedOrder.id,
          })
          .eq('id', eventRow.id)
      }
    }

    if (
      eventType === 'refund.processed' &&
      razorpayPaymentId
    ) {
      const {
        data: refundResult,
        error: refundError,
      } = await supabase.rpc(
        'record_subscription_refund',
        {
          target_razorpay_payment_id:
            razorpayPaymentId,
          refund_payload: payload,
        }
      )

      if (refundError) {
        processingFailed = true
        processingFailureReason =
          'Subscription refund recording failed.'
      }

      await supabase
        .from('payment_webhook_events')
        .update({
          affected_subscription_id:
            refundResult
              ?.subscription_id || null,
        })
        .eq('id', eventRow.id)
    }

    const { error: finalUpdateError } =
      await supabase
        .from(
          'payment_webhook_events'
        )
        .update({
          processing_status:
            processingFailed
              ? 'failed'
              : 'processed',
          failure_reason:
            processingFailureReason,
          processed_at:
            new Date().toISOString(),
        })
        .eq('id', eventRow.id)

    if (
      finalUpdateError ||
      processingFailed
    ) {
      logFailure(
        requestId,
        'WEBHOOK_PROCESSING_FAILED'
      )

      return errorResponse(
        'WEBHOOK_PROCESSING_FAILED',
        'Webhook processing will be reviewed.',
        500,
        webhookHeaders,
        requestId
      )
    }

    return jsonResponse(
      {
        received: true,
      },
      { requestId }
    )
  } catch {
    logFailure(
      requestId,
      'WEBHOOK_INTERNAL_ERROR'
    )

    return errorResponse(
      'WEBHOOK_INTERNAL_ERROR',
      'Webhook service is temporarily unavailable.',
      500,
      webhookHeaders,
      requestId
    )
  }
})

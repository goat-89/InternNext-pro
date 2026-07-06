import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type DeliveryJob = {
  id: string
  channel: string
  provider?: string | null
  recipient?: {
    email?: string | null
    full_name?: string | null
  } | null
  notification?: {
    title?: string | null
    body?: string | null
    deep_link?: string | null
  } | null
}

type ProviderSettings = {
  channel: string
  provider: string
  is_enabled: boolean
  from_email?: string | null
  from_name?: string | null
  reply_to_email?: string | null
}

type WorkerRunCounters = {
  claimed: number
  delivered: number
  failed: number
  retryScheduled: number
  workerErrors: number
  releasedStale: number
}

type DigestGenerationResult = {
  frequency: string
  provider_enabled?: boolean
  created: number
  skipped: number
  error?: string
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type':
          'application/json',
      },
    }
  )
}

function clampLimit(value: unknown) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 25
  }

  return Math.min(
    Math.max(Math.trunc(parsed), 1),
    100
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildAbsoluteUrl(path?: string | null) {
  if (!path || !path.startsWith('/')) {
    return null
  }

  const baseUrl =
    Deno.env.get('PUBLIC_SITE_URL') ||
    Deno.env.get('SITE_URL') ||
    Deno.env.get('APP_BASE_URL') ||
    ''

  if (!baseUrl) {
    return null
  }

  return new URL(path, baseUrl).toString()
}

function isAuthorized(req: Request) {
  const workerSecret =
    Deno.env.get(
      'NOTIFICATION_WORKER_SECRET'
    )

  if (!workerSecret) {
    return true
  }

  const authorization =
    req.headers.get('Authorization') ||
    ''
  const headerSecret =
    req.headers.get(
      'x-notification-worker-secret'
    ) || ''

  return (
    authorization ===
      `Bearer ${workerSecret}` ||
    headerSecret === workerSecret
  )
}

async function markDelivered(
  supabase: ReturnType<typeof createClient>,
  job: DeliveryJob,
  workerId: string,
  startedAt: number
) {
  return await supabase.rpc(
    'complete_notification_delivery_job',
    {
      p_job_id: job.id,
      p_worker_id: workerId,
      p_provider_message_id: null,
      p_response_code: 'OK',
      p_duration_ms:
        Date.now() - startedAt,
    }
  )
}

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  job: DeliveryJob,
  workerId: string,
  startedAt: number,
  errorCode: string,
  errorMessage: string,
  retryable: boolean
) {
  return await supabase.rpc(
    'fail_notification_delivery_job',
    {
      p_job_id: job.id,
      p_worker_id: workerId,
      p_error_code: errorCode,
      p_error_message: errorMessage,
      p_response_code: null,
      p_duration_ms:
        Date.now() - startedAt,
      p_retryable: retryable,
    }
  )
}

async function getProviderSetting(
  supabase: ReturnType<typeof createClient>,
  channel: string
) {
  const { data, error } =
    await supabase
      .from('notification_provider_settings')
      .select(
        'channel, provider, is_enabled, from_email, from_name, reply_to_email'
      )
      .eq('channel', channel)
      .maybeSingle()

  if (error) {
    throw error
  }

  return data as ProviderSettings | null
}

function buildEmailHtml(job: DeliveryJob) {
  const title =
    job.notification?.title ||
    'InternNext notification'
  const body =
    job.notification?.body ||
    'You have a new update.'
  const deepLink = buildAbsoluteUrl(
    job.notification?.deep_link
  )

  const action = deepLink
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(
        deepLink
      )}" style="background:#2563eb;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;font-weight:700">Open InternNext</a></p>`
    : ''

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:24px">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#2563eb">InternNext Pro</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escapeHtml(
          title
        )}</h1>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#334155">${escapeHtml(
          body
        )}</p>
        ${action}
      </div>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#64748b">
        You received this because you have an InternNext Pro account.
      </p>
    </div>
  </body>
</html>`
}

async function sendResendEmail(
  job: DeliveryJob,
  setting: ProviderSettings
) {
  const apiKey =
    Deno.env.get('RESEND_API_KEY')
  const recipientEmail =
    job.recipient?.email?.trim()
  const fromEmail =
    setting.from_email ||
    Deno.env.get(
      'NOTIFICATION_EMAIL_FROM'
    )
  const fromName =
    setting.from_name ||
    'InternNext Pro'

  if (!apiKey) {
    return {
      ok: false,
      retryable: false,
      code: 'EMAIL_API_KEY_MISSING',
      message:
        'RESEND_API_KEY is not configured.',
    }
  }

  if (!recipientEmail) {
    return {
      ok: false,
      retryable: false,
      code: 'EMAIL_RECIPIENT_MISSING',
      message:
        'Recipient email is missing.',
    }
  }

  if (!fromEmail) {
    return {
      ok: false,
      retryable: false,
      code: 'EMAIL_FROM_MISSING',
      message:
        'Notification from email is not configured.',
    }
  }

  const subject =
    job.notification?.title ||
    'InternNext notification'
  const text =
    job.notification?.body ||
    'You have a new update.'

  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent':
          'internnext-pro-notification-worker/1.0',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [recipientEmail],
        subject,
        text,
        html: buildEmailHtml(job),
      }),
    }
  )

  const responseBody =
    await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      ok: false,
      retryable:
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500,
      code: `RESEND_${response.status}`,
      message:
        responseBody?.message ||
        responseBody?.error ||
        'Resend email delivery failed.',
    }
  }

  return {
    ok: true,
    providerMessageId:
      responseBody?.id || null,
    responseCode: String(response.status),
  }
}

async function processJob(
  supabase: ReturnType<typeof createClient>,
  job: DeliveryJob,
  workerId: string
) {
  const startedAt = Date.now()

  if (job.channel === 'in_app') {
    const { error } =
      await markDelivered(
        supabase,
        job,
        workerId,
        startedAt
      )

    if (error) {
      throw error
    }

    return {
      id: job.id,
      status: 'delivered',
    }
  }

  if (job.channel === 'email') {
    const setting =
      await getProviderSetting(
        supabase,
        'email'
      )

    if (
      !setting?.is_enabled ||
      setting.provider.toLowerCase() !==
        'resend'
    ) {
      const { data, error } =
        await markFailed(
          supabase,
          job,
          workerId,
          startedAt,
          'EMAIL_PROVIDER_DISABLED',
          'Email provider is not enabled.',
          false
        )

      if (error) {
        throw error
      }

      return {
        id: job.id,
        status:
          data?.status || 'failed',
      }
    }

    const result =
      await sendResendEmail(
        job,
        setting
      )

    if (result.ok) {
      const { error } =
        await supabase.rpc(
          'complete_notification_delivery_job',
          {
            p_job_id: job.id,
            p_worker_id: workerId,
            p_provider_message_id:
              result.providerMessageId,
            p_response_code:
              result.responseCode,
            p_duration_ms:
              Date.now() - startedAt,
          }
        )

      if (error) {
        throw error
      }

      return {
        id: job.id,
        status: 'delivered',
      }
    }

    const { data, error } =
      await markFailed(
        supabase,
        job,
        workerId,
        startedAt,
        result.code,
        result.message,
        result.retryable
      )

    if (error) {
      throw error
    }

    return {
      id: job.id,
      status:
        data?.status || 'failed',
    }
  }

  const { data, error } =
    await markFailed(
      supabase,
      job,
      workerId,
      startedAt,
      'PROVIDER_NOT_CONFIGURED',
      `${job.channel} delivery is not configured.`,
      false
    )

  if (error) {
    throw error
  }

  return {
    id: job.id,
    status:
      data?.status || 'failed',
  }
}

function summarizeResults(
  results: Array<Record<string, unknown>>,
  claimed: number,
  releasedStale: number
): WorkerRunCounters {
  return results.reduce(
    (summary, result) => {
      if (result.status === 'delivered') {
        summary.delivered += 1
      } else if (result.status === 'retry_scheduled') {
        summary.retryScheduled += 1
      } else if (result.status === 'worker_error') {
        summary.workerErrors += 1
      } else if (result.status === 'failed') {
        summary.failed += 1
      }

      return summary
    },
    {
      claimed,
      delivered: 0,
      failed: 0,
      retryScheduled: 0,
      workerErrors: 0,
      releasedStale,
    }
  )
}

async function createDigestJobs(
  supabase: ReturnType<typeof createClient>,
  frequency: 'daily' | 'weekly'
): Promise<DigestGenerationResult> {
  const { data, error } =
    await supabase.rpc(
      'create_notification_digest_jobs',
      {
        p_frequency: frequency,
      }
    )

  if (error) {
    return {
      frequency,
      created: 0,
      skipped: 0,
      error: error.message,
    }
  }

  return {
    frequency:
      String(data?.frequency || frequency),
    provider_enabled:
      data?.provider_enabled,
    created: Number(data?.created || 0),
    skipped: Number(data?.skipped || 0),
  }
}

async function finishWorkerRun(
  supabase: ReturnType<typeof createClient>,
  runId: string | null,
  status: 'completed' | 'failed',
  counters: WorkerRunCounters,
  errorMessage: string | null,
  results: Array<Record<string, unknown>>,
  digests: Record<
    string,
    DigestGenerationResult
  > = {}
) {
  if (!runId) {
    return
  }

  await supabase.rpc(
    'finish_notification_worker_run',
    {
      p_run_id: runId,
      p_status: status,
      p_claimed_count: counters.claimed,
      p_delivered_count: counters.delivered,
      p_failed_count: counters.failed,
      p_retry_scheduled_count:
        counters.retryScheduled,
      p_worker_error_count:
        counters.workerErrors,
      p_released_stale_count:
        counters.releasedStale,
      p_error_message: errorMessage,
      p_metadata: {
        result_sample: results.slice(0, 20),
        digests,
      },
    }
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed.' },
      405
    )
  }

  if (!isAuthorized(req)) {
    return jsonResponse(
      { error: 'Unauthorized.' },
      401
    )
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL')
  const serviceRoleKey =
    Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY'
    )

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        error:
          'Notification worker is not configured.',
      },
      500
    )
  }

  let requestBody:
    | Record<string, unknown>
    | null = null

  try {
    requestBody = await req.json()
  } catch (_error) {
    requestBody = null
  }

  const limit = clampLimit(
    requestBody?.limit
  )
  const workerId =
    typeof requestBody?.worker_id ===
      'string' &&
    requestBody.worker_id.trim()
      ? requestBody.worker_id.trim()
      : `edge-${crypto.randomUUID()}`

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey
  )

  let runId: string | null = null

  const { data: startedRunId } =
    await supabase.rpc(
      'start_notification_worker_run',
      {
        p_worker_id: workerId,
        p_requested_limit: limit,
      }
    )

  if (typeof startedRunId === 'string') {
    runId = startedRunId
  }

  const digestResults = {
    daily: await createDigestJobs(
      supabase,
      'daily'
    ),
    weekly: await createDigestJobs(
      supabase,
      'weekly'
    ),
  }

  const { data: releasedStaleData } =
    await supabase.rpc(
    'release_stale_notification_delivery_jobs'
  )
  const releasedStale = Number(
    releasedStaleData || 0
  )

  const { data, error } =
    await supabase.rpc(
      'claim_notification_delivery_jobs',
      {
        p_worker_id: workerId,
        p_limit: limit,
      }
    )

  if (error) {
    await finishWorkerRun(
      supabase,
      runId,
      'failed',
      {
        claimed: 0,
        delivered: 0,
        failed: 0,
        retryScheduled: 0,
        workerErrors: 0,
        releasedStale,
      },
      error.message,
      [],
      digestResults
    )

    return jsonResponse(
      {
        error: error.message,
        digests: digestResults,
      },
      500
    )
  }

  const jobs = Array.isArray(data)
    ? (data as DeliveryJob[])
    : []

  const results = []

  for (const job of jobs) {
    try {
      results.push(
        await processJob(
          supabase,
          job,
          workerId
        )
      )
    } catch (jobError) {
      results.push({
        id: job.id,
        status: 'worker_error',
        error:
          jobError instanceof Error
            ? jobError.message
            : 'Unknown worker error.',
      })
    }
  }

  const counters = summarizeResults(
    results,
    jobs.length,
    releasedStale
  )

  await finishWorkerRun(
    supabase,
    runId,
    counters.workerErrors > 0
      ? 'failed'
      : 'completed',
    counters,
    counters.workerErrors > 0
      ? 'One or more jobs failed inside the worker loop.'
      : null,
    results,
    digestResults
  )

  return jsonResponse({
    worker_id: workerId,
    digests: digestResults,
    claimed: jobs.length,
    released_stale: releasedStale,
    delivered: counters.delivered,
    failed: counters.failed,
    retry_scheduled:
      counters.retryScheduled,
    worker_errors:
      counters.workerErrors,
    results,
  })
})

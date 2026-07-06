import { supabase } from './supabase'

const VALID_STATUSES = new Set([
  '',
  'pending',
  'processing',
  'delivered',
  'retry_scheduled',
  'failed',
  'cancelled',
  'skipped',
  'suppressed',
])

const VALID_CHANNELS = new Set([
  '',
  'in_app',
  'email',
  'web_push',
  'sms',
  'whatsapp',
])

const VALID_DIGEST_FREQUENCIES = new Set([
  'daily',
  'weekly',
])

function normalizePage(value) {
  const parsed = Number.parseInt(
    value,
    10
  )

  return Number.isFinite(parsed)
    ? Math.max(parsed, 1)
    : 1
}

function normalizePageSize(value) {
  const parsed = Number.parseInt(
    value,
    10
  )

  if (!Number.isFinite(parsed)) {
    return 25
  }

  return Math.min(
    Math.max(parsed, 1),
    100
  )
}

function normalizeFilter(value, validSet) {
  const clean = String(value || '')
    .trim()
    .toLowerCase()

  if (!validSet.has(clean)) {
    return ''
  }

  return clean
}

export function normalizeDeliveryOverview(
  value
) {
  return {
    generated_at:
      value?.generated_at || null,
    status_counts: Array.isArray(
      value?.status_counts
    )
      ? value.status_counts
      : [],
    channel_counts: Array.isArray(
      value?.channel_counts
    )
      ? value.channel_counts
      : [],
    recent_failures: Array.isArray(
      value?.recent_failures
    )
      ? value.recent_failures
      : [],
    recent_worker_runs: Array.isArray(
      value?.recent_worker_runs
    )
      ? value.recent_worker_runs
      : [],
    stale_processing_count:
      Number(
        value?.stale_processing_count ||
          0
      ),
  }
}

export function normalizeDeliveryJobsPage(
  value,
  fallback = {}
) {
  const page = normalizePage(
    value?.page || fallback.page
  )
  const pageSize = normalizePageSize(
    value?.page_size ||
      fallback.pageSize
  )
  const total = Number(
    value?.total || 0
  )

  return {
    jobs: Array.isArray(value?.jobs)
      ? value.jobs
      : [],
    total,
    page,
    pageSize,
    totalPages: Math.max(
      Number(
        value?.total_pages || 1
      ),
      1
    ),
  }
}

export function normalizeDigestResult(
  value,
  fallbackFrequency = 'daily'
) {
  return {
    frequency:
      value?.frequency || fallbackFrequency,
    provider_enabled:
      Boolean(value?.provider_enabled),
    created: Number(value?.created || 0),
    skipped: Number(value?.skipped || 0),
  }
}

export async function getAdminNotificationDeliveryOverview() {
  const { data, error } =
    await supabase.rpc(
      'get_admin_notification_delivery_overview'
    )

  if (error) {
    throw error
  }

  return normalizeDeliveryOverview(
    data
  )
}

export async function getAdminNotificationDeliveryJobs({
  status = '',
  channel = '',
  page = 1,
  pageSize = 25,
} = {}) {
  const safeStatus =
    normalizeFilter(
      status,
      VALID_STATUSES
    )
  const safeChannel =
    normalizeFilter(
      channel,
      VALID_CHANNELS
    )
  const safePage =
    normalizePage(page)
  const safePageSize =
    normalizePageSize(pageSize)

  const { data, error } =
    await supabase.rpc(
      'get_admin_notification_delivery_jobs',
      {
        p_status:
          safeStatus || null,
        p_channel:
          safeChannel || null,
        p_page: safePage,
        p_page_size:
          safePageSize,
      }
    )

  if (error) {
    throw error
  }

  return normalizeDeliveryJobsPage(
    data,
    {
      page: safePage,
      pageSize: safePageSize,
    }
  )
}

export async function getAdminNotificationDeliveryAttempts(
  jobId
) {
  if (!jobId) {
    throw new Error(
      'Delivery job ID is required.'
    )
  }

  const { data, error } =
    await supabase.rpc(
      'get_admin_notification_delivery_attempts',
      {
        p_job_id: jobId,
      }
    )

  if (error) {
    throw error
  }

  return Array.isArray(data)
    ? data
    : []
}

export async function releaseStaleNotificationDeliveryJobs() {
  const { data, error } =
    await supabase.rpc(
      'admin_release_stale_notification_delivery_jobs'
    )

  if (error) {
    throw error
  }

  return Number(data || 0)
}

export async function createAdminNotificationDigestJobs(
  frequency = 'daily'
) {
  const cleanFrequency = String(
    frequency || 'daily'
  )
    .trim()
    .toLowerCase()
  const safeFrequency =
    VALID_DIGEST_FREQUENCIES.has(
      cleanFrequency
    )
      ? cleanFrequency
      : 'daily'

  const { data, error } =
    await supabase.rpc(
      'admin_create_notification_digest_jobs',
      {
        p_frequency: safeFrequency,
      }
    )

  if (error) {
    throw error
  }

  return normalizeDigestResult(
    data,
    safeFrequency
  )
}

export async function getAdminNotificationWorkerRuns(
  limit = 20
) {
  const safeLimit = Math.min(
    Math.max(
      Number.parseInt(limit, 10) || 20,
      1
    ),
    100
  )

  const { data, error } =
    await supabase.rpc(
      'get_admin_notification_worker_runs',
      {
        p_limit: safeLimit,
      }
    )

  if (error) {
    throw error
  }

  return Array.isArray(data)
    ? data
    : []
}

import { supabase } from './supabase'

const validStatuses = new Set([
  '',
  'open',
  'resolved',
  'ignored',
])

const validSources = new Set([
  '',
  'frontend',
  'edge_function',
  'database',
  'authentication',
  'storage',
  'payment',
  'notification',
])

const DEFAULT_RETENTION_SETTINGS = {
  enabled: true,
  resolved_event_days: 90,
  ignored_event_days: 30,
  open_noncritical_event_days: 90,
  updated_at: null,
}

function ensureObject(value) {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value
  }

  return {}
}

function clampInteger(
  value,
  fallback,
  minimum,
  maximum
) {
  const parsed = Number.parseInt(
    value,
    10
  )

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(
    Math.max(parsed, minimum),
    maximum
  )
}

function normalizeFilter(
  value,
  allowedValues
) {
  const clean = String(value || '')
    .trim()
    .toLowerCase()

  return allowedValues.has(clean)
    ? clean
    : ''
}

export function normalizeHealthOverview(
  value
) {
  return {
    generated_at:
      value?.generated_at || null,
    open_operational_events: Number(
      value?.open_operational_events || 0
    ),
    critical_operational_events: Number(
      value?.critical_operational_events ||
        0
    ),
    failed_payments_24h: Number(
      value?.failed_payments_24h || 0
    ),
    failed_webhooks_24h: Number(
      value?.failed_webhooks_24h || 0
    ),
    failed_delivery_jobs: Number(
      value?.failed_delivery_jobs || 0
    ),
    stale_delivery_jobs: Number(
      value?.stale_delivery_jobs || 0
    ),
    last_worker_success_at:
      value?.last_worker_success_at ||
      null,
    last_worker_failure_at:
      value?.last_worker_failure_at ||
      null,
    recent_events: Array.isArray(
      value?.recent_events
    )
      ? value.recent_events
      : [],
  }
}

export function normalizeOperationalRetentionSettings(
  value
) {
  const source = ensureObject(value)

  return {
    enabled:
      source.enabled !== false,
    resolved_event_days:
      clampInteger(
        source.resolved_event_days,
        90,
        7,
        730
      ),
    ignored_event_days:
      clampInteger(
        source.ignored_event_days,
        30,
        7,
        365
      ),
    open_noncritical_event_days:
      clampInteger(
        source.open_noncritical_event_days,
        90,
        30,
        730
      ),
    updated_at:
      source.updated_at || null,
  }
}

export function validateOperationalRetentionSettingsPatch(
  value
) {
  const source = {
    ...DEFAULT_RETENTION_SETTINGS,
    ...ensureObject(value),
  }

  return {
    enabled: source.enabled === true,
    resolved_event_days:
      clampInteger(
        source.resolved_event_days,
        90,
        7,
        730
      ),
    ignored_event_days:
      clampInteger(
        source.ignored_event_days,
        30,
        7,
        365
      ),
    open_noncritical_event_days:
      clampInteger(
        source.open_noncritical_event_days,
        90,
        30,
        730
      ),
  }
}

export function normalizeOperationalCleanupResult(
  value
) {
  const source = ensureObject(value)

  return {
    dry_run:
      source.dry_run !== false,
    enabled:
      source.enabled !== false,
    resolved_events: Number(
      source.resolved_events || 0
    ),
    ignored_events: Number(
      source.ignored_events || 0
    ),
    open_noncritical_events: Number(
      source.open_noncritical_events ||
        0
    ),
    total_events: Number(
      source.total_events || 0
    ),
  }
}

export async function getAdminSystemHealthOverview() {
  const { data, error } =
    await supabase.rpc(
      'get_admin_system_health_overview'
    )

  if (error) {
    throw error
  }

  return normalizeHealthOverview(data)
}

export async function getAdminOperationalEvents({
  status = '',
  source = '',
  limit = 100,
} = {}) {
  const safeStatus = normalizeFilter(
    status,
    validStatuses
  )
  const safeSource = normalizeFilter(
    source,
    validSources
  )
  const safeLimit = Math.min(
    Math.max(
      Number.parseInt(limit, 10) || 100,
      1
    ),
    200
  )

  const { data, error } =
    await supabase.rpc(
      'get_admin_operational_events',
      {
        p_status:
          safeStatus || null,
        p_source:
          safeSource || null,
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

export async function updateAdminOperationalEventStatus(
  eventId,
  status
) {
  if (!eventId) {
    throw new Error(
      'Operational event ID is required.'
    )
  }

  const safeStatus = normalizeFilter(
    status,
    validStatuses
  )

  if (!safeStatus) {
    throw new Error(
      'Select a valid event status.'
    )
  }

  const { data, error } =
    await supabase.rpc(
      'update_admin_operational_event_status',
      {
        p_event_id: eventId,
        p_status: safeStatus,
      }
    )

  if (error) {
    throw error
  }

  return data
}

export async function getAdminOperationalRetentionSettings() {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_admin_operational_event_retention_settings'
  )

  if (error) {
    throw error
  }

  return normalizeOperationalRetentionSettings(
    data
  )
}

export async function updateAdminOperationalRetentionSettings(
  patch
) {
  const settingsPatch =
    validateOperationalRetentionSettingsPatch(
      patch
    )

  const {
    data,
    error,
  } = await supabase.rpc(
    'update_admin_operational_event_retention_settings',
    {
      p_settings_patch:
        settingsPatch,
    }
  )

  if (error) {
    throw error
  }

  return normalizeOperationalRetentionSettings(
    data
  )
}

export async function runOperationalRetentionCleanup({
  dryRun = true,
} = {}) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'admin_cleanup_operational_event_retention',
    {
      p_dry_run: dryRun !== false,
    }
  )

  if (error) {
    throw error
  }

  return normalizeOperationalCleanupResult(
    data
  )
}

import { supabase } from './supabase'

const DEFAULT_RETENTION_SETTINGS = {
  enabled: true,
  read_notification_days: 180,
  archived_notification_days: 30,
  expired_notification_grace_days: 7,
  delivery_job_days: 180,
  delivery_attempt_days: 180,
  worker_run_days: 90,
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

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(
    value,
    10
  )

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(
    Math.max(parsed, min),
    max
  )
}

export function normalizeRetentionSettings(
  value
) {
  const source = ensureObject(value)

  return {
    enabled:
      source.enabled !== false,
    read_notification_days:
      clampInteger(
        source.read_notification_days,
        180,
        30,
        1095
      ),
    archived_notification_days:
      clampInteger(
        source.archived_notification_days,
        30,
        7,
        365
      ),
    expired_notification_grace_days:
      clampInteger(
        source.expired_notification_grace_days,
        7,
        0,
        365
      ),
    delivery_job_days:
      clampInteger(
        source.delivery_job_days,
        180,
        30,
        1095
      ),
    delivery_attempt_days:
      clampInteger(
        source.delivery_attempt_days,
        180,
        30,
        1095
      ),
    worker_run_days:
      clampInteger(
        source.worker_run_days,
        90,
        7,
        365
      ),
    updated_at:
      source.updated_at || null,
  }
}

export function normalizeCleanupResult(
  value
) {
  const source = ensureObject(value)

  return {
    dry_run: source.dry_run !== false,
    enabled:
      source.enabled !== false,
    expired_notifications: Number(
      source.expired_notifications || 0
    ),
    archived_notifications: Number(
      source.archived_notifications || 0
    ),
    read_notifications: Number(
      source.read_notifications || 0
    ),
    delivery_jobs: Number(
      source.delivery_jobs || 0
    ),
    delivery_attempts: Number(
      source.delivery_attempts || 0
    ),
    worker_runs: Number(
      source.worker_runs || 0
    ),
  }
}

export function validateRetentionSettingsPatch(
  patch
) {
  const source = {
    ...DEFAULT_RETENTION_SETTINGS,
    ...ensureObject(patch),
  }

  return {
    enabled: source.enabled === true,
    read_notification_days:
      clampInteger(
        source.read_notification_days,
        180,
        30,
        1095
      ),
    archived_notification_days:
      clampInteger(
        source.archived_notification_days,
        30,
        7,
        365
      ),
    expired_notification_grace_days:
      clampInteger(
        source.expired_notification_grace_days,
        7,
        0,
        365
      ),
    delivery_job_days:
      clampInteger(
        source.delivery_job_days,
        180,
        30,
        1095
      ),
    delivery_attempt_days:
      clampInteger(
        source.delivery_attempt_days,
        180,
        30,
        1095
      ),
    worker_run_days:
      clampInteger(
        source.worker_run_days,
        90,
        7,
        365
      ),
  }
}

export async function getAdminNotificationRetentionSettings() {
  const { data, error } =
    await supabase.rpc(
      'get_admin_notification_retention_settings'
    )

  if (error) {
    throw error
  }

  return normalizeRetentionSettings(
    data
  )
}

export async function updateAdminNotificationRetentionSettings(
  patch
) {
  const settingsPatch =
    validateRetentionSettingsPatch(
      patch
    )

  const { data, error } =
    await supabase.rpc(
      'update_admin_notification_retention_settings',
      {
        p_settings_patch:
          settingsPatch,
      }
    )

  if (error) {
    throw error
  }

  return normalizeRetentionSettings(
    data
  )
}

export async function runNotificationRetentionCleanup({
  dryRun = true,
} = {}) {
  const { data, error } =
    await supabase.rpc(
      'admin_cleanup_notification_retention',
      {
        p_dry_run: dryRun !== false,
      }
    )

  if (error) {
    throw error
  }

  return normalizeCleanupResult(data)
}

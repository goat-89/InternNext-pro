import { supabase } from './supabase'

const defaultProviderSettings = {
  channel: 'email',
  provider: 'resend',
  is_enabled: false,
  from_email: '',
  from_name: 'InternNext Pro',
  reply_to_email: '',
  metadata: {},
  updated_at: null,
}

const emailPattern =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

export function normalizeProviderSetting(
  value
) {
  const source = ensureObject(value)

  return {
    ...defaultProviderSettings,
    channel:
      String(
        source.channel || 'email'
      ).trim() || 'email',
    provider:
      String(
        source.provider || 'resend'
      ).trim() || 'resend',
    is_enabled:
      source.is_enabled === true,
    from_email:
      String(
        source.from_email || ''
      ).trim(),
    from_name:
      String(
        source.from_name ||
          'InternNext Pro'
      ).trim() || 'InternNext Pro',
    reply_to_email:
      String(
        source.reply_to_email || ''
      ).trim(),
    metadata: ensureObject(
      source.metadata
    ),
    updated_at:
      source.updated_at || null,
  }
}

export function normalizeProviderSettings(
  value
) {
  const rows = Array.isArray(value)
    ? value
    : []
  const normalized = rows.map(
    normalizeProviderSetting
  )
  const emailSetting =
    normalized.find(
      (setting) =>
        setting.channel === 'email'
    ) ||
    normalizeProviderSetting({})

  return {
    email: emailSetting,
  }
}

function validateEmailProviderPatch(
  patch
) {
  const source = ensureObject(patch)

  const result = {
    provider: 'resend',
    is_enabled:
      source.is_enabled === true,
    from_email: String(
      source.from_email || ''
    ).trim(),
    from_name:
      String(
        source.from_name ||
          'InternNext Pro'
      ).trim() ||
      'InternNext Pro',
    reply_to_email: String(
      source.reply_to_email || ''
    ).trim(),
  }

  if (
    result.is_enabled &&
    !result.from_email
  ) {
    throw new Error(
      'From email is required when email delivery is enabled.'
    )
  }

  if (
    result.from_email &&
    !emailPattern.test(result.from_email)
  ) {
    throw new Error(
      'From email must be valid.'
    )
  }

  if (
    result.reply_to_email &&
    !emailPattern.test(
      result.reply_to_email
    )
  ) {
    throw new Error(
      'Reply-to email must be valid.'
    )
  }

  return result
}

export async function getAdminNotificationProviderSettings() {
  const { data, error } =
    await supabase.rpc(
      'get_admin_notification_provider_settings'
    )

  if (error) {
    throw error
  }

  return normalizeProviderSettings(
    data
  )
}

export async function updateAdminEmailProviderSetting(
  patch
) {
  const settingsPatch =
    validateEmailProviderPatch(patch)

  const { data, error } =
    await supabase.rpc(
      'update_admin_notification_provider_setting',
      {
        p_channel: 'email',
        p_settings_patch:
          settingsPatch,
      }
    )

  if (error) {
    throw error
  }

  return normalizeProviderSetting(
    data
  )
}

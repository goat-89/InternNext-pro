import { supabase } from './supabase'

export const notificationPreferenceCategories = [
  {
    key: 'application',
    label: 'Applications',
    description:
      'Application submissions and status updates.',
  },
  {
    key: 'interview',
    label: 'Interviews',
    description:
      'Interview scheduling, reminders and changes.',
  },
  {
    key: 'payment',
    label: 'Payments',
    description:
      'Payment success, failures and refunds.',
  },
  {
    key: 'subscription',
    label: 'Subscriptions',
    description:
      'Plan changes, expiry and limit warnings.',
  },
  {
    key: 'support',
    label: 'Support',
    description:
      'Support ticket creation and updates.',
  },
  {
    key: 'moderation',
    label: 'Moderation',
    description:
      'Company and internship review updates.',
  },
  {
    key: 'security',
    label: 'Security',
    description:
      'Account and security-sensitive alerts.',
    locked: true,
  },
]

export const notificationChannels = [
  {
    key: 'in_app_enabled',
    providerKey: 'in_app',
    label: 'In-app',
  },
  {
    key: 'email_enabled',
    providerKey: 'email',
    label: 'Email',
  },
  {
    key: 'push_enabled',
    providerKey: 'web_push',
    label: 'Push',
  },
  {
    key: 'sms_enabled',
    providerKey: 'sms',
    label: 'SMS',
  },
  {
    key: 'whatsapp_enabled',
    providerKey: 'whatsapp',
    label: 'WhatsApp',
  },
]

const defaultSettings = {
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  timezone: 'Asia/Kolkata',
  marketing_enabled: false,
  digest_frequency: 'never',
}

const defaultProviders = {
  email: false,
  web_push: false,
  sms: false,
  whatsapp: false,
}

function defaultCategoryPreference(
  category
) {
  return {
    category,
    in_app_enabled: true,
    email_enabled: true,
    push_enabled: false,
    sms_enabled: false,
    whatsapp_enabled: false,
  }
}

function normalizeSettings(settings) {
  return {
    ...defaultSettings,
    ...(settings || {}),
  }
}

function normalizeCategoryPreferences(
  preferences
) {
  return Object.fromEntries(
    notificationPreferenceCategories.map(
      ({ key, locked }) => {
        const preference = {
          ...defaultCategoryPreference(key),
          ...(preferences?.[key] || {}),
        }

        if (locked) {
          preference.in_app_enabled = true
          preference.email_enabled = true
        }

        return [key, preference]
      }
    )
  )
}

export function normalizeNotificationPreferences(
  payload
) {
  return {
    settings: normalizeSettings(
      payload?.settings
    ),
    categoryPreferences:
      normalizeCategoryPreferences(
        payload?.category_preferences
      ),
    providers: {
      ...defaultProviders,
      ...(payload?.providers || {}),
    },
  }
}

export async function getMyNotificationPreferences() {
  const { data, error } =
    await supabase.rpc(
      'get_my_notification_preferences'
    )

  if (error) {
    throw error
  }

  return normalizeNotificationPreferences(
    data
  )
}

export async function updateMyNotificationPreferences({
  settings,
  categoryPreferences,
}) {
  const { data, error } =
    await supabase.rpc(
      'update_my_notification_preferences',
      {
        p_settings: settings || {},
        p_category_preferences:
          categoryPreferences || {},
      }
    )

  if (error) {
    throw error
  }

  return normalizeNotificationPreferences(
    data
  )
}

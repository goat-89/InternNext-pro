export const notificationCategories = [
  'application',
  'interview',
  'payment',
  'subscription',
  'support',
  'moderation',
  'security',
  'system',
  'employer',
  'student',
]

export const notificationPriorities = [
  'low',
  'normal',
  'high',
  'critical',
]

export const notificationChannels = [
  'in_app',
  'email',
  'web_push',
  'sms',
  'whatsapp',
]

const criticalEvents = new Set([
  'account_security_alert',
  'account_suspended',
  'account_restored',
  'security_policy_violation',
  'payment_failed',
  'notification_delivery_failure',
])

const eventCategories = {
  application_submitted: 'application',
  application_received: 'application',
  application_under_review: 'application',
  application_shortlisted: 'application',
  application_rejected: 'application',
  application_selected: 'application',
  application_withdrawn: 'application',
  interview_scheduled: 'interview',
  interview_rescheduled: 'interview',
  interview_cancelled: 'interview',
  interview_reminder: 'interview',
  payment_success: 'payment',
  payment_failed: 'payment',
  refund_processed: 'payment',
  subscription_activated: 'subscription',
  subscription_update: 'subscription',
  subscription_expiring: 'subscription',
  subscription_expired: 'subscription',
  support_ticket_created: 'support',
  support_ticket_updated: 'support',
  company_verification_update: 'moderation',
  internship_approved: 'moderation',
  internship_rejected: 'moderation',
  account_security_alert: 'security',
  account_suspended: 'security',
  account_restored: 'security',
}

export const notificationEventPolicies = {
  application_submitted: {
    category: 'application',
    priority: 'normal',
    channels: ['in_app', 'email'],
  },
  application_received: {
    category: 'application',
    priority: 'normal',
    channels: ['in_app', 'email'],
  },
  application_shortlisted: {
    category: 'application',
    priority: 'high',
    channels: [
      'in_app',
      'email',
      'web_push',
    ],
  },
  interview_scheduled: {
    category: 'interview',
    priority: 'high',
    channels: [
      'in_app',
      'email',
      'web_push',
    ],
  },
  payment_success: {
    category: 'payment',
    priority: 'high',
    channels: ['in_app', 'email'],
  },
  payment_failed: {
    category: 'payment',
    priority: 'critical',
    channels: [
      'in_app',
      'email',
      'web_push',
    ],
    critical: true,
    preferenceControlled: false,
    quietHoursAllowed: false,
  },
  subscription_activated: {
    category: 'subscription',
    priority: 'high',
    channels: ['in_app', 'email'],
  },
  support_ticket_created: {
    category: 'support',
    priority: 'normal',
    channels: ['in_app', 'email'],
  },
  company_verification_update: {
    category: 'moderation',
    priority: 'normal',
    channels: ['in_app', 'email'],
  },
  internship_approved: {
    category: 'moderation',
    priority: 'normal',
    channels: ['in_app', 'email'],
  },
  account_security_alert: {
    category: 'security',
    priority: 'critical',
    channels: [
      'in_app',
      'email',
      'web_push',
    ],
    critical: true,
    preferenceControlled: false,
    quietHoursAllowed: false,
  },
}

export function isValidNotificationEventKey(
  eventKey
) {
  return /^[a-z][a-z0-9_]{2,120}$/.test(
    String(eventKey || '')
  )
}

export function getNotificationCategory(
  eventKey,
  fallback = 'system'
) {
  return (
    eventCategories[eventKey] ||
    fallback
  )
}

export function getNotificationEventPolicy(
  eventKey
) {
  const policy =
    notificationEventPolicies[
      eventKey
    ]

  if (!policy) {
    return {
      category:
        getNotificationCategory(
          eventKey
        ),
      priority: 'normal',
      channels: ['in_app'],
      critical: false,
      preferenceControlled: true,
      quietHoursAllowed: true,
    }
  }

  return {
    critical: false,
    preferenceControlled: true,
    quietHoursAllowed: true,
    ...policy,
  }
}

export function isCriticalNotificationEvent(
  eventKey
) {
  return criticalEvents.has(eventKey)
}

export function resolveChannelsForEvent(
  eventKey,
  {
    providerAvailability = {},
    preferences = {},
  } = {}
) {
  const critical =
    isCriticalNotificationEvent(
      eventKey
    )
  const policy =
    getNotificationEventPolicy(
      eventKey
    )

  const desiredChannels =
    policy.channels ||
    (critical
      ? ['in_app', 'email', 'web_push']
      : ['in_app', 'email'])

  return desiredChannels.filter(
    (channel) => {
      if (channel === 'in_app') {
        return true
      }

      if (
        providerAvailability[channel] ===
        false
      ) {
        return false
      }

      if (critical) {
        return true
      }

      const preferenceKey =
        `${channel}_enabled`

      return preferences[
        preferenceKey
      ] !== false
    }
  )
}

export function getRetryDelaySeconds(
  attemptNumber
) {
  const delays = [
    0,
    60,
    300,
    1800,
  ]

  return delays[
    Math.min(
      Math.max(
        Number(attemptNumber) - 1,
        0
      ),
      delays.length - 1
    )
  ]
}

function minutesFromTime(value) {
  const [hours, minutes] =
    String(value || '')
      .split(':')
      .map(Number)

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null
  }

  return hours * 60 + minutes
}

export function isWithinQuietHours(
  date,
  {
    enabled = false,
    start = null,
    end = null,
  } = {}
) {
  if (!enabled) {
    return false
  }

  const startMinutes =
    minutesFromTime(start)
  const endMinutes =
    minutesFromTime(end)

  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes === endMinutes
  ) {
    return false
  }

  const current = new Date(date)
  const currentMinutes =
    current.getHours() * 60 +
    current.getMinutes()

  if (startMinutes < endMinutes) {
    return (
      currentMinutes >= startMinutes &&
      currentMinutes < endMinutes
    )
  }

  return (
    currentMinutes >= startMinutes ||
    currentMinutes < endMinutes
  )
}

export function buildNotificationIdempotencyKey({
  eventKey,
  aggregateType,
  aggregateId,
  version,
}) {
  return [
    eventKey,
    aggregateType,
    aggregateId,
    version,
  ]
    .filter(Boolean)
    .join(':')
}

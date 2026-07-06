const allowedPrefixes = [
  '/student/',
  '/employer/',
  '/admin/',
  '/internships',
  '/pricing',
  '/payment-success',
  '/payment-failed',
]

export function isSafeNotificationDeepLink(
  value
) {
  if (!value) {
    return true
  }

  const link = String(value).trim()

  if (!link.startsWith('/')) {
    return false
  }

  if (
    link.startsWith('//') ||
    /^[a-z][a-z0-9+.-]*:/i.test(link) ||
    /[\u0000-\u001f]/.test(link)
  ) {
    return false
  }

  return allowedPrefixes.some(
    (prefix) =>
      link === prefix.replace(/\/$/, '') ||
      link.startsWith(prefix)
  )
}

export function normalizeNotificationDeepLink(
  value,
  fallback = null
) {
  const link =
    value === null ||
    value === undefined
      ? ''
      : String(value).trim()

  if (!link) {
    return fallback
  }

  return isSafeNotificationDeepLink(link)
    ? link
    : fallback
}

import { supabase } from './supabase'

const INSTALLATION_KEY =
  '__internnext_error_reporting_installed__'

function cleanToken(value, fallback) {
  const clean = String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80)

  return clean || fallback
}

export function createErrorReference() {
  const randomPart =
    globalThis.crypto?.randomUUID?.()
      ?.replaceAll('-', '')
      .slice(0, 8) ||
    Math.random()
      .toString(36)
      .slice(2, 10)

  return `ERR-${Date.now()
    .toString(36)
    .toUpperCase()}-${randomPart.toUpperCase()}`
}

export function getSafeRoute() {
  if (
    typeof window === 'undefined'
  ) {
    return ''
  }

  return sanitizeRoute(
    window.location.pathname
  )
}

export function sanitizeRoute(value) {
  return String(value || '')
    .split('?')[0]
    .split('#')[0]
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:id'
    )
    .replace(
      /\/[a-zA-Z0-9_-]{32,}/g,
      '/:redacted'
    )
    .slice(0, 200)
}

function getSafeMetadata() {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined'
  ) {
    return {}
  }

  return {
    viewport_width:
      window.innerWidth,
    viewport_height:
      window.innerHeight,
    online: navigator.onLine,
    mode: import.meta.env.MODE,
  }
}

export async function reportOperationalEvent({
  eventType = 'client_error',
  code = 'CLIENT_ERROR',
  requestId = createErrorReference(),
  route = getSafeRoute(),
} = {}) {
  const safeRequestId = cleanToken(
    requestId,
    createErrorReference()
  )

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        reported: false,
        requestId: safeRequestId,
      }
    }

    const { data, error } =
      await supabase.rpc(
        'report_client_operational_event',
        {
          p_event_type: cleanToken(
            eventType,
            'client_error'
          ).toLowerCase(),
          p_code: cleanToken(
            code,
            'CLIENT_ERROR'
          ).toUpperCase(),
          p_request_id:
            safeRequestId,
          p_route:
            sanitizeRoute(route) || null,
          p_metadata:
            getSafeMetadata(),
        }
      )

    if (error) {
      return {
        reported: false,
        requestId: safeRequestId,
      }
    }

    return {
      reported: true,
      eventId: data,
      requestId: safeRequestId,
    }
  } catch {
    return {
      reported: false,
      requestId: safeRequestId,
    }
  }
}

export function installGlobalErrorReporting() {
  if (
    typeof window === 'undefined' ||
    globalThis[INSTALLATION_KEY]
  ) {
    return
  }

  const reportWindowError = () => {
    void reportOperationalEvent({
      eventType: 'window_error',
      code: 'UNHANDLED_WINDOW_ERROR',
    })
  }

  const reportUnhandledRejection = () => {
    void reportOperationalEvent({
      eventType:
        'unhandled_promise_rejection',
      code:
        'UNHANDLED_PROMISE_REJECTION',
    })
  }

  window.addEventListener(
    'error',
    reportWindowError
  )
  window.addEventListener(
    'unhandledrejection',
    reportUnhandledRejection
  )

  globalThis[INSTALLATION_KEY] = true
}

const allowedHeaders =
  'authorization, x-client-info, apikey, content-type'

const allowedMethods = 'POST, OPTIONS'

export const DEFAULT_PAYMENT_BODY_LIMIT =
  64 * 1024

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

export function parseAllowedOrigins(
  configuredOrigins: string | undefined
) {
  return new Set(
    String(configuredOrigins || '')
      .split(',')
      .map((value) =>
        normalizeOrigin(value.trim())
      )
      .filter(Boolean)
  )
}

export function resolvePaymentCors(
  request: Request,
  configuredOrigins: string | undefined
) {
  const requestOrigin =
    request.headers.get('Origin')?.trim() ||
    ''

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      allowedHeaders,
    'Access-Control-Allow-Methods':
      allowedMethods,
    'Access-Control-Max-Age': '86400',
  }

  if (!requestOrigin) {
    return {
      allowed: true,
      headers,
      origin: '',
    }
  }

  const normalizedRequestOrigin =
    normalizeOrigin(requestOrigin)
  const allowedOrigins =
    parseAllowedOrigins(configuredOrigins)
  const allowed =
    Boolean(normalizedRequestOrigin) &&
    allowedOrigins.has(
      normalizedRequestOrigin
    )

  if (allowed) {
    headers['Access-Control-Allow-Origin'] =
      normalizedRequestOrigin
    headers.Vary = 'Origin'
  }

  return {
    allowed,
    headers,
    origin: normalizedRequestOrigin,
  }
}

export function jsonResponse(
  body: Record<string, unknown>,
  {
    status = 200,
    headers = {},
    requestId,
  }: {
    status?: number
    headers?: Record<string, string>
    requestId?: string
  } = {}
) {
  return new Response(
    JSON.stringify({
      ...body,
      ...(requestId
        ? { request_id: requestId }
        : {}),
    }),
    {
      status,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        ...(requestId
          ? { 'X-Request-Id': requestId }
          : {}),
      },
    }
  )
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string>,
  requestId: string
) {
  return jsonResponse(
    {
      error: message,
      code,
    },
    {
      status,
      headers,
      requestId,
    }
  )
}

export async function readTextBody(
  request: Request,
  maximumBytes =
    DEFAULT_PAYMENT_BODY_LIMIT
) {
  const contentLength = Number(
    request.headers.get('Content-Length') ||
      0
  )

  if (
    Number.isFinite(contentLength) &&
    contentLength > maximumBytes
  ) {
    return {
      ok: false as const,
      code: 'PAYLOAD_TOO_LARGE',
    }
  }

  const text = await request.text()
  const bytes =
    new TextEncoder().encode(text).byteLength

  if (bytes > maximumBytes) {
    return {
      ok: false as const,
      code: 'PAYLOAD_TOO_LARGE',
    }
  }

  return {
    ok: true as const,
    text,
  }
}

export async function readJsonBody(
  request: Request,
  maximumBytes =
    DEFAULT_PAYMENT_BODY_LIMIT
) {
  const result = await readTextBody(
    request,
    maximumBytes
  )

  if (!result.ok) {
    return result
  }

  try {
    return {
      ok: true as const,
      value: JSON.parse(result.text),
    }
  } catch {
    return {
      ok: false as const,
      code: 'INVALID_JSON',
    }
  }
}

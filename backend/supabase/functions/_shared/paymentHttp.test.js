import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  errorResponse,
  parseAllowedOrigins,
  readJsonBody,
  resolvePaymentCors,
} from './paymentHttp.ts'

describe('payment Edge Function HTTP security', () => {
  it('normalizes a comma-separated origin allowlist', () => {
    expect([
      ...parseAllowedOrigins(
        'https://app.example.com/path, http://localhost:5173'
      ),
    ]).toEqual([
      'https://app.example.com',
      'http://localhost:5173',
    ])
  })

  it('returns CORS headers only for an approved browser origin', () => {
    const approved = resolvePaymentCors(
      new Request('https://edge.example.com', {
        headers: {
          Origin: 'https://app.example.com',
        },
      }),
      'https://app.example.com'
    )

    expect(approved.allowed).toBe(true)
    expect(
      approved.headers[
        'Access-Control-Allow-Origin'
      ]
    ).toBe('https://app.example.com')

    const rejected = resolvePaymentCors(
      new Request('https://edge.example.com', {
        headers: {
          Origin: 'https://attacker.example',
        },
      }),
      'https://app.example.com'
    )

    expect(rejected.allowed).toBe(false)
    expect(
      rejected.headers[
        'Access-Control-Allow-Origin'
      ]
    ).toBeUndefined()
  })

  it('allows non-browser requests without reflecting an origin', () => {
    const result = resolvePaymentCors(
      new Request('https://edge.example.com'),
      ''
    )

    expect(result.allowed).toBe(true)
    expect(
      result.headers[
        'Access-Control-Allow-Origin'
      ]
    ).toBeUndefined()
  })

  it('returns safe structured errors with a reference ID', async () => {
    const response = errorResponse(
      'PAYMENT_INTERNAL_ERROR',
      'Payment service is unavailable.',
      500,
      {},
      'request-123'
    )

    expect(response.status).toBe(500)
    expect(
      response.headers.get('X-Request-Id')
    ).toBe('request-123')
    expect(await response.json()).toEqual({
      error: 'Payment service is unavailable.',
      code: 'PAYMENT_INTERNAL_ERROR',
      request_id: 'request-123',
    })
  })

  it('rejects malformed and oversized JSON bodies', async () => {
    const malformed = await readJsonBody(
      new Request('https://edge.example.com', {
        method: 'POST',
        body: '{bad-json',
      })
    )

    expect(malformed).toEqual({
      ok: false,
      code: 'INVALID_JSON',
    })

    const oversized = await readJsonBody(
      new Request('https://edge.example.com', {
        method: 'POST',
        body: '{"value":"large"}',
      }),
      5
    )

    expect(oversized).toEqual({
      ok: false,
      code: 'PAYLOAD_TOO_LARGE',
    })
  })
})

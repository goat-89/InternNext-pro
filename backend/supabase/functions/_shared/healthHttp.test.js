import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  healthJsonResponse,
  validateHealthMethod,
} from './healthHttp.ts'

describe('platform health HTTP helpers', () => {
  it('accepts only read-only health methods', () => {
    expect(
      validateHealthMethod(
        new Request(
          'https://example.com',
          {
            method: 'GET',
          }
        )
      )
    ).toEqual({
      allowed: true,
      head: false,
    })

    expect(
      validateHealthMethod(
        new Request(
          'https://example.com',
          {
            method: 'POST',
          }
        )
      ).allowed
    ).toBe(false)
  })

  it('returns no-store JSON without internal details', async () => {
    const response =
      healthJsonResponse(
        {
          status: 'unavailable',
        },
        {
          status: 503,
        }
      )

    expect(response.status).toBe(503)
    expect(
      response.headers.get(
        'Cache-Control'
      )
    ).toContain('no-store')
    expect(await response.json()).toEqual({
      status: 'unavailable',
    })
  })

  it('returns an empty body for HEAD probes', async () => {
    const response =
      healthJsonResponse(
        {
          status: 'ok',
        },
        {
          head: true,
        }
      )

    expect(await response.text()).toBe('')
  })
})

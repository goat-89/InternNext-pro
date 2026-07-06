import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const getUser = vi.hoisted(() => vi.fn())
const rpc = vi.hoisted(() => vi.fn())

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser,
    },
    rpc,
  },
}))

import {
  createErrorReference,
  reportOperationalEvent,
  sanitizeRoute,
} from './operationalEventsApi'

describe('operational event reporting', () => {
  beforeEach(() => {
    getUser.mockReset()
    rpc.mockReset()
  })

  it('creates safe user-facing reference IDs', () => {
    expect(createErrorReference()).toMatch(
      /^ERR-[A-Z0-9]+-[A-Z0-9]+$/
    )
  })

  it('redacts identifiers and tokens from routes', () => {
    expect(
      sanitizeRoute(
        '/employer-access/abcdefghijklmnopqrstuvwxyz1234567890?token=secret'
      )
    ).toBe(
      '/employer-access/:redacted'
    )

    expect(
      sanitizeRoute(
        '/applications/123e4567-e89b-12d3-a456-426614174000'
      )
    ).toBe('/applications/:id')
  })

  it('does not report unauthenticated browser errors', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(
      reportOperationalEvent({
        requestId: 'ERR-TEST-1',
      })
    ).resolves.toEqual({
      reported: false,
      requestId: 'ERR-TEST-1',
    })

    expect(rpc).not.toHaveBeenCalled()
  })

  it('sends only safe structured fields', async () => {
    getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
      error: null,
    })
    rpc.mockResolvedValue({
      data: 'event-1',
      error: null,
    })

    await expect(
      reportOperationalEvent({
        eventType: 'render failure!',
        code: 'react render error',
        requestId: 'ERR-TEST-2',
        route:
          '/student/profile?token=secret',
      })
    ).resolves.toEqual({
      reported: true,
      eventId: 'event-1',
      requestId: 'ERR-TEST-2',
    })

    expect(rpc).toHaveBeenCalledWith(
      'report_client_operational_event',
      expect.objectContaining({
        p_event_type:
          'render_failure_',
        p_code:
          'REACT_RENDER_ERROR',
        p_request_id: 'ERR-TEST-2',
        p_route: '/student/profile',
      })
    )

    const payload =
      rpc.mock.calls[0][1]

    expect(payload).not.toHaveProperty(
      'error'
    )
    expect(
      JSON.stringify(payload)
    ).not.toContain('secret')
  })

  it('fails quietly when reporting is unavailable', async () => {
    getUser.mockRejectedValue(
      new Error('network detail')
    )

    await expect(
      reportOperationalEvent({
        requestId: 'ERR-TEST-3',
      })
    ).resolves.toEqual({
      reported: false,
      requestId: 'ERR-TEST-3',
    })
  })
})

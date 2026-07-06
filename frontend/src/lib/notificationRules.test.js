import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildNotificationIdempotencyKey,
  getNotificationEventPolicy,
  getNotificationCategory,
  getRetryDelaySeconds,
  isCriticalNotificationEvent,
  isValidNotificationEventKey,
  isWithinQuietHours,
  resolveChannelsForEvent,
} from './notificationRules'

import {
  isSafeNotificationDeepLink,
  normalizeNotificationDeepLink,
} from './notificationDeepLinks'

describe('notification rules', () => {
  it('validates stable event keys', () => {
    expect(
      isValidNotificationEventKey(
        'application_submitted'
      )
    ).toBe(true)

    expect(
      isValidNotificationEventKey(
        'Application Submitted'
      )
    ).toBe(false)
  })

  it('maps known event categories', () => {
    expect(
      getNotificationCategory(
        'interview_scheduled'
      )
    ).toBe('interview')

    expect(
      getNotificationCategory(
        'unknown_event'
      )
    ).toBe('system')
  })

  it('returns event policy metadata', () => {
    expect(
      getNotificationEventPolicy(
        'payment_failed'
      )
    ).toMatchObject({
      category: 'payment',
      priority: 'critical',
      critical: true,
      preferenceControlled: false,
      quietHoursAllowed: false,
    })

    expect(
      getNotificationEventPolicy(
        'custom_internal_event'
      )
    ).toMatchObject({
      category: 'system',
      priority: 'normal',
      channels: ['in_app'],
    })
  })

  it('protects critical event channels', () => {
    expect(
      isCriticalNotificationEvent(
        'account_security_alert'
      )
    ).toBe(true)

    expect(
      resolveChannelsForEvent(
        'account_security_alert',
        {
          preferences: {
            email_enabled: false,
          },
        }
      )
    ).toContain('email')
  })

  it('skips unavailable optional providers', () => {
    expect(
      resolveChannelsForEvent(
        'application_submitted',
        {
          providerAvailability: {
            email: false,
          },
        }
      )
    ).toEqual(['in_app'])
  })

  it('calculates retry backoff', () => {
    expect(
      getRetryDelaySeconds(1)
    ).toBe(0)

    expect(
      getRetryDelaySeconds(4)
    ).toBe(1800)

    expect(
      getRetryDelaySeconds(99)
    ).toBe(1800)
  })

  it('handles quiet hours across midnight', () => {
    const duringQuiet =
      new Date('2026-06-26T23:30:00')
    const outsideQuiet =
      new Date('2026-06-26T12:30:00')

    expect(
      isWithinQuietHours(
        duringQuiet,
        {
          enabled: true,
          start: '22:00',
          end: '07:00',
        }
      )
    ).toBe(true)

    expect(
      isWithinQuietHours(
        outsideQuiet,
        {
          enabled: true,
          start: '22:00',
          end: '07:00',
        }
      )
    ).toBe(false)
  })

  it('builds deterministic idempotency keys', () => {
    expect(
      buildNotificationIdempotencyKey({
        eventKey:
          'application_submitted',
        aggregateType:
          'application',
        aggregateId: 'app-1',
        version: 'v1',
      })
    ).toBe(
      'application_submitted:application:app-1:v1'
    )
  })

  it('validates internal notification deep links', () => {
    expect(
      isSafeNotificationDeepLink(
        '/student/applications'
      )
    ).toBe(true)

    expect(
      isSafeNotificationDeepLink(
        'https://example.com'
      )
    ).toBe(false)

    expect(
      normalizeNotificationDeepLink(
        '//evil.test',
        '/student/notifications'
      )
    ).toBe('/student/notifications')
  })
})

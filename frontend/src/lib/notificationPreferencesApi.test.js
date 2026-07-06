import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const rpc = vi.hoisted(() => vi.fn())

vi.mock('./supabase', () => ({
  supabase: {
    rpc,
  },
}))

import {
  getMyNotificationPreferences,
  normalizeNotificationPreferences,
  updateMyNotificationPreferences,
} from './notificationPreferencesApi'

describe('notification preferences API', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('normalizes missing preferences with safe defaults', () => {
    const preferences =
      normalizeNotificationPreferences({})

    expect(
      preferences.settings.timezone
    ).toBe('Asia/Kolkata')

    expect(
      preferences
        .categoryPreferences
        .application
        .in_app_enabled
    ).toBe(true)

    expect(
      preferences
        .categoryPreferences
        .security
        .email_enabled
    ).toBe(true)

    expect(
      preferences.providers.web_push
    ).toBe(false)
  })

  it('keeps security category enabled', () => {
    const preferences =
      normalizeNotificationPreferences({
        category_preferences: {
          security: {
            in_app_enabled: false,
            email_enabled: false,
          },
        },
      })

    expect(
      preferences
        .categoryPreferences
        .security
        .in_app_enabled
    ).toBe(true)

    expect(
      preferences
        .categoryPreferences
        .security
        .email_enabled
    ).toBe(true)
  })

  it('loads preferences through RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        settings: {
          digest_frequency: 'daily',
        },
      },
      error: null,
    })

    await expect(
      getMyNotificationPreferences()
    ).resolves.toMatchObject({
      settings: {
        digest_frequency: 'daily',
      },
    })

    expect(rpc).toHaveBeenCalledWith(
      'get_my_notification_preferences'
    )
  })

  it('updates preferences through RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {},
      error: null,
    })

    await updateMyNotificationPreferences({
      settings: {
        digest_frequency: 'weekly',
      },
      categoryPreferences: {
        application: {
          in_app_enabled: true,
        },
      },
    })

    expect(rpc).toHaveBeenCalledWith(
      'update_my_notification_preferences',
      {
        p_settings: {
          digest_frequency: 'weekly',
        },
        p_category_preferences: {
          application: {
            in_app_enabled: true,
          },
        },
      }
    )
  })
})

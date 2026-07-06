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
  getAdminNotificationProviderSettings,
  normalizeProviderSettings,
  updateAdminEmailProviderSetting,
} from './notificationProviderSettingsApi'

describe('notification provider settings API', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('normalizes missing settings with safe email defaults', () => {
    const settings =
      normalizeProviderSettings([])

    expect(settings.email).toMatchObject({
      channel: 'email',
      provider: 'resend',
      is_enabled: false,
      from_name: 'InternNext Pro',
    })
  })

  it('loads provider settings through the admin RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          channel: 'email',
          provider: 'resend',
          is_enabled: true,
          from_email:
            'notify@example.com',
        },
      ],
      error: null,
    })

    await expect(
      getAdminNotificationProviderSettings()
    ).resolves.toMatchObject({
      email: {
        is_enabled: true,
        from_email:
          'notify@example.com',
      },
    })

    expect(rpc).toHaveBeenCalledWith(
      'get_admin_notification_provider_settings'
    )
  })

  it('updates email provider settings through RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        channel: 'email',
        provider: 'resend',
        is_enabled: true,
        from_email:
          'notify@example.com',
      },
      error: null,
    })

    await updateAdminEmailProviderSetting(
      {
        is_enabled: true,
        from_email:
          'notify@example.com',
        from_name:
          'InternNext Pro',
      }
    )

    expect(rpc).toHaveBeenCalledWith(
      'update_admin_notification_provider_setting',
      {
        p_channel: 'email',
        p_settings_patch: {
          provider: 'resend',
          is_enabled: true,
          from_email:
            'notify@example.com',
          from_name:
            'InternNext Pro',
          reply_to_email: '',
        },
      }
    )
  })

  it('requires from email when enabling email delivery', async () => {
    await expect(
      updateAdminEmailProviderSetting({
        is_enabled: true,
      })
    ).rejects.toThrow(
      'From email is required'
    )

    expect(rpc).not.toHaveBeenCalled()
  })
})

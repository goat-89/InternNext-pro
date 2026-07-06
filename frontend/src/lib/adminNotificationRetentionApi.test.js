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
  getAdminNotificationRetentionSettings,
  normalizeCleanupResult,
  normalizeRetentionSettings,
  runNotificationRetentionCleanup,
  updateAdminNotificationRetentionSettings,
  validateRetentionSettingsPatch,
} from './adminNotificationRetentionApi'

describe('admin notification retention API', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('normalizes retention settings with conservative defaults', () => {
    expect(
      normalizeRetentionSettings({})
    ).toMatchObject({
      enabled: true,
      read_notification_days: 180,
      archived_notification_days: 30,
      worker_run_days: 90,
    })
  })

  it('clamps retention patch values', () => {
    expect(
      validateRetentionSettingsPatch({
        read_notification_days: 3,
        worker_run_days: 999,
      })
    ).toMatchObject({
      read_notification_days: 30,
      worker_run_days: 365,
    })
  })

  it('normalizes cleanup counts', () => {
    expect(
      normalizeCleanupResult({
        dry_run: false,
        read_notifications: '4',
      })
    ).toMatchObject({
      dry_run: false,
      read_notifications: 4,
      delivery_jobs: 0,
      delivery_attempts: 0,
    })
  })

  it('loads settings through RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        enabled: false,
      },
      error: null,
    })

    await expect(
      getAdminNotificationRetentionSettings()
    ).resolves.toMatchObject({
      enabled: false,
    })

    expect(rpc).toHaveBeenCalledWith(
      'get_admin_notification_retention_settings'
    )
  })

  it('updates settings through RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {},
      error: null,
    })

    await updateAdminNotificationRetentionSettings(
      {
        enabled: true,
        archived_notification_days: 14,
      }
    )

    expect(rpc).toHaveBeenCalledWith(
      'update_admin_notification_retention_settings',
      {
        p_settings_patch:
          expect.objectContaining({
            enabled: true,
            archived_notification_days: 14,
          }),
      }
    )
  })

  it('runs cleanup through admin RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        dry_run: true,
        delivery_jobs: 2,
      },
      error: null,
    })

    await expect(
      runNotificationRetentionCleanup({
        dryRun: true,
      })
    ).resolves.toMatchObject({
      dry_run: true,
      delivery_jobs: 2,
    })

    expect(rpc).toHaveBeenCalledWith(
      'admin_cleanup_notification_retention',
      {
        p_dry_run: true,
      }
    )
  })
})

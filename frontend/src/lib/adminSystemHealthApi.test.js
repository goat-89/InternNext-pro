import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const rpc = vi.hoisted(() => vi.fn())

vi.mock('./supabase', () => ({
  supabase: { rpc },
}))

import {
  getAdminOperationalRetentionSettings,
  getAdminOperationalEvents,
  getAdminSystemHealthOverview,
  normalizeOperationalCleanupResult,
  normalizeOperationalRetentionSettings,
  normalizeHealthOverview,
  runOperationalRetentionCleanup,
  updateAdminOperationalRetentionSettings,
  updateAdminOperationalEventStatus,
  validateOperationalRetentionSettingsPatch,
} from './adminSystemHealthApi'

describe('admin system health API', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('normalizes missing overview values', () => {
    expect(
      normalizeHealthOverview({})
    ).toEqual({
      generated_at: null,
      open_operational_events: 0,
      critical_operational_events: 0,
      failed_payments_24h: 0,
      failed_webhooks_24h: 0,
      failed_delivery_jobs: 0,
      stale_delivery_jobs: 0,
      last_worker_success_at: null,
      last_worker_failure_at: null,
      recent_events: [],
    })
  })

  it('loads and normalizes the health overview', async () => {
    rpc.mockResolvedValue({
      data: {
        open_operational_events: '3',
        recent_events: [{ id: 'event-1' }],
      },
      error: null,
    })

    const result =
      await getAdminSystemHealthOverview()

    expect(
      result.open_operational_events
    ).toBe(3)
    expect(result.recent_events).toEqual([
      { id: 'event-1' },
    ])
  })

  it('sanitizes event filters and limits', async () => {
    rpc.mockResolvedValue({
      data: [],
      error: null,
    })

    await getAdminOperationalEvents({
      status: 'INVALID',
      source: 'payment',
      limit: 900,
    })

    expect(rpc).toHaveBeenCalledWith(
      'get_admin_operational_events',
      {
        p_status: null,
        p_source: 'payment',
        p_limit: 200,
      }
    )
  })

  it('validates and updates event status', async () => {
    await expect(
      updateAdminOperationalEventStatus(
        '',
        'resolved'
      )
    ).rejects.toThrow(
      'Operational event ID is required.'
    )

    rpc.mockResolvedValue({
      data: {
        id: 'event-1',
        status: 'resolved',
      },
      error: null,
    })

    await expect(
      updateAdminOperationalEventStatus(
        'event-1',
        'resolved'
      )
    ).resolves.toEqual({
      id: 'event-1',
      status: 'resolved',
    })
  })

  it('normalizes operational retention settings', () => {
    expect(
      normalizeOperationalRetentionSettings(
        {
          enabled: false,
          resolved_event_days: 5000,
          ignored_event_days: 2,
          open_noncritical_event_days:
            '120',
        }
      )
    ).toEqual({
      enabled: false,
      resolved_event_days: 730,
      ignored_event_days: 7,
      open_noncritical_event_days: 120,
      updated_at: null,
    })

    expect(
      validateOperationalRetentionSettingsPatch(
        {}
      )
    ).toEqual({
      enabled: true,
      resolved_event_days: 90,
      ignored_event_days: 30,
      open_noncritical_event_days: 90,
    })
  })

  it('normalizes cleanup counts', () => {
    expect(
      normalizeOperationalCleanupResult(
        {
          dry_run: false,
          resolved_events: '2',
          ignored_events: 3,
          open_noncritical_events: 4,
          total_events: '9',
        }
      )
    ).toEqual({
      dry_run: false,
      enabled: true,
      resolved_events: 2,
      ignored_events: 3,
      open_noncritical_events: 4,
      total_events: 9,
    })
  })

  it('loads and updates retention settings through RPCs', async () => {
    rpc
      .mockResolvedValueOnce({
        data: {
          resolved_event_days: 120,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ignored_event_days: 45,
        },
        error: null,
      })

    await getAdminOperationalRetentionSettings()
    await updateAdminOperationalRetentionSettings(
      {
        ignored_event_days: 45,
      }
    )

    expect(
      rpc.mock.calls[0][0]
    ).toBe(
      'get_admin_operational_event_retention_settings'
    )
    expect(
      rpc.mock.calls[1]
    ).toEqual([
      'update_admin_operational_event_retention_settings',
      {
        p_settings_patch: {
          enabled: true,
          resolved_event_days: 90,
          ignored_event_days: 45,
          open_noncritical_event_days: 90,
        },
      },
    ])
  })

  it('runs preview and destructive cleanup explicitly', async () => {
    rpc.mockResolvedValue({
      data: {
        total_events: 4,
      },
      error: null,
    })

    await runOperationalRetentionCleanup()
    await runOperationalRetentionCleanup({
      dryRun: false,
    })

    expect(rpc.mock.calls).toEqual([
      [
        'admin_cleanup_operational_event_retention',
        {
          p_dry_run: true,
        },
      ],
      [
        'admin_cleanup_operational_event_retention',
        {
          p_dry_run: false,
        },
      ],
    ])
  })
})

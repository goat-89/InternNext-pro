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
  createAdminNotificationDigestJobs,
  getAdminNotificationDeliveryAttempts,
  getAdminNotificationDeliveryJobs,
  getAdminNotificationDeliveryOverview,
  getAdminNotificationWorkerRuns,
  normalizeDigestResult,
  normalizeDeliveryJobsPage,
  normalizeDeliveryOverview,
  releaseStaleNotificationDeliveryJobs,
} from './adminNotificationDeliveryApi'

describe('admin notification delivery API', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('normalizes missing overview fields', () => {
    expect(
      normalizeDeliveryOverview({})
    ).toMatchObject({
      status_counts: [],
      channel_counts: [],
      recent_failures: [],
      recent_worker_runs: [],
      stale_processing_count: 0,
    })
  })

  it('normalizes delivery job pagination', () => {
    expect(
      normalizeDeliveryJobsPage(
        {
          total: 3,
          jobs: [{ id: 'job-1' }],
        },
        {
          page: 2,
          pageSize: 10,
        }
      )
    ).toMatchObject({
      jobs: [{ id: 'job-1' }],
      total: 3,
      page: 2,
      pageSize: 10,
      totalPages: 1,
    })
  })

  it('normalizes digest generation result', () => {
    expect(
      normalizeDigestResult(
        {
          provider_enabled: true,
          created: '3',
          skipped: null,
        },
        'weekly'
      )
    ).toEqual({
      frequency: 'weekly',
      provider_enabled: true,
      created: 3,
      skipped: 0,
    })
  })

  it('loads delivery overview through RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        stale_processing_count: 2,
      },
      error: null,
    })

    await expect(
      getAdminNotificationDeliveryOverview()
    ).resolves.toMatchObject({
      stale_processing_count: 2,
    })

    expect(rpc).toHaveBeenCalledWith(
      'get_admin_notification_delivery_overview'
    )
  })

  it('loads jobs with safe filters', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        jobs: [],
        total: 0,
        page: 1,
        page_size: 25,
        total_pages: 1,
      },
      error: null,
    })

    await getAdminNotificationDeliveryJobs({
      status: 'not-real',
      channel: 'email',
      page: -5,
      pageSize: 500,
    })

    expect(rpc).toHaveBeenCalledWith(
      'get_admin_notification_delivery_jobs',
      {
        p_status: null,
        p_channel: 'email',
        p_page: 1,
        p_page_size: 100,
      }
    )
  })

  it('loads attempts for a job', async () => {
    rpc.mockResolvedValueOnce({
      data: [{ id: 'attempt-1' }],
      error: null,
    })

    await expect(
      getAdminNotificationDeliveryAttempts(
        'job-1'
      )
    ).resolves.toEqual([
      { id: 'attempt-1' },
    ])

    expect(rpc).toHaveBeenCalledWith(
      'get_admin_notification_delivery_attempts',
      {
        p_job_id: 'job-1',
      }
    )
  })

  it('releases stale jobs through admin RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: 4,
      error: null,
    })

    await expect(
      releaseStaleNotificationDeliveryJobs()
    ).resolves.toBe(4)

    expect(rpc).toHaveBeenCalledWith(
      'admin_release_stale_notification_delivery_jobs'
    )
  })

  it('creates digest jobs through admin RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        frequency: 'weekly',
        provider_enabled: true,
        created: 2,
        skipped: 1,
      },
      error: null,
    })

    await expect(
      createAdminNotificationDigestJobs(
        'weekly'
      )
    ).resolves.toMatchObject({
      frequency: 'weekly',
      created: 2,
      skipped: 1,
    })

    expect(rpc).toHaveBeenCalledWith(
      'admin_create_notification_digest_jobs',
      {
        p_frequency: 'weekly',
      }
    )
  })

  it('falls back to daily digest for invalid frequency', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        frequency: 'daily',
        created: 0,
      },
      error: null,
    })

    await createAdminNotificationDigestJobs(
      'hourly'
    )

    expect(rpc).toHaveBeenCalledWith(
      'admin_create_notification_digest_jobs',
      {
        p_frequency: 'daily',
      }
    )
  })

  it('loads recent worker runs', async () => {
    rpc.mockResolvedValueOnce({
      data: [{ id: 'run-1' }],
      error: null,
    })

    await expect(
      getAdminNotificationWorkerRuns(500)
    ).resolves.toEqual([
      { id: 'run-1' },
    ])

    expect(rpc).toHaveBeenCalledWith(
      'get_admin_notification_worker_runs',
      {
        p_limit: 100,
      }
    )
  })
})

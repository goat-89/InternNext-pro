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
  buildAdminDailyTrendsCsv,
  buildAdminSummaryCsv,
  buildStatusDistributionCsv,
  getAdminReportingOverview,
} from './adminReportsApi'

describe('admin reporting API helpers', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('clamps report days before calling the reporting RPC', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: null,
    })

    await getAdminReportingOverview(2)

    expect(rpc).toHaveBeenLastCalledWith(
      'get_admin_reporting_overview',
      {
        report_days: 7,
      }
    )

    await getAdminReportingOverview(999)

    expect(rpc).toHaveBeenLastCalledWith(
      'get_admin_reporting_overview',
      {
        report_days: 365,
      }
    )

    await getAdminReportingOverview('bad')

    expect(rpc).toHaveBeenLastCalledWith(
      'get_admin_reporting_overview',
      {
        report_days: 30,
      }
    )
  })

  it('returns a safe default overview when the RPC returns no data', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    await expect(
      getAdminReportingOverview(14)
    ).resolves.toEqual({
      generated_at: null,
      period: {
        days: 14,
        date_from: null,
        date_to: null,
      },
      summary: {},
      daily_trends: [],
      application_statuses: [],
      internship_statuses: [],
      company_statuses: [],
    })
  })

  it('builds admin summary CSV and protects formula-like values', () => {
    const csv = buildAdminSummaryCsv({
      summary: {
        users: {
          total_students: 42,
          risky_metric: '=SUM(1,1)',
        },
      },
    })

    expect(csv).toContain(
      '"Category","Metric","Value"'
    )
    expect(csv).toContain(
      '"Users","Total Students","\'42"'
    )
    expect(csv).toContain(
      '"Users","Risky Metric","\'=SUM(1,1)"'
    )
  })

  it('builds daily trend CSV with defaults for missing values', () => {
    const csv = buildAdminDailyTrendsCsv({
      daily_trends: [
        {
          date: '2026-06-25',
          students: 3,
          applications: 9,
        },
      ],
    })

    expect(csv).toContain(
      '"Date","Student Signups","Employer Signups","Companies Created","Internships Created","Applications","Interviews","Selected","Rejected"'
    )
    expect(csv).toContain(
      '"\'2026-06-25","\'3","\'0","\'0","\'0","\'9","\'0","\'0","\'0"'
    )
  })

  it('builds status distribution CSV for all groups', () => {
    const csv = buildStatusDistributionCsv({
      application_statuses: [
        {
          status: 'under_review',
          count: 5,
        },
      ],
      internship_statuses: [
        {
          status: 'approved',
          count: 7,
        },
      ],
      company_statuses: [
        {
          status: 'pending',
          count: 2,
        },
      ],
    })

    expect(csv).toContain(
      '"Applications","Under Review","\'5"'
    )
    expect(csv).toContain(
      '"Internships","Approved","\'7"'
    )
    expect(csv).toContain(
      '"Companies","Pending","\'2"'
    )
  })
})

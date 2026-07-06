import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Headphones,
  LayoutDashboard,
  LoaderCircle,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'

import {
  Link,
} from 'react-router-dom'

import {
  DashboardShell,
} from '../components/Layout'

import {
  EmptyState,
  StatCard,
} from '../components/UI'

import {
  getEmployerAnalyticsData,
} from '../lib/employerInternshipsApi'

const employerNav = [
  [
    'Overview',
    '/employer/dashboard',
    LayoutDashboard,
  ],
  [
    'Post internship',
    '/employer/post',
    BriefcaseBusiness,
  ],
  [
    'Manage listings',
    '/employer/listings',
    FileText,
  ],
  [
    'Applicants',
    '/employer/applicants',
    Users,
  ],
  [
    'Analytics',
    '/employer/analytics',
    BarChart3,
  ],
  [
    'Billing',
    '/employer/billing',
    CreditCard,
  ],
  [
    'Support',
    '/employer/support',
    Headphones,
  ],
]

function formatStatus(status) {
  const labels = {
    applied: 'Applied',
    under_review: 'Under review',
    shortlisted: 'Shortlisted',
    interview_scheduled:
      'Interview scheduled',
    selected: 'Selected',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',

    draft: 'Draft',
    pending: 'Pending approval',
    approved: 'Approved',
    paused: 'Paused',
    closed: 'Closed',
  }

  return (
    labels[status] ||
    status ||
    'Unknown'
  )
}

function getStatusClass(status) {
  const classes = {
    applied:
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',

    under_review:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',

    shortlisted:
      'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',

    interview_scheduled:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',

    selected:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    rejected:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',

    withdrawn:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',

    draft:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',

    pending:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',

    approved:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    paused:
      'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',

    closed:
      'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  }

  return (
    classes[status] ||
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  )
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString()
}

export default function EmployerAnalytics() {
  const [analytics, setAnalytics] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadAnalytics() {
    try {
      setLoading(true)
      setError('')

      const result =
        await getEmployerAnalyticsData()

      setAnalytics(result)
    } catch (loadError) {
      console.error(
        'Unable to load employer analytics:',
        loadError
      )

      setError(
        loadError?.message ||
          'Unable to load analytics.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const maximumMonthlyApplications =
    useMemo(() => {
      if (
        !analytics
          ?.monthlyApplications
          ?.length
      ) {
        return 1
      }

      return Math.max(
        1,
        ...analytics
          .monthlyApplications
          .map(
            (month) =>
              month.applications
          )
      )
    }, [analytics])

  if (loading) {
    return (
      <DashboardShell
        title="Analytics"
        navItems={employerNav}
      >
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="card h-28 animate-pulse bg-slate-100 dark:bg-slate-900"
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="card h-80 animate-pulse bg-slate-100 dark:bg-slate-900" />

            <div className="card h-80 animate-pulse bg-slate-100 dark:bg-slate-900" />
          </div>

          <div className="card flex min-h-56 items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error || !analytics) {
    return (
      <DashboardShell
        title="Analytics"
        navItems={employerNav}
      >
        <EmptyState
          title="Unable to load analytics"
          text={
            error ||
            'Analytics data is unavailable.'
          }
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={loadAnalytics}
          >
            Try again
          </button>
        </div>
      </DashboardShell>
    )
  }

  const {
    stats,
    statusBreakdown,
    monthlyApplications,
    listingPerformance,
    recentApplications,
  } = analytics

  return (
    <DashboardShell
      title="Analytics"
      navItems={employerNav}
    >
      <section className="rounded-3xl bg-gradient-to-r from-slate-950 to-brand-900 p-7 text-white">
        <p className="text-sm font-bold text-indigo-200">
          Employer insights
        </p>

        <h2 className="mt-1 text-3xl font-black">
          Recruitment performance
        </h2>

        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Track applications, candidate
          progress and internship
          performance using live data.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total internships"
          value={
            stats.totalInternships
          }
          icon={
            BriefcaseBusiness
          }
        />

        <StatCard
          label="Active internships"
          value={
            stats.activeInternships
          }
          icon={CalendarDays}
        />

        <StatCard
          label="Applications"
          value={
            stats.totalApplications
          }
          icon={Users}
        />

        <StatCard
          label="Selected"
          value={stats.selected}
          icon={CheckCircle2}
        />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-purple-100 p-3 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              <Target className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Shortlist rate
              </p>

              <p className="text-2xl font-black">
                {stats.shortlistRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Selection rate
              </p>

              <p className="text-2xl font-black">
                {stats.selectionRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Interviews scheduled
          </p>

          <p className="mt-2 text-3xl font-black">
            {stats.interviews}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Total openings
          </p>

          <p className="mt-2 text-3xl font-black">
            {stats.totalOpenings}
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div>
            <h3 className="text-xl font-black">
              Application trend
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Applications received over
              the last six months.
            </p>
          </div>

          {monthlyApplications.length >
          0 ? (
            <div className="mt-8 flex h-64 items-end gap-3">
              {monthlyApplications.map(
                (month) => {
                  const height =
                    Math.max(
                      6,
                      Math.round(
                        (month.applications /
                          maximumMonthlyApplications) *
                          100
                      )
                    )

                  return (
                    <div
                      key={month.month}
                      className="flex h-full flex-1 flex-col justify-end"
                    >
                      <div className="mb-2 text-center text-sm font-bold">
                        {
                          month.applications
                        }
                      </div>

                      <div className="flex h-48 items-end rounded-2xl bg-slate-100 px-2 dark:bg-slate-900">
                        <div
                          className="w-full rounded-t-xl bg-brand-600 transition-all"
                          style={{
                            height: `${height}%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-center text-xs text-slate-500">
                        {month.month}
                      </p>
                    </div>
                  )
                }
              )}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No application history"
                text="Application trends will appear after students apply."
              />
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-xl font-black">
            Candidate pipeline
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Current application status
            distribution.
          </p>

          <div className="mt-6 space-y-4">
            {[
              [
                'Applied',
                statusBreakdown.applied,
              ],
              [
                'Under review',
                statusBreakdown
                  .under_review,
              ],
              [
                'Shortlisted',
                statusBreakdown
                  .shortlisted,
              ],
              [
                'Interview',
                statusBreakdown
                  .interview_scheduled,
              ],
              [
                'Selected',
                statusBreakdown.selected,
              ],
              [
                'Rejected',
                statusBreakdown.rejected,
              ],
              [
                'Withdrawn',
                statusBreakdown.withdrawn,
              ],
            ].map(
              ([label, value]) => {
                const percentage =
                  stats.totalApplications
                    ? Math.round(
                        (value /
                          stats.totalApplications) *
                          100
                      )
                    : 0

                return (
                  <div key={label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold">
                        {label}
                      </span>

                      <span className="text-slate-500">
                        {value} ·{' '}
                        {percentage}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </div>
      </section>

      <section className="card mt-6 overflow-x-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">
              Listing performance
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Compare applications and
              conversion rates by internship.
            </p>
          </div>

          <Link
            to="/employer/listings"
            className="btn-secondary"
          >
            Manage listings
          </Link>
        </div>

        {listingPerformance.length >
        0 ? (
          <table className="mt-6 w-full min-w-[950px] text-left">
            <thead>
              <tr className="text-sm text-slate-500">
                <th className="pb-4">
                  Internship
                </th>

                <th className="pb-4">
                  Status
                </th>

                <th className="pb-4">
                  Openings
                </th>

                <th className="pb-4">
                  Applications
                </th>

                <th className="pb-4">
                  Shortlisted+
                </th>

                <th className="pb-4">
                  Selected
                </th>

                <th className="pb-4">
                  Shortlist rate
                </th>

                <th className="pb-4">
                  Selection rate
                </th>
              </tr>
            </thead>

            <tbody>
              {listingPerformance.map(
                (listing) => (
                  <tr
                    key={listing.id}
                    className="border-t"
                  >
                    <td className="py-5 pr-5">
                      <p className="font-bold">
                        {listing.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Deadline:{' '}
                        {formatDate(
                          listing.deadline
                        )}
                      </p>
                    </td>

                    <td className="py-5 pr-5">
                      <span
                        className={`badge ${getStatusClass(
                          listing.status
                        )}`}
                      >
                        {formatStatus(
                          listing.status
                        )}
                      </span>
                    </td>

                    <td className="py-5 pr-5">
                      {listing.openings}
                    </td>

                    <td className="py-5 pr-5 font-bold">
                      {
                        listing.totalApplications
                      }
                    </td>

                    <td className="py-5 pr-5">
                      {listing.shortlisted +
                        listing.interviews +
                        listing.selected}
                    </td>

                    <td className="py-5 pr-5">
                      {listing.selected}
                    </td>

                    <td className="py-5 pr-5">
                      {
                        listing.shortlistRate
                      }
                      %
                    </td>

                    <td className="py-5 pr-5">
                      {
                        listing.selectionRate
                      }
                      %
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="No listings available"
              text="Create an internship to begin tracking its performance."
            />
          </div>
        )}
      </section>

      <section className="card mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">
              Recent applications
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Latest applications received
              across your internships.
            </p>
          </div>

          <Link
            to="/employer/applicants"
            className="btn-secondary"
          >
            View applicants
          </Link>
        </div>

        {recentApplications.length >
        0 ? (
          <div className="mt-5 space-y-3">
            {recentApplications.map(
              (application) => (
                <div
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
                >
                  <div>
                    <p className="font-bold">
                      {
                        application.internshipTitle
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Applied:{' '}
                      {formatDate(
                        application.createdAt
                      )}
                    </p>
                  </div>

                  <span
                    className={`badge ${getStatusClass(
                      application.status
                    )}`}
                  >
                    {formatStatus(
                      application.status
                    )}
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="No applications yet"
              text="Applications will appear here after students apply."
            />
          </div>
        )}
      </section>
    </DashboardShell>
  )
}
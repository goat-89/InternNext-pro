import {
  useEffect,
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
  Send,
  Settings,
  Target,
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
  getEmployerDashboardData,
} from '../lib/employerDashboardApi'

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
    [
    'Settings',
    '/employer/settings',
    Settings,
  ],
]

function formatStatus(status) {
  const labels = {
    pending: 'Pending approval',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended',

    draft: 'Draft',
    paused: 'Paused',
    closed: 'Closed',

    applied: 'Applied',
    under_review: 'Under review',
    shortlisted: 'Shortlisted',
    interview_scheduled:
      'Interview scheduled',
    selected: 'Selected',
    withdrawn: 'Withdrawn',
  }

  return (
    labels[status] ||
    status ||
    'Unknown'
  )
}

function getStatusClass(status) {
  const classes = {
    approved:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    selected:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    pending:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',

    under_review:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',

    draft:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',

    paused:
      'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',

    rejected:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',

    suspended:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',

    shortlisted:
      'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',

    interview_scheduled:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',

    applied:
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',

    withdrawn:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',

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

function formatWorkMode(value) {
  const labels = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
  }

  return labels[value] || value || '—'
}

export default function EmployerDashboard() {
  const [
    dashboard,
    setDashboard,
  ] = useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')

      const result =
        await getEmployerDashboardData()

      setDashboard(result)
    } catch (loadError) {
      console.error(
        'Unable to load employer dashboard:',
        loadError
      )

      setError(
        loadError?.message ||
          'Unable to load employer dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <DashboardShell
        title="Employer dashboard"
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
            <div className="card h-72 animate-pulse bg-slate-100 dark:bg-slate-900" />

            <div className="card h-72 animate-pulse bg-slate-100 dark:bg-slate-900" />
          </div>

          <div className="card flex min-h-56 items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error || !dashboard) {
    return (
      <DashboardShell
        title="Employer dashboard"
        navItems={employerNav}
      >
        <EmptyState
          title="Unable to load dashboard"
          text={
            error ||
            'Dashboard data is unavailable.'
          }
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={loadDashboard}
          >
            Try again
          </button>
        </div>
      </DashboardShell>
    )
  }

  const {
    employer,
    company,
    stats,
    recentInternships,
    recentApplications,
  } = dashboard

  return (
    <DashboardShell
      title="Employer dashboard"
      navItems={employerNav}
    >
      <section className="rounded-3xl bg-gradient-to-r from-slate-950 to-brand-900 p-7 text-white">
        <p className="text-sm font-bold text-indigo-200">
          Employer workspace
        </p>

        <h2 className="mt-1 text-3xl font-black">
          Welcome,{' '}
          {employer.fullName ||
            'Employer'}
        </h2>

        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Manage internships, review
          applications and monitor your
          recruitment activity.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/employer/post"
            className="btn-primary"
          >
            Post internship
          </Link>

          <Link
            to="/employer/applicants"
            className="btn-secondary"
          >
            View applicants
          </Link>
        </div>
      </section>

      <section className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Company profile
            </p>

            <h3 className="mt-1 text-xl font-black">
              {company?.name ||
                'Company profile unavailable'}
            </h3>

            {company?.industry && (
              <p className="mt-1 text-sm text-slate-500">
                {company.industry}
              </p>
            )}
          </div>

          {company ? (
            <span
              className={`badge ${getStatusClass(
                company.status
              )}`}
            >
              {formatStatus(
                company.status
              )}
            </span>
          ) : (
            <span className="badge bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
              Missing
            </span>
          )}
        </div>

        {company?.status ===
          'pending' && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            Your company is waiting for
            admin approval. Drafts can be
            created, but internships cannot
            be submitted until the company is
            approved.
          </p>
        )}

        {company?.status ===
          'rejected' && (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Company approval was rejected.
            {company.rejection_reason
              ? ` Reason: ${company.rejection_reason}`
              : ''}
          </p>
        )}

        {company?.status ===
          'approved' && (
          <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Your company is approved and can
            submit internships for review.
          </p>
        )}
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
          label="Applications"
          value={
            stats.totalApplications
          }
          icon={Users}
        />

        <StatCard
          label="Shortlisted+"
          value={
            stats.shortlistedOrFurther
          }
          icon={Target}
        />

        <StatCard
          label="Selected"
          value={
            stats.selectedCandidates
          }
          icon={CheckCircle2}
        />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">
            Approved listings
          </p>

          <p className="mt-2 text-3xl font-black">
            {stats.approvedInternships}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Pending approval
          </p>

          <p className="mt-2 text-3xl font-black">
            {stats.pendingInternships}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Draft listings
          </p>

          <p className="mt-2 text-3xl font-black">
            {stats.draftInternships}
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">
                Recent internships
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Latest listings created by
                your company.
              </p>
            </div>

            <Link
              to="/employer/listings"
              className="btn-secondary"
            >
              Manage listings
            </Link>
          </div>

          {recentInternships.length >
          0 ? (
            <div className="mt-5 space-y-3">
              {recentInternships.map(
                (internship) => (
                  <div
                    key={internship.id}
                    className="rounded-2xl border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">
                          {internship.title}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatWorkMode(
                            internship.work_mode
                          )}{' '}
                          ·{' '}
                          {internship.location ||
                            'Location unavailable'}
                        </p>
                      </div>

                      <span
                        className={`badge ${getStatusClass(
                          internship.status
                        )}`}
                      >
                        {formatStatus(
                          internship.status
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>
                        {
                          internship.applicationCount
                        }{' '}
                        applications
                      </span>

                      <span>
                        {
                          internship.openings
                        }{' '}
                        openings
                      </span>

                      <span>
                        Deadline:{' '}
                        {formatDate(
                          internship.deadline
                        )}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        'draft',
                        'rejected',
                      ].includes(
                        internship.status
                      ) && (
                        <Link
                          to={`/employer/listings/${internship.id}/edit`}
                          className="btn-secondary"
                        >
                          Edit
                        </Link>
                      )}

                      {internship.status ===
                        'approved' && (
                        <Link
                          to={`/internships/${internship.id}`}
                          className="btn-secondary"
                        >
                          View
                        </Link>
                      )}

                      <Link
                        to="/employer/applicants"
                        className="btn-secondary"
                      >
                        Applicants
                      </Link>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No internships yet"
                text="Create your first internship listing."
              />

              <div className="mt-5 text-center">
                <Link
                  to="/employer/post"
                  className="btn-primary"
                >
                  Post internship
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">
                Recent applications
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Latest candidate activity.
              </p>
            </div>

            <Link
              to="/employer/applicants"
              className="btn-secondary"
            >
              View all
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
                text="New applications will appear here."
              />
            </div>
          )}
        </div>
      </section>

      <section className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">
              Recruitment pipeline
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Current candidate status
              summary.
            </p>
          </div>

          <Link
            to="/employer/analytics"
            className="btn-secondary"
          >
            Full analytics
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border p-4">
            <p className="text-sm text-slate-500">
              Applied
            </p>

            <p className="mt-2 text-2xl font-black">
              {stats.applied}
            </p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-slate-500">
              Under review
            </p>

            <p className="mt-2 text-2xl font-black">
              {stats.underReview}
            </p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-slate-500">
              Shortlisted
            </p>

            <p className="mt-2 text-2xl font-black">
              {stats.shortlisted}
            </p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-slate-500">
              Interviews
            </p>

            <p className="mt-2 text-2xl font-black">
              {stats.interviews}
            </p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-slate-500">
              Selected
            </p>

            <p className="mt-2 text-2xl font-black">
              {
                stats.selectedCandidates
              }
            </p>
          </div>
        </div>
      </section>
    </DashboardShell>
  )
}
import { BriefcaseBusiness, Bookmark, FileText, CalendarDays, CreditCard, Settings, Users, Building2, BarChart3, LayoutDashboard, Headphones, BadgeIndianRupee, CheckCircle2 } from 'lucide-react'
import { DashboardShell } from '../components/Layout'
import { StatCard, EmptyState } from '../components/UI'
import InternshipCard from '../components/InternshipCard'
import { useApp } from '../context/AppContext'
import {
  useEffect,
  useState,
} from 'react'
import toast from 'react-hot-toast'
import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  deleteWithdrawnApplication,
  getMyApplications,
  withdrawApplication,
} from '../lib/applicationsApi'
import {
  getSavedInternships,
} from '../lib/savedInternshipsApi'
import {
  getStudentDashboardData,
} from '../lib/studentDashboardApi'
import { useAuth } from '../context/AuthContext'
import {
  getEmployerDashboardData,
} from '../lib/employerInternshipsApi'

import {
  getAdminDashboardData,
} from '../lib/adminDashboardApi'
import {
  usePlatformSettings,
} from '../context/PlatformSettingsContext'
import {
  formatPaymentAmount,
  getMyPaymentOrders,
} from '../lib/paymentsApi'

const studentNav=[['Overview','/student/dashboard',LayoutDashboard],
['Internships','/internships',BriefcaseBusiness],
['Applications','/student/applications',FileText],
['Saved','/student/saved',Bookmark],
['Interviews','/student/interviews',CalendarDays],
['Billing','/student/billing',CreditCard],
['Settings','/student/settings',Settings]]
const employerNav=[['Overview','/employer/dashboard',LayoutDashboard],
['Post internship','/employer/post',BriefcaseBusiness],
['Manage listings','/employer/listings',FileText],
['Applicants','/employer/applicants',Users],
['Analytics','/employer/analytics',BarChart3],
['Billing','/employer/billing',CreditCard],
['Support','/employer/support',Headphones],[
  'Settings',
  '/employer/settings',
  Settings,
]]
const adminNav=[['Overview','/admin/dashboard',LayoutDashboard],['Students','/admin/students',Users],['Employers','/admin/employers',Building2],['Internships','/admin/internships',BriefcaseBusiness],['Payments','/admin/payments',BadgeIndianRupee],['Reports','/admin/reports',BarChart3],['Settings','/admin/settings',Settings]]
function prepareSavedInternship(record) {
  const companyName =
    record.companies?.name ||
    'Company not available'

  const workMode =
    String(
      record.work_mode || ''
    ).toLowerCase()

  const mode =
    workMode === 'remote'
      ? 'Remote'
      : workMode === 'hybrid'
        ? 'Hybrid'
        : workMode === 'onsite'
          ? 'Onsite'
          : 'Not specified'

  return {
    ...record,

    id: String(record.id),

    company: companyName,

    logo:
      companyName
        .slice(0, 2)
        .toUpperCase() || 'IN',

    mode,

    duration: record.duration_months
      ? `${record.duration_months} months`
      : 'Not specified',

    stipend: Number(
      record.stipend_min || 0
    ),

    skills: Array.isArray(
      record.skills_required
    )
      ? record.skills_required
      : [],

    posted: record.published_at
      ? new Date(
          record.published_at
        ).toLocaleDateString()
      : 'Recently',
  }
}
function getDashboardRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || {}
  }

  return value || {}
}

function getDashboardStatusLabel(status) {
  const labels = {
    applied: 'Applied',
    under_review: 'Under review',
    shortlisted: 'Shortlisted',
    interview_scheduled:
      'Interview scheduled',
    selected: 'Selected',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  }

  return labels[status] || status || 'Unknown'
}

function getDashboardStatusClass(status) {
  const classes = {
    applied:
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',

    under_review:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',

    shortlisted:
      'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',

    interview_scheduled:
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',

    selected:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    rejected:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',

    withdrawn:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }

  return (
    classes[status] ||
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  )
}
export function StudentDashboard() {
  const { profile } = useAuth()

  const [dashboard, setDashboard] =
    useState({
      stats: {
        applications: 0,
        saved: 0,
        interviews: 0,
        selected: 0,
      },

      recentApplications: [],
      recommendations: [],
      profileStrength: 0,
    })

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const result =
          await getStudentDashboardData()

        if (!active) {
          return
        }

        setDashboard(result)
      } catch (loadError) {
        console.error(
          'Student dashboard failed:',
          loadError
        )

        if (!active) {
          return
        }

        setError(
          loadError?.message ||
            'Unable to load your dashboard.'
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  const profileStrength = Math.max(
    0,
    Math.min(
      100,
      Number(
        dashboard.profileStrength || 0
      )
    )
  )

  const displayName =
    profile?.full_name ||
    'Student'

  if (loading) {
    return (
      <DashboardShell
        title="Student dashboard"
        navItems={studentNav}
      >
        <div className="space-y-6">
          <div className="h-48 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="card h-32 animate-pulse bg-slate-100 dark:bg-slate-900"
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="card h-80 animate-pulse bg-slate-100 dark:bg-slate-900" />

            <div className="card h-80 animate-pulse bg-slate-100 dark:bg-slate-900" />
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell
        title="Student dashboard"
        navItems={studentNav}
      >
        <EmptyState
          title="Unable to load dashboard"
          text={error}
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              window.location.reload()
            }
          >
            Try again
          </button>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      title="Student dashboard"
      navItems={studentNav}
    >
      <section className="rounded-3xl bg-gradient-to-r from-brand-600 to-violet-600 p-7 text-white">
        <p className="text-sm font-bold text-indigo-100">
          Welcome back
        </p>

        <h2 className="mt-1 text-3xl font-black">
          {displayName}, your next opportunity is closer.
        </h2>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{
              width: `${profileStrength}%`,
            }}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-indigo-100">
          <span>
            Profile strength:{' '}
            <strong>
              {profileStrength}%
            </strong>
          </span>

          {profileStrength < 100 && (
            <Link
              to="/student/settings"
              className="font-semibold text-white hover:underline"
            >
              Complete your profile
            </Link>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Applications"
          value={
            dashboard.stats.applications
          }
          icon={FileText}
        />

        <StatCard
          label="Saved"
          value={dashboard.stats.saved}
          icon={Bookmark}
        />

        <StatCard
          label="Interviews"
          value={
            dashboard.stats.interviews
          }
          icon={CalendarDays}
        />

        <StatCard
          label="Selected"
          value={dashboard.stats.selected}
          icon={CheckCircle2}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">
                Recent applications
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your latest application activity.
              </p>
            </div>

            <Link
              to="/student/applications"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {dashboard.recentApplications
            .length > 0 ? (
            <div className="mt-5 space-y-3">
              {dashboard.recentApplications.map(
                (application) => {
                  const internship =
                    getDashboardRelation(
                      application.internships
                    )

                  const company =
                    getDashboardRelation(
                      internship.companies
                    )

                  return (
                    <div
                      key={application.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
                    >
                      <div>
                        <p className="font-bold">
                          {internship.title ||
                            'Internship unavailable'}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {company.name ||
                            'Company unavailable'}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {application.created_at
                            ? new Date(
                                application.created_at
                              ).toLocaleDateString()
                            : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`badge ${getDashboardStatusClass(
                            application.status
                          )}`}
                        >
                          {getDashboardStatusLabel(
                            application.status
                          )}
                        </span>

                        {application.internship_id && (
                          <Link
                            to={`/internships/${application.internship_id}`}
                            className="btn-secondary"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No applications yet"
                text="Browse internships and submit your first application."
              />
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-xl font-black">
            Profile summary
          </h3>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <span className="text-slate-500">
                College
              </span>

              <strong className="text-right">
                {dashboard.studentProfile
                  ?.college ||
                  'Not added'}
              </strong>
            </div>

            <div className="flex items-center justify-between border-b pb-4">
              <span className="text-slate-500">
                Degree
              </span>

              <strong className="text-right">
                {dashboard.studentProfile
                  ?.degree ||
                  'Not added'}
              </strong>
            </div>

            <div className="flex items-center justify-between border-b pb-4">
              <span className="text-slate-500">
                Skills
              </span>

              <strong className="text-right">
                {Array.isArray(
                  dashboard.studentProfile
                    ?.skills
                ) &&
                dashboard.studentProfile
                  .skills.length > 0
                  ? dashboard.studentProfile.skills
                      .slice(0, 3)
                      .join(', ')
                  : 'Not added'}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                Resume
              </span>

              <strong>
                {dashboard.studentProfile
                  ?.primary_resume_path
                  ? 'Uploaded'
                  : 'Not uploaded'}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">
              Recommended for you
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Based on your skills and preferences.
            </p>
          </div>

          <Link
            to="/internships"
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Browse all
          </Link>
        </div>

        {dashboard.recommendations.length >
        0 ? (
          <div className="grid gap-5 xl:grid-cols-3">
            {dashboard.recommendations.map(
              (internship) => (
                <InternshipCard
                  item={internship}
                  key={internship.id}
                />
              )
            )}
          </div>
        ) : (
          <EmptyState
            title="No recommendations available"
            text="Add more skills and preferences, or check again when new internships are approved."
          />
        )}
      </section>
    </DashboardShell>
  )
}
function formatApplicationStatus(status) {
  const labels = {
    applied: 'Applied',
    under_review: 'Under review',
    shortlisted: 'Shortlisted',
    interview_scheduled:
      'Interview scheduled',
    selected: 'Selected',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  }

  return labels[status] || status
}

function getApplicationStatusClass(status) {
  const classes = {
    applied:
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',

    under_review:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',

    shortlisted:
      'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',

    interview_scheduled:
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',

    selected:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    rejected:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',

    withdrawn:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }

  return (
    classes[status] ||
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  ) 
}

function canWithdrawApplication(status) {
  return [
    'applied',
    'under_review',
    'shortlisted',
  ].includes(status)
}
export function StudentApplications() {
  const navigate = useNavigate()
  const {
    applicationWithdrawalEnabled,
  } = usePlatformSettings()
  const [applications, setApplications] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    withdrawingApplicationId,
    setWithdrawingApplicationId,
  ] = useState(null)

  const [
    deletingApplicationId,
    setDeletingApplicationId,
  ] = useState(null)

  useEffect(() => {
    let active = true

    async function loadApplications() {
      try {
        setLoading(true)
        setError('')

        const records =
          await getMyApplications()

        if (!active) return

        setApplications(records)
      } catch (loadError) {
        console.error(
          'Unable to load applications:',
          loadError
        )

        if (!active) return

        setError(
          loadError?.message ||
            'Unable to load applications.'
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadApplications()

    return () => {
      active = false
    }
  }, [])

  async function handleWithdraw(
    application
  ) {
    const confirmed = window.confirm(
      'Withdraw this application?'
    )

    if (!confirmed) {
      return
    }

    try {
      setWithdrawingApplicationId(
        application.id
      )

      const updatedApplication =
        await withdrawApplication(
          application.id
        )

      setApplications((current) =>
        current.map((record) =>
          record.id === application.id
            ? {
                ...record,
                status:
                  updatedApplication.status,
                updated_at:
                  updatedApplication.updated_at,
              }
            : record
        )
      )

      toast.success(
        'Application withdrawn.'
      )
    } catch (withdrawError) {
      console.error(
        'Unable to withdraw application:',
        withdrawError
      )

      toast.error(
        withdrawError?.message ||
          'Unable to withdraw application.'
      )
    } finally {
      setWithdrawingApplicationId(
        null
      )
    }
  }

  async function handleDeleteWithdrawn(
    application
  ) {
    const confirmed = window.confirm(
      'Delete this withdrawn application?'
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingApplicationId(
        application.id
      )

      await deleteWithdrawnApplication(
        application.id
      )

      setApplications((current) =>
        current.filter(
          (record) =>
            record.id !== application.id
        )
      )

      toast.success(
        'Withdrawn application deleted.'
      )
    } catch (deleteError) {
      console.error(
        'Unable to delete application:',
        deleteError
      )

      toast.error(
        deleteError?.message ||
          'Unable to delete application.'
      )
    } finally {
      setDeletingApplicationId(null)
    }
  }

  if (loading) {
    return (
      <DashboardShell
        title="My applications"
        navItems={studentNav}
      >
        <div className="card">
          <div className="space-y-4">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell
        title="My applications"
        navItems={studentNav}
      >
        <EmptyState
          title="Unable to load applications"
          text={error}
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              window.location.reload()
            }
          >
            Try again
          </button>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      title="My applications"
      navItems={studentNav}
    >
      {applications.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="text-sm text-slate-500">
                <th className="pb-4">
                  Role
                </th>

                <th className="pb-4">
                  Company
                </th>

                <th className="pb-4">
                  Status
                </th>

                <th className="pb-4">
                  Applied
                </th>

                <th className="pb-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {applications.map(
                (application) => {
                  const internship = Array.isArray(
  application.internships
)
  ? application.internships[0] || {}
  : application.internships || {}

const company = Array.isArray(
  internship.companies
)
  ? internship.companies[0] || {}
  : internship.companies || {}

                  const withdrawing =
                    withdrawingApplicationId ===
                    application.id

                  const deleting =
                    deletingApplicationId ===
                    application.id

                  return (
                    <tr
                      className="border-t"
                      key={application.id}
                    >
                      <td className="py-4">
                        <div>
                          <p className="font-bold">
                            {internship.title ||
                              'Internship unavailable'}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {internship.location ||
                              'Location not specified'}
                          </p>
                        </div>
                      </td>

                      <td className="py-4">
                        {company.name ||
                          'Company unavailable'}
                      </td>

                      <td className="py-4">
                        <span
                          className={`badge ${getApplicationStatusClass(
                            application.status
                          )}`}
                        >
                          {formatApplicationStatus(
                            application.status
                          )}
                        </span>
                      </td>

                      <td className="py-4">
                        {application.created_at
                          ? new Date(
                              application.created_at
                            ).toLocaleDateString()
                          : '—'}
                      </td>

                      <td className="py-4">
                        <div className="flex gap-2">
                          {internship.id && (
                            <button
  type="button"
  className="btn-secondary"
  disabled={
    !application.internship_id &&
    !internship.id
  }
  onClick={() => {
    const internshipId =
      application.internship_id ||
      internship.id

    if (!internshipId) {
      toast.error(
        'Internship information is unavailable.'
      )
      return
    }

    navigate(
      `/internships/${internshipId}`
    )
  }}
>
  View
</button>
                          )}

                          {canWithdrawApplication(
                            application.status
                          ) &&
                            applicationWithdrawalEnabled && (
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={withdrawing}
                              onClick={() =>
                                handleWithdraw(
                                  application
                                )
                              }
                            >
                              {withdrawing
                                ? 'Withdrawing…'
                                : 'Withdraw'}
                            </button>
                          )}

                          {canWithdrawApplication(
                            application.status
                          ) &&
                            !applicationWithdrawalEnabled && (
                              <span className="text-sm font-semibold text-amber-600">
                                Withdrawals disabled
                              </span>
                            )}

                          {application.status ===
                            'withdrawn' && (
                            <button
                              type="button"
                              className="btn-secondary text-red-600"
                              disabled={deleting}
                              onClick={() =>
                                handleDeleteWithdrawn(
                                  application
                                )
                              }
                            >
                              {deleting
                                ? 'Deleting...'
                                : 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                }
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No applications yet"
          text="Apply for an internship and track its progress here."
        />
      )}
    </DashboardShell>
  )
}
export function Saved() {
  const {
    saved,
    savedLoading,
  } = useApp()

  const [rows, setRows] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    async function loadSaved() {
      try {
        setLoading(true)
        setError('')

        const records =
          await getSavedInternships()

        if (!active) return

        setRows(
          records.map(
            prepareSavedInternship
          )
        )
      } catch (loadError) {
        console.error(
          'Unable to load saved internships:',
          loadError
        )

        if (!active) return

        setError(
          loadError?.message ||
            'Unable to load saved internships.'
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSaved()

    return () => {
      active = false
    }
  }, [])

  const visibleRows = rows.filter(
    (internship) =>
      saved.includes(
        String(internship.id)
      )
  )

  if (loading || savedLoading) {
    return (
      <DashboardShell
        title="Saved internships"
        navItems={studentNav}
      >
        <div className="grid gap-5 xl:grid-cols-2">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="card h-72 animate-pulse bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell
        title="Saved internships"
        navItems={studentNav}
      >
        <EmptyState
          title="Unable to load saved internships"
          text={error}
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              window.location.reload()
            }
          >
            Try again
          </button>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      title="Saved internships"
      navItems={studentNav}
    >
      {visibleRows.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {visibleRows.map(
            (internship) => (
              <InternshipCard
                item={internship}
                key={internship.id}
              />
            )
          )}
        </div>
      ) : (
        <EmptyState
          title="No saved internships"
          text="Bookmark internships to build a focused application list."
        />
      )}
    </DashboardShell>
  )
}

function formatBillingDate(value) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (
    Number.isNaN(date.getTime())
  ) {
    return String(value)
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      dateStyle: 'medium',
    }
  ).format(date)
}

function getPaymentStatusClass(status) {
  const classes = {
    paid: 'text-emerald-600',
    created: 'text-sky-600',
    initiated: 'text-slate-500',
    failed: 'text-rose-600',
    cancelled: 'text-amber-600',
  }

  return (
    classes[status] ||
    'text-slate-500'
  )
}

export function Billing() {
  const [payments, setPayments] =
    useState([])
  const [loading, setLoading] =
    useState(true)
  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    async function loadPayments() {
      try {
        setLoading(true)
        setError('')

        const records =
          await getMyPaymentOrders()

        if (!active) {
          return
        }

        setPayments(records)
      } catch (loadError) {
        console.error(
          'Unable to load payment history:',
          loadError
        )

        if (!active) {
          return
        }

        setError(
          loadError?.message ||
            'Unable to load payment history.'
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPayments()

    return () => {
      active = false
    }
  }, [])

  const paidPayments =
    payments.filter(
      (payment) =>
        payment.status === 'paid'
    )

  const latestPaidPlan =
    paidPayments[0] || null

  return (
    <DashboardShell
      title="Payments and billing"
      navItems={studentNav}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="text-xl font-black">
            Payment history
          </h3>

          {loading ? (
            <div className="mt-5 space-y-3">
              {Array.from({
                length: 3,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-5">
              <EmptyState
                title="Unable to load payments"
                text={error}
              />
            </div>
          ) : payments.length > 0 ? (
            <div className="mt-5 space-y-3">
              {payments.map((payment) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
                  key={payment.id}
                >
                  <div>
                    <b>{payment.plan_name}</b>

                    <p className="text-sm text-slate-500">
                      {payment.receipt} -{' '}
                      {formatBillingDate(
                        payment.paid_at ||
                          payment.created_at
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <b>
                      {formatPaymentAmount(
                        payment.amount,
                        payment.currency
                      )}
                    </b>

                    <p
                      className={`text-sm capitalize ${getPaymentStatusClass(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="No payments yet"
                text="Completed Razorpay payments will appear here."
              />
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-black">
            Current plan
          </h3>

          {latestPaidPlan ? (
            <>
              <p className="mt-2 text-lg font-black">
                {latestPaidPlan.plan_name}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Paid on{' '}
                {formatBillingDate(
                  latestPaidPlan.paid_at
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No paid plan is active yet.
            </p>
          )}

          <Link
            to="/pricing"
            className="btn-primary mt-5 w-full"
          >
            View plans
          </Link>
        </div>
      </div>
    </DashboardShell>
  )
}

function normalizeEmployerRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || {}
  }

  return value || {}
}

function formatEmployerStatus(status) {
  const labels = {
    draft: 'Draft',
    pending: 'Pending review',
    approved: 'Approved',
    rejected: 'Rejected',
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

  return labels[status] || status || 'Unknown'
}

function getEmployerStatusClass(status) {
  const classes = {
    approved:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    selected:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    pending:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',

    under_review:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',

    shortlisted:
      'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',

    interview_scheduled:
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',

    applied:
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',

    rejected:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',

    draft:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',

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

export function EmployerDashboard() {
  const [dashboard, setDashboard] =
    useState({
      company: null,
      internships: [],
      recentInternships: [],
      recentApplications: [],

      stats: {
        totalInternships: 0,
        activeInternships: 0,
        pendingInternships: 0,
        totalApplications: 0,
        shortlisted: 0,
        selected: 0,
      },
    })

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const result =
          await getEmployerDashboardData()

        if (!active) {
          return
        }

        setDashboard(result)
      } catch (loadError) {
        console.error(
          'Employer dashboard failed:',
          loadError
        )

        if (!active) {
          return
        }

        setError(
          loadError?.message ||
            'Unable to load the employer dashboard.'
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <DashboardShell
        title="Employer dashboard"
        navItems={employerNav}
      >
        <div className="space-y-6">
          <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="card h-32 animate-pulse bg-slate-100 dark:bg-slate-900"
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="card h-80 animate-pulse bg-slate-100 dark:bg-slate-900" />

            <div className="card h-80 animate-pulse bg-slate-100 dark:bg-slate-900" />
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell
        title="Employer dashboard"
        navItems={employerNav}
      >
        <EmptyState
          title="Unable to load dashboard"
          text={error}
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              window.location.reload()
            }
          >
            Try again
          </button>
        </div>
      </DashboardShell>
    )
  }

  const company = dashboard.company

  return (
    <DashboardShell
      title="Employer dashboard"
      navItems={employerNav}
    >
      {company ? (
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-brand-900 p-7 text-white">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-bold text-indigo-200">
                Company workspace
              </p>

              <h2 className="mt-1 text-3xl font-black">
                {company.name}
              </h2>

              <p className="mt-2 text-sm text-slate-300">
                Manage internships and review candidates from one dashboard.
              </p>
            </div>

            <span
              className={`badge ${getEmployerStatusClass(
                company.status
              )}`}
            >
              Company:{' '}
              {formatEmployerStatus(
                company.status
              )}
            </span>
          </div>

          {company.status === 'pending' && (
            <p className="mt-5 rounded-2xl bg-amber-400/10 p-4 text-sm text-amber-100">
              Your company is awaiting admin approval. You can prepare internship drafts, but public publishing requires approval.
            </p>
          )}

          {company.status === 'rejected' && (
            <p className="mt-5 rounded-2xl bg-red-400/10 p-4 text-sm text-red-100">
              Company verification was rejected.
              {company.rejection_reason
                ? ` Reason: ${company.rejection_reason}`
                : ''}
            </p>
          )}
        </section>
      ) : (
        <div className="card">
          <EmptyState
            title="Company profile not found"
            text="Complete employer onboarding before posting internships."
          />
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total listings"
          value={
            dashboard.stats.totalInternships
          }
          icon={BriefcaseBusiness}
        />

        <StatCard
          label="Active listings"
          value={
            dashboard.stats.activeInternships
          }
          icon={CheckCircle2}
        />

        <StatCard
          label="Applicants"
          value={
            dashboard.stats.totalApplications
          }
          icon={Users}
        />

        <StatCard
          label="Shortlisted"
          value={
            dashboard.stats.shortlisted
          }
          icon={FileText}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">
                Recent listings
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your latest internship postings.
              </p>
            </div>

            <Link
              to="/employer/listings"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              Manage all
            </Link>
          </div>

          {dashboard.recentInternships
            .length > 0 ? (
            <div className="mt-5 space-y-3">
              {dashboard.recentInternships.map(
                (internship) => (
                  <div
                    key={internship.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
                  >
                    <div>
                      <p className="font-bold">
                        {internship.title}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {internship.location ||
                          'Location not specified'}{' '}
                        ·{' '}
                        {internship.work_mode ||
                          'Mode not specified'}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Deadline:{' '}
                        {internship.deadline
                          ? new Date(
                              internship.deadline
                            ).toLocaleDateString()
                          : 'Not set'}
                      </p>
                    </div>

                    <span
                      className={`badge ${getEmployerStatusClass(
                        internship.status
                      )}`}
                    >
                      {formatEmployerStatus(
                        internship.status
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No internships posted"
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">
                Recent applicants
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Latest applications across your listings.
              </p>
            </div>

            <Link
              to="/employer/applicants"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {dashboard.recentApplications
            .length > 0 ? (
            <div className="mt-5 space-y-3">
              {dashboard.recentApplications.map(
                (application) => {
                  const internship =
                    normalizeEmployerRelation(
                      application.internships
                    )

                  return (
                    <div
                      key={application.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
                    >
                      <div>
                        <p className="font-bold">
                          {internship.title ||
                            'Internship unavailable'}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Applied:{' '}
                          {application.created_at
                            ? new Date(
                                application.created_at
                              ).toLocaleDateString()
                            : '—'}
                        </p>
                      </div>

                      <span
                        className={`badge ${getEmployerStatusClass(
                          application.status
                        )}`}
                      >
                        {formatEmployerStatus(
                          application.status
                        )}
                      </span>
                    </div>
                  )
                }
              )}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No applicants yet"
                text="Applications will appear after students apply to your internships."
              />
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">
            Pending listings
          </p>

          <p className="mt-2 text-3xl font-black">
            {dashboard.stats
              .pendingInternships}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Selected candidates
          </p>

          <p className="mt-2 text-3xl font-black">
            {dashboard.stats.selected}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Company verification
          </p>

          <p className="mt-2 text-lg font-black capitalize">
            {company?.status ||
              'Unavailable'}
          </p>
        </div>
      </section>
    </DashboardShell>
  )
}

function normalizeAdminRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || {}
  }

  return value || {}
}

export function AdminDashboard() {
  const [dashboard, setDashboard] =
    useState({
      stats: {
        students: 0,
        activeStudents: 0,
        suspendedStudents: 0,
        employers: 0,
        companies: 0,
        pendingCompanies: 0,
        approvedCompanies: 0,
        internships: 0,
        pendingInternships: 0,
        approvedInternships: 0,
        applications: 0,
        selectedCandidates: 0,
      },

      recentPendingCompanies: [],
      recentPendingInternships: [],
    })

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')

      const result =
        await getAdminDashboardData()

      setDashboard(result)
    } catch (loadError) {
      console.error(
        'Unable to load admin dashboard:',
        loadError
      )

      setError(
        loadError?.message ||
          'Unable to load admin dashboard.'
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
        title="Platform administration"
        navItems={adminNav}
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
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell
        title="Platform administration"
        navItems={adminNav}
      >
        <EmptyState
          title="Unable to load dashboard"
          text={error}
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

  const stats = dashboard.stats

  return (
    <DashboardShell
      title="Platform administration"
      navItems={adminNav}
    >
      <section className="rounded-3xl bg-gradient-to-r from-slate-950 to-brand-900 p-7 text-white">
        <p className="text-sm font-bold text-indigo-200">
          Admin overview
        </p>

        <h2 className="mt-1 text-3xl font-black">
          InternNext platform activity
        </h2>

        <p className="mt-2 text-sm text-slate-300">
          Monitor users, approvals,
          internships and applications.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={stats.students}
          icon={Users}
        />

        <StatCard
          label="Employers"
          value={stats.employers}
          icon={Building2}
        />

        <StatCard
          label="Internships"
          value={stats.internships}
          icon={BriefcaseBusiness}
        />

        <StatCard
          label="Applications"
          value={stats.applications}
          icon={FileText}
        />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active students"
          value={stats.activeStudents}
          icon={CheckCircle2}
        />

        <StatCard
          label="Suspended students"
          value={stats.suspendedStudents}
          icon={Users}
        />

        <StatCard
          label="Pending companies"
          value={stats.pendingCompanies}
          icon={Building2}
        />

        <StatCard
          label="Pending internships"
          value={stats.pendingInternships}
          icon={CalendarDays}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">
                Pending companies
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Employer profiles waiting for review.
              </p>
            </div>

            <Link
              to="/admin/employers"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              Review all
            </Link>
          </div>

          {dashboard.recentPendingCompanies
            .length > 0 ? (
            <div className="mt-5 space-y-3">
              {dashboard.recentPendingCompanies.map(
                (company) => (
                  <div
                    key={company.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
                  >
                    <div>
                      <p className="font-bold">
                        {company.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {company.industry ||
                          'Industry not provided'}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Submitted:{' '}
                        {company.created_at
                          ? new Date(
                              company.created_at
                            ).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>

                    <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      Pending
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No pending companies"
                text="All company submissions have been reviewed."
              />
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">
                Pending internships
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Internship listings waiting for approval.
              </p>
            </div>

            <Link
              to="/admin/internships"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              Review all
            </Link>
          </div>

          {dashboard.recentPendingInternships
            .length > 0 ? (
            <div className="mt-5 space-y-3">
              {dashboard.recentPendingInternships.map(
                (internship) => {
                  const company =
                    normalizeAdminRelation(
                      internship.companies
                    )

                  return (
                    <div
                      key={internship.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
                    >
                      <div>
                        <p className="font-bold">
                          {internship.title}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {company.name ||
                            'Company unavailable'}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Submitted:{' '}
                          {internship.created_at
                            ? new Date(
                                internship.created_at
                              ).toLocaleDateString()
                            : '—'}
                        </p>
                      </div>

                      <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        Pending
                      </span>
                    </div>
                  )
                }
              )}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No pending internships"
                text="All internship submissions have been reviewed."
              />
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">
            Companies
          </p>

          <p className="mt-2 text-3xl font-black">
            {stats.companies}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {stats.approvedCompanies}{' '}
            approved
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Approved internships
          </p>

          <p className="mt-2 text-3xl font-black">
            {stats.approvedInternships}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Selected candidates
          </p>

          <p className="mt-2 text-3xl font-black">
            {stats.selectedCandidates}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Pending approvals
          </p>

          <p className="mt-2 text-3xl font-black">
            {stats.pendingCompanies +
              stats.pendingInternships}
          </p>
        </div>
      </section>
    </DashboardShell>
  )
}

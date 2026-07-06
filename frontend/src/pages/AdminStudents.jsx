import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react'

import toast from 'react-hot-toast'

import {
  DashboardShell,
} from '../components/Layout'

import {
  EmptyState,
  StatCard,
} from '../components/UI'

import {
  getAdminStudents,
  updateStudentAccountStatus,
} from '../lib/adminStudentsApi'

const adminNav = [
  [
    'Overview',
    '/admin/dashboard',
    LayoutDashboard,
  ],
  [
    'Students',
    '/admin/students',
    Users,
  ],
  [
    'Employers',
    '/admin/employers',
    Building2,
  ],
  [
    'Internships',
    '/admin/internships',
    BriefcaseBusiness,
  ],
  [
    'Payments',
    '/admin/payments',
    CreditCard,
  ],
  [
    'Reports',
    '/admin/reports',
    BarChart3,
  ],
  [
    'Settings',
    '/admin/settings',
    Settings,
  ],
]

function getAccountStatus(student) {
  return student.account_status || 'active'
}

function formatStatus(status) {
  const labels = {
    active: 'Active',
    suspended: 'Suspended',
  }

  return labels[status] || status || 'Unknown'
}

function getStatusClass(status) {
  const classes = {
    active:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    suspended:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
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

export default function AdminStudents() {
  const [students, setStudents] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    updatingStudentId,
    setUpdatingStudentId,
  ] = useState(null)

  async function loadStudents() {
    try {
      setLoading(true)
      setError('')

      const records =
        await getAdminStudents()

      setStudents(records)
    } catch (loadError) {
      console.error(
        'Unable to load students:',
        loadError
      )

      setError(
        loadError?.message ||
          'Unable to load students.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const stats = useMemo(() => {
    return {
      total: students.length,

      active:
        students.filter(
          (student) =>
            getAccountStatus(student) ===
            'active'
        ).length,

      suspended:
        students.filter(
          (student) =>
            getAccountStatus(student) ===
            'suspended'
        ).length,

      completed:
        students.filter(
          (student) =>
            student.onboarding_completed
        ).length,
    }
  }, [students])

  async function handleStatusChange(
    student,
    nextStatus
  ) {
    const currentStatus =
      getAccountStatus(student)

    if (currentStatus === nextStatus) {
      return
    }

    const action =
      nextStatus === 'suspended'
        ? 'suspend'
        : 'reactivate'

    const confirmed =
      window.confirm(
        `${action === 'suspend' ? 'Suspend' : 'Reactivate'} ${student.full_name || student.email}?`
      )

    if (!confirmed) {
      return
    }

    try {
      setUpdatingStudentId(
        student.id
      )

      const updated =
        await updateStudentAccountStatus(
          student.id,
          nextStatus
        )

      setStudents((current) =>
        current.map((record) =>
          record.id === student.id
            ? {
                ...record,
                account_status:
                  updated.account_status,
                updated_at:
                  updated.updated_at,
              }
            : record
        )
      )

      toast.success(
        nextStatus === 'suspended'
          ? 'Student account suspended.'
          : 'Student account reactivated.'
      )
    } catch (updateError) {
      console.error(
        'Unable to update student:',
        updateError
      )

      toast.error(
        updateError?.message ||
          'Unable to update student.'
      )
    } finally {
      setUpdatingStudentId(null)
    }
  }

  if (loading) {
    return (
      <DashboardShell
        title="Students"
        navItems={adminNav}
      >
        <div className="card">
          <div className="flex min-h-72 items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell
        title="Students"
        navItems={adminNav}
      >
        <EmptyState
          title="Unable to load students"
          text={error}
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={loadStudents}
          >
            Try again
          </button>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      title="Students"
      navItems={adminNav}
    >
      <div>
        <h2 className="text-2xl font-black">
          Student accounts
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review student profiles and manage
          account access.
        </p>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total students"
          value={stats.total}
          icon={Users}
        />

        <StatCard
          label="Active"
          value={stats.active}
          icon={CheckCircle2}
        />

        <StatCard
          label="Suspended"
          value={stats.suspended}
          icon={ShieldAlert}
        />

        <StatCard
          label="Onboarding complete"
          value={stats.completed}
          icon={FileText}
        />
      </section>

      {students.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            title="No students found"
            text="Registered student accounts will appear here."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {students.map((student) => {
            const details =
              student.student_profile || {}

            const status =
              getAccountStatus(student)

            const updating =
              updatingStudentId ===
              student.id

            return (
              <article
                key={student.id}
                className="card"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-black">
                        {student.full_name ||
                          'Student'}
                      </h3>

                      <span
                        className={`badge ${getStatusClass(
                          status
                        )}`}
                      >
                        {formatStatus(status)}
                      </span>

                      {student.email_verified && (
                        <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          Email verified
                        </span>
                      )}
                    </div>

                    <p className="mt-1 break-all text-sm text-slate-500">
                      {student.email ||
                        'Email unavailable'}
                    </p>
                  </div>

                  <div>
                    {status === 'active' ? (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() =>
                          handleStatusChange(
                            student,
                            'suspended'
                          )
                        }
                        className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updating
                          ? 'Updating…'
                          : 'Suspend account'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() =>
                          handleStatusChange(
                            student,
                            'active'
                          )
                        }
                        className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updating
                          ? 'Updating…'
                          : 'Reactivate account'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      College
                    </p>

                    <p className="mt-1 font-semibold">
                      {details.college ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Degree
                    </p>

                    <p className="mt-1 font-semibold">
                      {details.degree ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Specialization
                    </p>

                    <p className="mt-1 font-semibold">
                      {details.specialization ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Passing year
                    </p>

                    <p className="mt-1 font-semibold">
                      {details.passing_year ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Phone
                    </p>

                    <p className="mt-1 font-semibold">
                      {student.phone ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Resume
                    </p>

                    <p className="mt-1 font-semibold">
                      {details.primary_resume_path
                        ? 'Uploaded'
                        : 'Not uploaded'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Onboarding
                    </p>

                    <p className="mt-1 font-semibold">
                      {student.onboarding_completed
                        ? 'Completed'
                        : 'Incomplete'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Registered
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatDate(
                        student.created_at
                      )}
                    </p>
                  </div>
                </div>

                {Array.isArray(
                  details.skills
                ) &&
                  details.skills.length >
                    0 && (
                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Skills
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {details.skills.map(
                          (skill) => (
                            <span
                              key={skill}
                              className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {skill}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {details.bio && (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Bio
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                      {details.bio}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  {details.linkedin_url && (
                    <a
                      href={
                        details.linkedin_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                    >
                      LinkedIn
                    </a>
                  )}

                  {details.github_url && (
                    <a
                      href={details.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                    >
                      GitHub
                    </a>
                  )}

                  {details.portfolio_url && (
                    <a
                      href={
                        details.portfolio_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                    >
                      Portfolio
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </DashboardShell>
  )
}
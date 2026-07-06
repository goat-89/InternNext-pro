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
  Send,
  Users,
} from 'lucide-react'

import {
  Link,
} from 'react-router-dom'

import toast from 'react-hot-toast'

import {
  DashboardShell,
} from '../components/Layout'

import {
  EmptyState,
  StatCard,
} from '../components/UI'

import {
  getEmployerInternships,
  submitInternshipForReview,
  updateEmployerInternshipLifecycle,
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

function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || {}
  }

  return value || {}
}

function formatStatus(status) {
  const labels = {
    draft: 'Draft',
    pending: 'Pending approval',
    approved: 'Approved',
    rejected: 'Rejected',
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
    draft:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',

    pending:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',

    approved:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    rejected:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',

    paused:
      'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',

    closed:
      'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  }

  return (
    classes[status] ||
    'bg-slate-100 text-slate-700'
  )
}

function canSubmitForApproval(status) {
  return [
    'draft',
    'rejected',
  ].includes(status)
}

function formatWorkMode(value) {
  const modes = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
  }

  return modes[value] || value || '—'
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(
    `${value}T00:00:00`
  )

  if (
    Number.isNaN(date.getTime())
  ) {
    return value
  }

  return date.toLocaleDateString()
}

export default function EmployerListings() {
  const [
    internships,
    setInternships,
  ] = useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    submittingId,
    setSubmittingId,
  ] = useState(null)

  const [
    lifecycleUpdate,
    setLifecycleUpdate,
  ] = useState({
    internshipId: null,
    action: null,
  })

  async function loadInternships() {
    try {
      setLoading(true)
      setError('')

      const records =
        await getEmployerInternships()

      setInternships(records)
    } catch (loadError) {
      console.error(
        'Unable to load employer internships:',
        loadError
      )

      setError(
        loadError?.message ||
          'Unable to load internships.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInternships()
  }, [])

  const stats = useMemo(() => {
    return {
      total: internships.length,

      approved:
        internships.filter(
          (internship) =>
            internship.status ===
            'approved'
        ).length,

      pending:
        internships.filter(
          (internship) =>
            internship.status ===
            'pending'
        ).length,

      drafts:
        internships.filter(
          (internship) =>
            internship.status ===
            'draft'
        ).length,
    }
  }, [internships])

  async function handleSubmitForApproval(
    internship
  ) {
    const confirmed =
      window.confirm(
        `Submit "${internship.title}" for admin approval?`
      )

    if (!confirmed) {
      return
    }

    try {
      setSubmittingId(
        internship.id
      )

      const updatedInternship =
        await submitInternshipForReview(
          internship.id
        )

      setInternships((current) =>
        current.map((record) =>
          record.id === internship.id
            ? {
                ...record,
                status:
                  updatedInternship.status,
                rejection_reason: null,
                updated_at:
                  updatedInternship.updated_at,
              }
            : record
        )
      )

      toast.success(
        'Internship submitted for approval.'
      )
    } catch (submitError) {
      console.error(
        'Unable to submit internship:',
        submitError
      )

      toast.error(
        submitError?.message ||
          'Unable to submit internship.'
      )
    } finally {
      setSubmittingId(null)
    }
  }

  async function handleLifecycleAction(
    internship,
    action
  ) {
    const labels = {
      pause: 'pause',
      resume:
        'submit for approval again',
      close: 'close permanently',
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to ${labels[action]} "${internship.title}"?`
      )

    if (!confirmed) {
      return
    }

    try {
      setLifecycleUpdate({
        internshipId: internship.id,
        action,
      })

      const updated =
        await updateEmployerInternshipLifecycle(
          internship.id,
          action
        )

      setInternships((current) =>
        current.map((item) =>
          item.id === internship.id
            ? {
                ...item,
                status: updated.status,
                updated_at:
                  updated.updated_at,
              }
            : item
        )
      )

      const successMessages = {
        pause:
          'Internship paused successfully.',

        resume:
          'Internship submitted for approval again.',

        close:
          'Internship closed successfully.',
      }

      toast.success(
        successMessages[action]
      )
    } catch (actionError) {
      console.error(
        'Unable to update internship:',
        actionError
      )

      toast.error(
        actionError?.message ||
          'Unable to update internship.'
      )
    } finally {
      setLifecycleUpdate({
        internshipId: null,
        action: null,
      })
    }
  }

  if (loading) {
    return (
      <DashboardShell
        title="Manage listings"
        navItems={employerNav}
      >
        <div className="space-y-5">
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

          <div className="card">
            <div className="flex min-h-64 items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell
        title="Manage listings"
        navItems={employerNav}
      >
        <EmptyState
          title="Unable to load listings"
          text={error}
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={
              loadInternships
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
      title="Manage listings"
      navItems={employerNav}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">
            Your internships
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage drafts, approval status
            and active listings.
          </p>
        </div>

        <Link
          to="/employer/post"
          className="btn-primary"
        >
          Post internship
        </Link>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total listings"
          value={stats.total}
          icon={BriefcaseBusiness}
        />

        <StatCard
          label="Approved"
          value={stats.approved}
          icon={CheckCircle2}
        />

        <StatCard
          label="Pending"
          value={stats.pending}
          icon={CalendarDays}
        />

        <StatCard
          label="Drafts"
          value={stats.drafts}
          icon={FileText}
        />
      </section>

      {internships.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            title="No internships created"
            text="Create your first internship listing."
          />

          <div className="mt-6 text-center">
            <Link
              to="/employer/post"
              className="btn-primary"
            >
              Post internship
            </Link>
          </div>
        </div>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="text-sm text-slate-500">
                <th className="pb-4">
                  Internship
                </th>

                <th className="pb-4">
                  Work mode
                </th>

                <th className="pb-4">
                  Openings
                </th>

                <th className="pb-4">
                  Deadline
                </th>

                <th className="pb-4">
                  Status
                </th>

                <th className="pb-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {internships.map(
                (internship) => {
                  const company =
                    normalizeRelation(
                      internship.companies
                    )

                  const submitting =
                    submittingId ===
                    internship.id

                  const lifecycleBusy =
                    lifecycleUpdate.internshipId ===
                    internship.id

                  return (
                    <tr
                      key={internship.id}
                      className="border-t align-top"
                    >
                      <td className="py-5 pr-5">
                        <p className="font-bold">
                          {internship.title}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {company.name ||
                            'Company'}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {internship.category ||
                            'No category'}{' '}
                          ·{' '}
                          {internship.location ||
                            'No location'}
                        </p>

                        {internship.status ===
                          'rejected' &&
                          internship.rejection_reason && (
                            <p className="mt-3 max-w-md rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                              Rejection reason:{' '}
                              {
                                internship.rejection_reason
                              }
                            </p>
                          )}
                      </td>

                      <td className="py-5 pr-5">
                        {formatWorkMode(
                          internship.work_mode
                        )}
                      </td>

                      <td className="py-5 pr-5">
                        {internship.openings ??
                          1}
                      </td>

                      <td className="py-5 pr-5">
                        {formatDate(
                          internship.deadline
                        )}
                      </td>

                      <td className="py-5 pr-5">
                        <span
                          className={`badge ${getStatusClass(
                            internship.status
                          )}`}
                        >
                          {formatStatus(
                            internship.status
                          )}
                        </span>
                      </td>

                      <td className="py-5">
                        <div className="flex flex-wrap gap-2">
                          {internship.status ===
                            'approved' && (
                            <Link
                              to={`/internships/${internship.id}`}
                              className="btn-secondary"
                            >
                              View
                            </Link>
                          )}

                          {canSubmitForApproval(
                            internship.status
                          ) && (
                            <Link
                              to={`/employer/listings/${internship.id}/edit`}
                              className="btn-secondary"
                            >
                              Edit
                            </Link>
                          )}

                          {canSubmitForApproval(
                            internship.status
                          ) && (
                            <button
                              type="button"
                              disabled={
                                submitting ||
                                lifecycleBusy
                              }
                              onClick={() =>
                                handleSubmitForApproval(
                                  internship
                                )
                              }
                              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {submitting ? (
                                <>
                                  <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />
                                  Submitting…
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 inline h-4 w-4" />
                                  Submit for approval
                                </>
                              )}
                            </button>
                          )}

                          {internship.status ===
                            'approved' && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  lifecycleBusy ||
                                  submitting
                                }
                                onClick={() =>
                                  handleLifecycleAction(
                                    internship,
                                    'pause'
                                  )
                                }
                                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {lifecycleBusy &&
                                lifecycleUpdate.action ===
                                  'pause'
                                  ? 'Pausing…'
                                  : 'Pause'}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  lifecycleBusy ||
                                  submitting
                                }
                                onClick={() =>
                                  handleLifecycleAction(
                                    internship,
                                    'close'
                                  )
                                }
                                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {lifecycleBusy &&
                                lifecycleUpdate.action ===
                                  'close'
                                  ? 'Closing…'
                                  : 'Close'}
                              </button>
                            </>
                          )}

                          {internship.status ===
                            'paused' && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  lifecycleBusy ||
                                  submitting
                                }
                                onClick={() =>
                                  handleLifecycleAction(
                                    internship,
                                    'resume'
                                  )
                                }
                                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {lifecycleBusy &&
                                lifecycleUpdate.action ===
                                  'resume'
                                  ? 'Submitting…'
                                  : 'Resume for approval'}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  lifecycleBusy ||
                                  submitting
                                }
                                onClick={() =>
                                  handleLifecycleAction(
                                    internship,
                                    'close'
                                  )
                                }
                                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {lifecycleBusy &&
                                lifecycleUpdate.action ===
                                  'close'
                                  ? 'Closing…'
                                  : 'Close'}
                              </button>
                            </>
                          )}

                          {internship.status ===
                            'pending' && (
                            <span className="self-center text-sm text-slate-500">
                              Awaiting admin review
                            </span>
                          )}

                          {internship.status ===
                            'closed' && (
                            <span className="self-center text-sm text-slate-500">
                              Listing closed
                            </span>
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
      )}
    </DashboardShell>
  )
}
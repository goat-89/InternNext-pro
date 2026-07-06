import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import {
  approveInternship,
  getAdminInternships,
  rejectInternship,
} from '../lib/adminInternshipsApi'

const filters = [
  ['pending', 'Pending'],
  ['all', 'All'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['draft', 'Draft'],
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

  return labels[status] || status || 'Unknown'
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

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(
    `${value}T00:00:00`
  )

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString()
}

function formatStipend(internship) {
  if (
    internship.compensation_type ===
    'unpaid'
  ) {
    return 'Unpaid'
  }

  const minimum = Number(
    internship.stipend_min || 0
  )

  const maximum = Number(
    internship.stipend_max || 0
  )

  const currency =
    internship.currency || 'INR'

  if (minimum && maximum) {
    return `${currency} ${minimum.toLocaleString()} – ${maximum.toLocaleString()}`
  }

  if (minimum) {
    return `${currency} ${minimum.toLocaleString()}+`
  }

  if (maximum) {
    return `Up to ${currency} ${maximum.toLocaleString()}`
  }

  return 'Not specified'
}

export default function AdminInternships() {
  const [internships, setInternships] =
    useState([])

  const [activeFilter, setActiveFilter] =
    useState('pending')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [actionId, setActionId] =
    useState(null)

  async function loadInternships(
    status = activeFilter
  ) {
    try {
      setLoading(true)
      setError('')

      const records =
        await getAdminInternships({
          status,
        })

      setInternships(records)
    } catch (loadError) {
      console.error(
        'Unable to load admin internships:',
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
    loadInternships(activeFilter)
  }, [activeFilter])

  const counts = useMemo(() => {
    return {
      total: internships.length,

      pending:
        internships.filter(
          (internship) =>
            internship.status ===
            'pending'
        ).length,

      approved:
        internships.filter(
          (internship) =>
            internship.status ===
            'approved'
        ).length,

      rejected:
        internships.filter(
          (internship) =>
            internship.status ===
            'rejected'
        ).length,
    }
  }, [internships])

  async function handleApprove(
    internship
  ) {
    const confirmed =
      window.confirm(
        `Approve "${internship.title}" and publish it?`
      )

    if (!confirmed) {
      return
    }

    try {
      setActionId(internship.id)

      const updated =
        await approveInternship(
          internship.id
        )

      setInternships((current) =>
        current
          .map((record) =>
            record.id === internship.id
              ? {
                  ...record,
                  status:
                    updated.status,
                  published_at:
                    updated.published_at,
                  rejection_reason: null,
                }
              : record
          )
          .filter((record) =>
            activeFilter === 'pending'
              ? record.id !==
                internship.id
              : true
          )
      )

      toast.success(
        'Internship approved and published.'
      )
    } catch (approveError) {
      console.error(
        'Unable to approve internship:',
        approveError
      )

      toast.error(
        approveError?.message ||
          'Unable to approve internship.'
      )
    } finally {
      setActionId(null)
    }
  }

  async function handleReject(
    internship
  ) {
    const reason = window.prompt(
      `Why are you rejecting "${internship.title}"?`
    )

    if (reason === null) {
      return
    }

    if (!reason.trim()) {
      toast.error(
        'A rejection reason is required.'
      )
      return
    }

    try {
      setActionId(internship.id)

      const updated =
        await rejectInternship(
          internship.id,
          reason
        )

      setInternships((current) =>
        current
          .map((record) =>
            record.id === internship.id
              ? {
                  ...record,
                  status:
                    updated.status,
                  rejection_reason:
                    updated.rejection_reason,
                  published_at: null,
                }
              : record
          )
          .filter((record) =>
            activeFilter === 'pending'
              ? record.id !==
                internship.id
              : true
          )
      )

      toast.success(
        'Internship rejected.'
      )
    } catch (rejectError) {
      console.error(
        'Unable to reject internship:',
        rejectError
      )

      toast.error(
        rejectError?.message ||
          'Unable to reject internship.'
      )
    } finally {
      setActionId(null)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-brand-600">
            Admin moderation
          </p>

          <h1 className="mt-1 text-3xl font-black">
            Internship approval
          </h1>

          <p className="mt-2 text-slate-500">
            Review employer listings before
            publishing them publicly.
          </p>
        </div>

        <Link
          to="/admin/dashboard"
          className="btn-secondary"
        >
          Admin dashboard
        </Link>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">
            Loaded records
          </p>

          <p className="mt-2 text-3xl font-black">
            {counts.total}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Pending
          </p>

          <p className="mt-2 text-3xl font-black">
            {counts.pending}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Approved
          </p>

          <p className="mt-2 text-3xl font-black">
            {counts.approved}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">
            Rejected
          </p>

          <p className="mt-2 text-3xl font-black">
            {counts.rejected}
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map(
          ([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setActiveFilter(value)
              }
              className={
                activeFilter === value
                  ? 'btn-primary'
                  : 'btn-secondary'
              }
            >
              {label}
            </button>
          )
        )}
      </div>

      {loading ? (
        <div className="card mt-6">
          <div className="space-y-4">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="card mt-6 text-center">
          <h2 className="text-xl font-black">
            Unable to load internships
          </h2>

          <p className="mt-2 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadInternships(
                activeFilter
              )
            }
            className="btn-primary mt-5"
          >
            Try again
          </button>
        </div>
      ) : internships.length === 0 ? (
        <div className="card mt-6 text-center">
          <h2 className="text-xl font-black">
            No {activeFilter === 'all'
              ? ''
              : formatStatus(
                  activeFilter
                ).toLowerCase()}{' '}
            internships
          </h2>

          <p className="mt-2 text-slate-500">
            New employer submissions will
            appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {internships.map(
            (internship) => {
              const company =
                normalizeRelation(
                  internship.companies
                )

              const processing =
                actionId ===
                internship.id

              return (
                <article
                  key={internship.id}
                  className="card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-black">
                          {internship.title}
                        </h2>

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

                      <p className="mt-1 font-semibold text-brand-600">
                        {company.name ||
                          'Company unavailable'}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Company status:{' '}
                        <span className="capitalize">
                          {company.status ||
                            'unknown'}
                        </span>
                      </p>
                    </div>

                    {internship.status ===
                      'pending' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            handleApprove(
                              internship
                            )
                          }
                          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processing
                            ? 'Processing…'
                            : 'Approve'}
                        </button>

                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            handleReject(
                              internship
                            )
                          }
                          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Category
                      </p>

                      <p className="mt-1 font-semibold">
                        {internship.category ||
                          'Not specified'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Location
                      </p>

                      <p className="mt-1 font-semibold">
                        {internship.location ||
                          'Not specified'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Work mode
                      </p>

                      <p className="mt-1 font-semibold capitalize">
                        {internship.work_mode ||
                          'Not specified'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Deadline
                      </p>

                      <p className="mt-1 font-semibold">
                        {formatDate(
                          internship.deadline
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Duration
                      </p>

                      <p className="mt-1 font-semibold">
                        {internship.duration_months
                          ? `${internship.duration_months} months`
                          : 'Not specified'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Openings
                      </p>

                      <p className="mt-1 font-semibold">
                        {internship.openings ??
                          1}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Compensation
                      </p>

                      <p className="mt-1 font-semibold">
                        {formatStipend(
                          internship
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Submitted
                      </p>

                      <p className="mt-1 font-semibold">
                        {internship.created_at
                          ? new Date(
                              internship.created_at
                            ).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Description
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                      {internship.description ||
                        'No description provided.'}
                    </p>
                  </div>

                  {internship.skills_required
                    ?.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Required skills
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {internship.skills_required.map(
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

                  {internship.rejection_reason && (
                    <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                      Rejection reason:{' '}
                      {
                        internship.rejection_reason
                      }
                    </div>
                  )}

                  {internship.status ===
                    'approved' && (
                    <div className="mt-5">
                      <Link
                        to={`/internships/${internship.id}`}
                        className="btn-secondary"
                      >
                        View public listing
                      </Link>
                    </div>
                  )}
                </article>
              )
            }
          )}
        </div>
      )}
    </main>
  )
}
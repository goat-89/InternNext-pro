import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import {
  approveCompany,
  getAdminCompanies,
  rejectCompany,
  returnCompanyToPending,
} from '../lib/adminCompaniesApi'

const filters = [
  ['pending', 'Pending'],
  ['all', 'All'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
]

function formatStatus(status) {
  const labels = {
    pending: 'Pending approval',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended',
  }

  return labels[status] || status || 'Unknown'
}

function getStatusClass(status) {
  const classes = {
    pending:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',

    approved:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',

    rejected:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',

    suspended:
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

function normalizeWebsite(value) {
  if (!value) {
    return null
  }

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value
  }

  return `https://${value}`
}

export default function AdminEmployers() {
  const [companies, setCompanies] =
    useState([])

  const [activeFilter, setActiveFilter] =
    useState('pending')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [actionId, setActionId] =
    useState(null)

  async function loadCompanies(
    status = activeFilter
  ) {
    try {
      setLoading(true)
      setError('')

      const records =
        await getAdminCompanies({
          status,
        })

      setCompanies(records)
    } catch (loadError) {
      console.error(
        'Unable to load companies:',
        loadError
      )

      setError(
        loadError?.message ||
          'Unable to load companies.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies(activeFilter)
  }, [activeFilter])

  const counts = useMemo(() => {
    return {
      total: companies.length,

      pending:
        companies.filter(
          (company) =>
            company.status === 'pending'
        ).length,

      approved:
        companies.filter(
          (company) =>
            company.status === 'approved'
        ).length,

      rejected:
        companies.filter(
          (company) =>
            company.status === 'rejected'
        ).length,
    }
  }, [companies])

  function removeFromCurrentFilter(
    companyId
  ) {
    if (activeFilter === 'all') {
      return
    }

    setCompanies((current) =>
      current.filter(
        (company) =>
          company.id !== companyId
      )
    )
  }

  async function handleApprove(company) {
    const confirmed =
      window.confirm(
        `Approve "${company.name}"?`
      )

    if (!confirmed) {
      return
    }

    try {
      setActionId(company.id)

      const updated =
        await approveCompany(
          company.id
        )

      if (activeFilter === 'all') {
        setCompanies((current) =>
          current.map((record) =>
            record.id === company.id
              ? {
                  ...record,
                  status:
                    updated.status,
                  verified_at:
                    updated.verified_at,
                  rejection_reason: null,
                }
              : record
          )
        )
      } else {
        removeFromCurrentFilter(
          company.id
        )
      }

      toast.success(
        'Company approved successfully.'
      )
    } catch (approveError) {
      console.error(
        'Unable to approve company:',
        approveError
      )

      toast.error(
        approveError?.message ||
          'Unable to approve company.'
      )
    } finally {
      setActionId(null)
    }
  }

  async function handleReject(company) {
    const reason = window.prompt(
      `Why are you rejecting "${company.name}"?`
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
      setActionId(company.id)

      const updated =
        await rejectCompany(
          company.id,
          reason
        )

      if (activeFilter === 'all') {
        setCompanies((current) =>
          current.map((record) =>
            record.id === company.id
              ? {
                  ...record,
                  status:
                    updated.status,
                  rejection_reason:
                    updated.rejection_reason,
                  verified_at: null,
                }
              : record
          )
        )
      } else {
        removeFromCurrentFilter(
          company.id
        )
      }

      toast.success(
        'Company rejected.'
      )
    } catch (rejectError) {
      console.error(
        'Unable to reject company:',
        rejectError
      )

      toast.error(
        rejectError?.message ||
          'Unable to reject company.'
      )
    } finally {
      setActionId(null)
    }
  }

  async function handleReturnToPending(
    company
  ) {
    const confirmed =
      window.confirm(
        `Return "${company.name}" to pending review?`
      )

    if (!confirmed) {
      return
    }

    try {
      setActionId(company.id)

      const updated =
        await returnCompanyToPending(
          company.id
        )

      if (activeFilter === 'all') {
        setCompanies((current) =>
          current.map((record) =>
            record.id === company.id
              ? {
                  ...record,
                  status:
                    updated.status,
                  rejection_reason: null,
                  verified_at: null,
                }
              : record
          )
        )
      } else {
        removeFromCurrentFilter(
          company.id
        )
      }

      toast.success(
        'Company returned to pending review.'
      )
    } catch (returnError) {
      console.error(
        'Unable to return company:',
        returnError
      )

      toast.error(
        returnError?.message ||
          'Unable to update company.'
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
            Employer companies
          </h1>

          <p className="mt-2 text-slate-500">
            Review and verify employer
            company profiles.
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
            Loaded companies
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
                className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="card mt-6 text-center">
          <h2 className="text-xl font-black">
            Unable to load companies
          </h2>

          <p className="mt-2 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadCompanies(activeFilter)
            }
            className="btn-primary mt-5"
          >
            Try again
          </button>
        </div>
      ) : companies.length === 0 ? (
        <div className="card mt-6 text-center">
          <h2 className="text-xl font-black">
            No companies found
          </h2>

          <p className="mt-2 text-slate-500">
            No companies match the selected
            status.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {companies.map((company) => {
            const processing =
              actionId === company.id

            const website =
              normalizeWebsite(
                company.website
              )

            return (
              <article
                key={company.id}
                className="card"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-black">
                        {company.name}
                      </h2>

                      <span
                        className={`badge ${getStatusClass(
                          company.status
                        )}`}
                      >
                        {formatStatus(
                          company.status
                        )}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {company.legal_name ||
                        'Legal name not provided'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {company.status ===
                      'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() =>
                            handleApprove(
                              company
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
                          disabled={processing}
                          onClick={() =>
                            handleReject(
                              company
                            )
                          }
                          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {[
                      'approved',
                      'rejected',
                    ].includes(
                      company.status
                    ) && (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          handleReturnToPending(
                            company
                          )
                        }
                        className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Return to pending
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Industry
                    </p>

                    <p className="mt-1 font-semibold">
                      {company.industry ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Company type
                    </p>

                    <p className="mt-1 font-semibold capitalize">
                      {company.company_type ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Company size
                    </p>

                    <p className="mt-1 font-semibold">
                      {company.company_size ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Founded
                    </p>

                    <p className="mt-1 font-semibold">
                      {company.founded_year ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Headquarters
                    </p>

                    <p className="mt-1 font-semibold">
                      {company.headquarters ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Business email
                    </p>

                    <p className="mt-1 break-all font-semibold">
                      {company.business_email ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Phone
                    </p>

                    <p className="mt-1 font-semibold">
                      {company.phone ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Registered
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatDate(
                        company.created_at
                      )}
                    </p>
                  </div>
                </div>

                {company.description && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Description
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                      {company.description}
                    </p>
                  </div>
                )}

                {company.rejection_reason && (
                  <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    Rejection reason:{' '}
                    {company.rejection_reason}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                    >
                      Visit website
                    </a>
                  )}

                  {company.business_email && (
                    <a
                      href={`mailto:${company.business_email}`}
                      className="btn-secondary"
                    >
                      Email company
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}
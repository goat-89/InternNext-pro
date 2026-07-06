import {
  CalendarDays,
  LoaderCircle,
  MoveRight,
  UserRound,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import toast from 'react-hot-toast'

import {
  DashboardShell,
} from '../components/Layout'

import {
  EmptyState,
  Skeleton,
} from '../components/UI'

import {
  employerNav,
} from '../lib/dashboardNav'

import {
  getEmployerApplicants,
  updateEmployerApplicationStatus,
} from '../lib/employerApplicantsApi'

const pipelineStatuses = [
  [
    'applied',
    'Applied',
  ],
  [
    'under_review',
    'Under review',
  ],
  [
    'shortlisted',
    'Shortlisted',
  ],
  [
    'interview_scheduled',
    'Interview scheduled',
  ],
  [
    'selected',
    'Selected',
  ],
  [
    'rejected',
    'Rejected',
  ],
]

const statusLabels = Object.fromEntries(
  pipelineStatuses
)

function formatDate(value) {
  if (!value) {
    return 'Not scheduled'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function groupApplications(applications) {
  const groups = Object.fromEntries(
    pipelineStatuses.map(([status]) => [
      status,
      [],
    ])
  )

  for (const application of applications) {
    if (groups[application.status]) {
      groups[application.status].push(
        application
      )
    }
  }

  return groups
}

function getNextStatus(status) {
  const index = pipelineStatuses.findIndex(
    ([value]) => value === status
  )

  if (
    index < 0 ||
    index >= pipelineStatuses.length - 1
  ) {
    return null
  }

  return pipelineStatuses[index + 1][0]
}

export default function EmployerPipeline() {
  const [
    applications,
    setApplications,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    updatingId,
    setUpdatingId,
  ] = useState('')

  useEffect(() => {
    let active = true

    async function loadPipeline() {
      try {
        setLoading(true)
        setError('')

        const rows =
          await getEmployerApplicants()

        if (active) {
          setApplications(rows)
        }
      } catch (loadError) {
        console.error(
          'Unable to load candidate pipeline:',
          loadError
        )

        if (active) {
          setError(
            loadError?.message ||
              'Unable to load candidate pipeline.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadPipeline()

    return () => {
      active = false
    }
  }, [])

  const grouped = useMemo(
    () => groupApplications(applications),
    [applications]
  )

  const visibleCount = useMemo(
    () =>
      pipelineStatuses.reduce(
        (total, [status]) =>
          total + grouped[status].length,
        0
      ),
    [grouped]
  )

  async function changeStatus(
    application,
    nextStatus
  ) {
    if (
      !nextStatus ||
      nextStatus === application.status ||
      updatingId
    ) {
      return
    }

    const previousStatus =
      application.status

    setUpdatingId(application.id)

    setApplications((current) =>
      current.map((item) =>
        item.id === application.id
          ? {
              ...item,
              status: nextStatus,
            }
          : item
      )
    )

    try {
      await updateEmployerApplicationStatus(
        application.id,
        nextStatus
      )

      toast.success(
        'Candidate moved to ' +
          statusLabels[nextStatus] +
          '.'
      )
    } catch (updateError) {
      console.error(
        'Unable to update candidate status:',
        updateError
      )

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? {
                ...item,
                status: previousStatus,
              }
            : item
        )
      )

      toast.error(
        updateError?.message ||
          'Unable to update candidate status.'
      )
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <DashboardShell
      title="Candidate pipeline"
      navItems={employerNav}
    >
      <section className="mb-6 rounded-3xl border bg-white p-6 shadow-sm dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-brand-600">
              Application progress
            </p>

            <h1 className="mt-2 text-2xl font-black">
              Candidate pipeline
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Move candidates through each hiring stage
              and keep interview-ready applicants easy
              to spot.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {visibleCount} active candidate
            {visibleCount === 1 ? '' : 's'}
          </div>
        </div>
      </section>

      {loading && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      )}

      {!loading && error && (
        <EmptyState
          title="Unable to load pipeline"
          text={error}
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                window.location.reload()
              }
            >
              Try again
            </button>
          }
        />
      )}

      {!loading &&
        !error &&
        visibleCount === 0 && (
          <EmptyState
            title="No candidates in pipeline"
            text="Applications for your internships will appear here as candidates apply."
          />
        )}

      {!loading &&
        !error &&
        visibleCount > 0 && (
          <div className="grid gap-5 xl:grid-cols-3 2xl:grid-cols-6">
            {pipelineStatuses.map(
              ([status, label]) => (
                <section
                  key={status}
                  className="rounded-3xl border bg-slate-50 p-4 dark:bg-slate-900/60"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="font-black">
                      {label}
                    </h2>

                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800">
                      {grouped[status].length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {grouped[status].map(
                      (application) => {
                        const nextStatus =
                          getNextStatus(status)

                        const student =
                          application.student ||
                          {}

                        const internship =
                          application.internship ||
                          {}

                        return (
                          <article
                            key={application.id}
                            className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950"
                          >
                            <div className="flex items-start gap-3">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                                <UserRound className="h-5 w-5" />
                              </span>

                              <div className="min-w-0">
                                <h3 className="truncate font-black">
                                  {student.full_name ||
                                    'Applicant'}
                                </h3>

                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {internship.title ||
                                    'Internship'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 space-y-2 text-xs text-slate-500">
                              <p>
                                Applied{' '}
                                {formatDate(
                                  application.created_at
                                )}
                              </p>

                              {status ===
                                'interview_scheduled' && (
                                <p className="flex items-center gap-1 text-brand-700">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {formatDate(
                                    application.interview_at
                                  )}
                                </p>
                              )}
                            </div>

                            {student.skills?.length >
                              0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {student.skills
                                  .slice(0, 4)
                                  .map((skill) => (
                                    <span
                                      key={skill}
                                      className="badge bg-slate-100 text-xs dark:bg-slate-800"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                              </div>
                            )}

                            <div className="mt-4 grid gap-2">
                              <select
                                className="input text-sm"
                                value={status}
                                disabled={
                                  updatingId ===
                                  application.id
                                }
                                onChange={(event) =>
                                  changeStatus(
                                    application,
                                    event.target.value
                                  )
                                }
                              >
                                {pipelineStatuses.map(
                                  ([
                                    value,
                                    optionLabel,
                                  ]) => (
                                    <option
                                      key={value}
                                      value={value}
                                    >
                                      {optionLabel}
                                    </option>
                                  )
                                )}
                              </select>

                              {nextStatus && (
                                <button
                                  type="button"
                                  className="btn-secondary justify-center text-sm"
                                  disabled={
                                    updatingId ===
                                    application.id
                                  }
                                  onClick={() =>
                                    changeStatus(
                                      application,
                                      nextStatus
                                    )
                                  }
                                >
                                  {updatingId ===
                                  application.id ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoveRight className="h-4 w-4" />
                                  )}
                                  Move next
                                </button>
                              )}
                            </div>
                          </article>
                        )
                      }
                    )}

                    {grouped[status].length ===
                      0 && (
                      <div className="rounded-2xl border border-dashed bg-white p-4 text-center text-sm text-slate-400 dark:bg-slate-950">
                        No candidates
                      </div>
                    )}
                  </div>
                </section>
              )
            )}
          </div>
        )}
    </DashboardShell>
  )
}

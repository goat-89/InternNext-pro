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
  Clock3,
  CreditCard,
  FileText,
  Headphones,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  MapPin,
  Phone,
  Users,
  Video,
  X,
} from 'lucide-react'

import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import {
  DashboardShell,
} from '../components/Layout'

import {
  EmptyState,
  StatCard,
} from '../components/UI'

import {
  cancelApplicantInterview,
  createApplicantResumeSignedUrl,
  getEmployerApplicants,
  scheduleApplicantInterview,
  updateEmployerApplicationStatus,
} from '../lib/employerApplicantsApi'

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

const editableStatuses = [
  'applied',
  'under_review',
  'shortlisted',
  'selected',
  'rejected',
]

const interviewEligibleStatuses = [
  'applied',
  'under_review',
  'shortlisted',
  'interview_scheduled',
]

const emptyInterviewForm = {
  interviewAt: '',
  interviewMode: 'video',
  meetingLink: '',
  interviewLocation: '',
  interviewNotes: '',
}

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
  }

  return labels[status] || status || 'Unknown'
}

function getStatusClass(status) {
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

function formatDateTime(value) {
  if (!value) {
    return 'Not scheduled'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled'
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function toDateTimeLocal(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  )

  return localDate
    .toISOString()
    .slice(0, 16)
}

function getInterviewModeIcon(mode) {
  if (mode === 'phone') {
    return Phone
  }

  if (mode === 'onsite') {
    return MapPin
  }

  return Video
}

export default function Applicants() {
  const [applications, setApplications] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    updatingApplicationId,
    setUpdatingApplicationId,
  ] = useState(null)

  const [
    interviewApplication,
    setInterviewApplication,
  ] = useState(null)

  const [
    interviewForm,
    setInterviewForm,
  ] = useState(emptyInterviewForm)

  const [savingInterview, setSavingInterview] =
    useState(false)

  const [
    cancellingInterviewId,
    setCancellingInterviewId,
  ] = useState(null)

  const [
    openingResumeId,
    setOpeningResumeId,
  ] = useState(null)

  async function loadApplicants() {
    try {
      setLoading(true)
      setError('')

      const records =
        await getEmployerApplicants()

      setApplications(records)
    } catch (loadError) {
      console.error(
        'Unable to load applicants:',
        loadError
      )

      setError(
        loadError?.message ||
          'Unable to load applicants.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadApplicants()
  }, [])

  const stats = useMemo(() => {
    return {
      total: applications.length,

      review:
        applications.filter(
          (application) =>
            application.status ===
            'under_review'
        ).length,

      shortlisted:
        applications.filter(
          (application) =>
            application.status ===
            'shortlisted'
        ).length,

      interviews:
        applications.filter(
          (application) =>
            application.status ===
            'interview_scheduled'
        ).length,
    }
  }, [applications])

  function patchApplication(
    applicationId,
    changes
  ) {
    setApplications((current) =>
      current.map((record) =>
        record.id === applicationId
          ? {
              ...record,
              ...changes,
            }
          : record
      )
    )
  }

  async function handleStatusChange(
    application,
    newStatus
  ) {
    if (
      !newStatus ||
      newStatus === application.status
    ) {
      return
    }

    const previousStatus =
      application.status

    patchApplication(
      application.id,
      {
        status: newStatus,
      }
    )

    try {
      setUpdatingApplicationId(
        application.id
      )

      const updated =
        await updateEmployerApplicationStatus(
          application.id,
          newStatus
        )

      patchApplication(
        application.id,
        {
          status: updated.status,
          updated_at:
            updated.updated_at,
        }
      )

      toast.success(
        `Application moved to ${formatStatus(
          newStatus
        )}.`
      )
    } catch (updateError) {
      console.error(
        'Unable to update application:',
        updateError
      )

      patchApplication(
        application.id,
        {
          status: previousStatus,
        }
      )

      toast.error(
        updateError?.message ||
          'Unable to update application.'
      )
    } finally {
      setUpdatingApplicationId(null)
    }
  }

  function openInterviewModal(application) {
    setInterviewApplication(application)

    setInterviewForm({
      interviewAt:
        toDateTimeLocal(
          application.interview_at
        ),

      interviewMode:
        application.interview_mode ||
        'video',

      meetingLink:
        application.meeting_link || '',

      interviewLocation:
        application.interview_location ||
        '',

      interviewNotes:
        application.interview_notes || '',
    })
  }

  function closeInterviewModal() {
    if (savingInterview) {
      return
    }

    setInterviewApplication(null)
    setInterviewForm(emptyInterviewForm)
  }

  function updateInterviewField(
    field,
    value
  ) {
    setInterviewForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleScheduleInterview(
    event
  ) {
    event.preventDefault()

    if (!interviewApplication) {
      return
    }

    try {
      setSavingInterview(true)

      const updated =
        await scheduleApplicantInterview(
          interviewApplication.id,
          interviewForm
        )

      patchApplication(
        interviewApplication.id,
        {
          status: updated.status,
          interview_at:
            updated.interview_at,
          interview_mode:
            updated.interview_mode,
          interview_location:
            updated.interview_location,
          meeting_link:
            updated.meeting_link,
          interview_notes:
            updated.interview_notes,
          updated_at:
            updated.updated_at,
        }
      )

      toast.success(
        interviewApplication.status ===
          'interview_scheduled'
          ? 'Interview rescheduled.'
          : 'Interview scheduled.'
      )

      closeInterviewModal()
    } catch (scheduleError) {
      console.error(
        'Unable to schedule interview:',
        scheduleError
      )

      toast.error(
        scheduleError?.message ||
          'Unable to schedule interview.'
      )
    } finally {
      setSavingInterview(false)
    }
  }

  async function handleCancelInterview(
    application
  ) {
    const confirmed = window.confirm(
      `Cancel the interview for ${
        application.student?.full_name ||
        'this applicant'
      }?`
    )

    if (!confirmed) {
      return
    }

    try {
      setCancellingInterviewId(
        application.id
      )

      const updated =
        await cancelApplicantInterview(
          application.id
        )

      patchApplication(
        application.id,
        {
          status: updated.status,
          interview_at: null,
          interview_mode: null,
          interview_location: null,
          meeting_link: null,
          interview_notes: null,
          updated_at:
            updated.updated_at,
        }
      )

      toast.success(
        'Interview cancelled. The applicant was returned to Shortlisted.'
      )
    } catch (cancelError) {
      console.error(
        'Unable to cancel interview:',
        cancelError
      )

      toast.error(
        cancelError?.message ||
          'Unable to cancel interview.'
      )
    } finally {
      setCancellingInterviewId(null)
    }
  }

  async function handleOpenResume(
    application
  ) {
    try {
      setOpeningResumeId(
        application.id
      )

      const signedUrl =
        await createApplicantResumeSignedUrl(
          application.id,
          600
        )

      if (!signedUrl) {
        throw new Error(
          'Unable to open this resume.'
        )
      }

      window.open(
        signedUrl,
        '_blank',
        'noopener,noreferrer'
      )
    } catch (resumeError) {
      console.error(
        'Unable to open applicant resume:',
        resumeError
      )

      toast.error(
        resumeError?.message ||
          'Unable to open applicant resume.'
      )
    } finally {
      setOpeningResumeId(null)
    }
  }

  if (loading) {
    return (
      <DashboardShell
        title="Applicants"
        navItems={employerNav}
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
        title="Applicants"
        navItems={employerNav}
      >
        <EmptyState
          title="Unable to load applicants"
          text={error}
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={loadApplicants}
          >
            Try again
          </button>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      title="Applicants"
      navItems={employerNav}
    >
      <div>
        <h2 className="text-2xl font-black">
          Candidate pipeline
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review students, update application
          progress, and schedule interviews.
        </p>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total applicants"
          value={stats.total}
          icon={Users}
        />

        <StatCard
          label="Under review"
          value={stats.review}
          icon={FileText}
        />

        <StatCard
          label="Shortlisted"
          value={stats.shortlisted}
          icon={CheckCircle2}
        />

        <StatCard
          label="Interviews"
          value={stats.interviews}
          icon={CalendarDays}
        />
      </section>

      {applications.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            title="No applicants yet"
            text="Student applications for your internships will appear here."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {applications.map(
            (application) => {
              const student =
                application.student || {}

              const internship =
                application.internship || {}

              const updating =
                updatingApplicationId ===
                application.id

              const withdrawn =
                application.status ===
                'withdrawn'

              const interviewScheduled =
                application.status ===
                  'interview_scheduled' &&
                application.interview_at

              const openingResume =
                openingResumeId ===
                application.id

              const canScheduleInterview =
                interviewEligibleStatuses.includes(
                  application.status
                )

              const InterviewModeIcon =
                getInterviewModeIcon(
                  application.interview_mode
                )

              return (
                <article
                  key={application.id}
                  className="card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-black">
                          {student.full_name ||
                            'Applicant'}
                        </h3>

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

                      <p className="mt-1 font-semibold text-brand-600">
                        {internship.title ||
                          'Internship unavailable'}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Applied:{' '}
                        {formatDate(
                          application.created_at
                        )}
                      </p>
                    </div>

                    <div className="min-w-52">
                      <label className="text-xs font-semibold text-slate-500">
                        Application status
                      </label>

                      <select
                        value={application.status}
                        disabled={
                          updating ||
                          withdrawn
                        }
                        onChange={(event) =>
                          handleStatusChange(
                            application,
                            event.target.value
                          )
                        }
                        className="input mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {withdrawn && (
                          <option value="withdrawn">
                            Withdrawn
                          </option>
                        )}

                        {application.status ===
                          'interview_scheduled' && (
                          <option value="interview_scheduled">
                            Interview scheduled
                          </option>
                        )}

                        {!withdrawn &&
                          editableStatuses.map(
                            (status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {formatStatus(
                                  status
                                )}
                              </option>
                            )
                          )}
                      </select>

                      {updating && (
                        <p className="mt-2 text-xs text-slate-500">
                          Updating status…
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        College
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {student.college ||
                          'Not provided'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Degree
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {student.degree ||
                          'Not provided'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Resume
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {student.resume_path
                          ? 'Attached'
                          : 'Not attached'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Work mode
                      </p>

                      <p className="mt-1 text-sm font-semibold capitalize">
                        {internship.work_mode ||
                          'Not specified'}
                      </p>
                    </div>
                  </div>

                  {student.skills?.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Skills
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {student.skills.map(
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

                  {application.cover_letter && (
                    <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Cover letter
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                        {application.cover_letter}
                      </p>
                    </div>
                  )}

                  {interviewScheduled && (
                    <section className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/30">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-cyan-900 dark:text-cyan-200">
                            Interview details
                          </p>

                          <div className="mt-3 space-y-2 text-sm text-cyan-800 dark:text-cyan-300">
                            <p className="flex items-center gap-2">
                              <Clock3 size={16} />
                              {formatDateTime(
                                application.interview_at
                              )}
                            </p>

                            <p className="flex items-center gap-2 capitalize">
                              <InterviewModeIcon size={16} />
                              {application.interview_mode ||
                                'Video'}
                            </p>

                            {application.interview_location && (
                              <p className="flex items-start gap-2">
                                <MapPin
                                  size={16}
                                  className="mt-0.5 shrink-0"
                                />
                                {application.interview_location}
                              </p>
                            )}

                            {application.meeting_link && (
                              <a
                                href={application.meeting_link}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 font-semibold underline"
                              >
                                <Link2 size={16} />
                                Open meeting link
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() =>
                              openInterviewModal(
                                application
                              )
                            }
                          >
                            Reschedule
                          </button>

                          <button
                            type="button"
                            className="btn-secondary border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                            disabled={
                              cancellingInterviewId ===
                              application.id
                            }
                            onClick={() =>
                              handleCancelInterview(
                                application
                              )
                            }
                          >
                            {cancellingInterviewId ===
                            application.id
                              ? 'Cancelling…'
                              : 'Cancel interview'}
                          </button>
                        </div>
                      </div>

                      {application.interview_notes && (
                        <p className="mt-3 border-t border-cyan-200 pt-3 text-sm text-cyan-800 dark:border-cyan-900 dark:text-cyan-300">
                          {application.interview_notes}
                        </p>
                      )}
                    </section>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {internship.id && (
                      <Link
                        to={`/internships/${internship.id}`}
                        className="btn-secondary"
                      >
                        View internship
                      </Link>
                    )}

                    {student.linkedin_url && (
                      <a
                        href={student.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                      >
                        LinkedIn
                      </a>
                    )}

                    {student.portfolio_url && (
                      <a
                        href={student.portfolio_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                      >
                        Portfolio
                      </a>
                    )}

                    {student.resume_path && (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={openingResume}
                        onClick={() =>
                          handleOpenResume(
                            application
                          )
                        }
                      >
                        {openingResume ? (
                          <>
                            <LoaderCircle
                              className="animate-spin"
                              size={17}
                            />
                            Opening...
                          </>
                        ) : (
                          <>
                            <FileText size={17} />
                            Open resume
                          </>
                        )}
                      </button>
                    )}

                    {canScheduleInterview &&
                      !interviewScheduled && (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() =>
                            openInterviewModal(
                              application
                            )
                          }
                        >
                          <CalendarDays size={17} />
                          Schedule interview
                        </button>
                      )}
                  </div>

                  {withdrawn && (
                    <p className="mt-4 text-sm text-slate-500">
                      This application was withdrawn
                      by the student and cannot be
                      updated.
                    </p>
                  )}
                </article>
              )
            }
          )}
        </div>
      )}

      {interviewApplication && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Schedule interview"
        >
          <form
            onSubmit={handleScheduleInterview}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  {interviewApplication.status ===
                  'interview_scheduled'
                    ? 'Reschedule interview'
                    : 'Schedule interview'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {interviewApplication.student
                    ?.full_name || 'Applicant'}
                  {' · '}
                  {interviewApplication.internship
                    ?.title || 'Internship'}
                </p>
              </div>

              <button
                type="button"
                className="btn-secondary px-3"
                onClick={closeInterviewModal}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="text-sm font-semibold">
                  Interview date and time
                </span>

                <input
                  type="datetime-local"
                  className="input mt-2"
                  value={
                    interviewForm.interviewAt
                  }
                  min={toDateTimeLocal(
                    new Date(
                      Date.now() + 5 * 60000
                    ).toISOString()
                  )}
                  required
                  onChange={(event) =>
                    updateInterviewField(
                      'interviewAt',
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="md:col-span-2">
                <span className="text-sm font-semibold">
                  Interview mode
                </span>

                <select
                  className="input mt-2"
                  value={
                    interviewForm.interviewMode
                  }
                  onChange={(event) =>
                    updateInterviewField(
                      'interviewMode',
                      event.target.value
                    )
                  }
                >
                  <option value="video">
                    Video call
                  </option>

                  <option value="phone">
                    Phone call
                  </option>

                  <option value="onsite">
                    On-site
                  </option>
                </select>
              </label>

              {interviewForm.interviewMode ===
                'video' && (
                <label className="md:col-span-2">
                  <span className="text-sm font-semibold">
                    Meeting link
                  </span>

                  <input
                    type="url"
                    className="input mt-2"
                    placeholder="https://meet.google.com/..."
                    value={
                      interviewForm.meetingLink
                    }
                    required
                    onChange={(event) =>
                      updateInterviewField(
                        'meetingLink',
                        event.target.value
                      )
                    }
                  />
                </label>
              )}

              {interviewForm.interviewMode ===
                'onsite' && (
                <label className="md:col-span-2">
                  <span className="text-sm font-semibold">
                    Interview location
                  </span>

                  <input
                    type="text"
                    className="input mt-2"
                    placeholder="Office address or venue"
                    value={
                      interviewForm.interviewLocation
                    }
                    required
                    onChange={(event) =>
                      updateInterviewField(
                        'interviewLocation',
                        event.target.value
                      )
                    }
                  />
                </label>
              )}

              <label className="md:col-span-2">
                <span className="text-sm font-semibold">
                  Notes for the student
                </span>

                <textarea
                  rows={4}
                  className="input mt-2 resize-y"
                  placeholder="Preparation topics, documents to bring, contact details, or other instructions."
                  value={
                    interviewForm.interviewNotes
                  }
                  onChange={(event) =>
                    updateInterviewField(
                      'interviewNotes',
                      event.target.value
                    )
                  }
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t pt-5 dark:border-slate-800">
              <button
                type="button"
                className="btn-secondary"
                disabled={savingInterview}
                onClick={closeInterviewModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={savingInterview}
              >
                {savingInterview ? (
                  <>
                    <LoaderCircle className="animate-spin" size={18} />
                    Saving…
                  </>
                ) : (
                  <>
                    <CalendarDays size={18} />
                    {interviewApplication.status ===
                    'interview_scheduled'
                      ? 'Save new schedule'
                      : 'Schedule interview'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  )
}

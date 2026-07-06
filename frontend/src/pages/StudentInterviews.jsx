import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  CalendarCheck2,
  CalendarDays,
  Clock3,
  ExternalLink,
  Link2,
  LoaderCircle,
  MapPin,
  Phone,
  Video,
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
  studentNav,
} from '../lib/dashboardNav'

import {
  getMyApplications,
} from '../lib/applicationsApi'

function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

function getInterviewDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function formatInterviewDate(value) {
  const date = getInterviewDate(value)

  if (!date) {
    return 'Date unavailable'
  }

  return date.toLocaleDateString(
    undefined,
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  )
}

function formatInterviewTime(value) {
  const date = getInterviewDate(value)

  if (!date) {
    return 'Time unavailable'
  }

  return date.toLocaleTimeString(
    undefined,
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  )
}

function formatInterviewMode(mode) {
  const labels = {
    video: 'Video interview',
    phone: 'Phone interview',
    onsite: 'On-site interview',
  }

  return (
    labels[mode] ||
    'Interview'
  )
}

function getModeIcon(mode) {
  if (mode === 'video') {
    return Video
  }

  if (mode === 'phone') {
    return Phone
  }

  return MapPin
}

function isSameLocalDay(
  firstDate,
  secondDate
) {
  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  )
}

function InterviewCard({
  application,
  isPast = false,
}) {
  const internship =
    normalizeRelation(
      application.internships
    ) || {}

  const company =
    normalizeRelation(
      internship.companies
    ) || {}

  const ModeIcon =
    getModeIcon(
      application.interview_mode
    )

  return (
    <article
      className={`card ${
        isPast
          ? 'opacity-75'
          : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`badge ${
                isPast
                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
              }`}
            >
              {isPast
                ? 'Past interview'
                : 'Scheduled'}
            </span>

            <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {formatInterviewMode(
                application.interview_mode
              )}
            </span>
          </div>

          <h2 className="mt-4 text-xl font-black">
            {internship.title ||
              'Internship'}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {company.name ||
              'Company unavailable'}
          </p>
        </div>

        {internship.id && (
          <Link
            to={`/internships/${internship.id}`}
            className="btn-secondary"
          >
            View internship
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-brand-600" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Interview date
              </p>

              <p className="mt-1 font-bold">
                {formatInterviewDate(
                  application.interview_at
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-brand-600" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Interview time
              </p>

              <p className="mt-1 font-bold">
                {formatInterviewTime(
                  application.interview_at
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-4 sm:col-span-2">
          <div className="flex items-start gap-3">
            <ModeIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Interview mode
              </p>

              <p className="mt-1 font-bold">
                {formatInterviewMode(
                  application.interview_mode
                )}
              </p>

              {application.interview_mode ===
                'onsite' &&
                application.interview_location && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {
                      application.interview_location
                    }
                  </p>
                )}

              {application.interview_mode ===
                'phone' && (
                  <p className="mt-2 text-sm text-slate-500">
                    The employer will contact you using your registered phone number.
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>

      {application.interview_notes && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Preparation notes
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
            {application.interview_notes}
          </p>
        </div>
      )}

      {!isPast &&
        application.interview_mode ===
          'video' &&
        application.meeting_link && (
          <a
            href={
              application.meeting_link
            }
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-5 w-full sm:w-auto"
          >
            <Link2 className="h-4 w-4" />
            Join interview
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

      {!isPast &&
        application.interview_mode ===
          'onsite' &&
        application.interview_location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              application.interview_location
            )}`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-5 w-full sm:w-auto"
          >
            <MapPin className="h-4 w-4" />
            Open location
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
    </article>
  )
}

export default function StudentInterviews() {
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

  useEffect(() => {
    let active = true

    async function loadInterviews() {
      try {
        setLoading(true)
        setError('')

        const records =
          await getMyApplications()

        if (active) {
          setApplications(records)
        }
      } catch (loadError) {
        console.error(
          'Unable to load interviews:',
          loadError
        )

        if (active) {
          setError(
            loadError?.message ||
              'Unable to load your interviews.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadInterviews()

    return () => {
      active = false
    }
  }, [])

  const interviews = useMemo(
    () =>
      applications
        .filter(
          (application) =>
            application.status ===
              'interview_scheduled' &&
            getInterviewDate(
              application.interview_at
            )
        )
        .sort(
          (first, second) =>
            new Date(
              first.interview_at
            ).getTime() -
            new Date(
              second.interview_at
            ).getTime()
        ),
    [applications]
  )

  const now = new Date()

  const upcomingInterviews =
    interviews.filter(
      (application) =>
        new Date(
          application.interview_at
        ) >= now
    )

  const pastInterviews =
    interviews
      .filter(
        (application) =>
          new Date(
            application.interview_at
          ) < now
      )
      .reverse()

  const todayCount =
    upcomingInterviews.filter(
      (application) =>
        isSameLocalDay(
          new Date(
            application.interview_at
          ),
          now
        )
    ).length

  if (loading) {
    return (
      <DashboardShell
        title="Interview schedule"
        navItems={studentNav}
      >
        <div className="card flex min-h-72 items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell
        title="Interview schedule"
        navItems={studentNav}
      >
        <EmptyState
          title="Unable to load interviews"
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
      title="Interview schedule"
      navItems={studentNav}
    >
      <div>
        <h1 className="text-2xl font-black">
          Your interviews
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          View interview schedules, preparation notes, meeting links, and locations.
        </p>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Upcoming"
          value={
            upcomingInterviews.length
          }
          icon={CalendarCheck2}
        />

        <StatCard
          label="Today"
          value={todayCount}
          icon={Clock3}
        />

        <StatCard
          label="Completed"
          value={
            pastInterviews.length
          }
          icon={CalendarDays}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">
          Upcoming interviews
        </h2>

        {upcomingInterviews.length >
        0 ? (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {upcomingInterviews.map(
              (application) => (
                <InterviewCard
                  key={application.id}
                  application={
                    application
                  }
                />
              )
            )}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No upcoming interviews"
              text="Scheduled interviews will appear here when an employer invites you."
            />
          </div>
        )}
      </section>

      {pastInterviews.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-black">
            Previous interviews
          </h2>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {pastInterviews.map(
              (application) => (
                <InterviewCard
                  key={application.id}
                  application={
                    application
                  }
                  isPast
                />
              )
            )}
          </div>
        </section>
      )}
    </DashboardShell>
  )
}
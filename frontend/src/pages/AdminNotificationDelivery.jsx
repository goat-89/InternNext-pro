import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Mail,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import toast from 'react-hot-toast'

import { DashboardShell } from '../components/Layout'
import { adminNav } from '../lib/dashboardNav'

import {
  createAdminNotificationDigestJobs,
  getAdminNotificationDeliveryAttempts,
  getAdminNotificationDeliveryJobs,
  getAdminNotificationDeliveryOverview,
  releaseStaleNotificationDeliveryJobs,
} from '../lib/adminNotificationDeliveryApi'

import {
  getAdminNotificationRetentionSettings,
  runNotificationRetentionCleanup,
  updateAdminNotificationRetentionSettings,
} from '../lib/adminNotificationRetentionApi'

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['pending', 'Pending'],
  ['processing', 'Processing'],
  ['retry_scheduled', 'Retry scheduled'],
  ['delivered', 'Delivered'],
  ['failed', 'Failed'],
  ['skipped', 'Skipped'],
  ['suppressed', 'Suppressed'],
  ['cancelled', 'Cancelled'],
]

const CHANNEL_OPTIONS = [
  ['', 'All channels'],
  ['in_app', 'In-app'],
  ['email', 'Email'],
  ['web_push', 'Push'],
  ['sms', 'SMS'],
  ['whatsapp', 'WhatsApp'],
]

const DEFAULT_RETENTION_SETTINGS = {
  enabled: true,
  read_notification_days: 180,
  archived_notification_days: 30,
  expired_notification_grace_days: 7,
  delivery_job_days: 180,
  delivery_attempt_days: 180,
  worker_run_days: 90,
}

function formatNumber(value) {
  return new Intl.NumberFormat(
    'en-IN'
  ).format(Number(value || 0))
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ).format(date)
}

function formatLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

function getCount(rows, status) {
  const row = rows.find(
    (item) => item.status === status
  )

  return Number(row?.count || 0)
}

function formatDuration(value) {
  if (value === null || value === undefined) {
    return '-'
  }

  const milliseconds = Number(value)

  if (!Number.isFinite(milliseconds)) {
    return '-'
  }

  if (milliseconds < 1000) {
    return `${milliseconds} ms`
  }

  return `${(milliseconds / 1000).toFixed(1)} s`
}

function StatusPill({ status }) {
  const tone =
    status === 'failed'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
      : status === 'delivered'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
        : status === 'retry_scheduled'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${tone}`}
    >
      {formatLabel(status)}
    </span>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone = 'brand',
}) {
  const color =
    tone === 'danger'
      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300'
        : 'bg-brand-50 text-brand-600 dark:bg-brand-950/40'

  return (
    <article className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-black">
            {formatNumber(value)}
          </p>
        </div>

        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${color}`}
        >
          <Icon size={21} />
        </span>
      </div>
    </article>
  )
}

export default function AdminNotificationDelivery() {
  const [overview, setOverview] =
    useState({
      status_counts: [],
      channel_counts: [],
      recent_failures: [],
      recent_worker_runs: [],
      stale_processing_count: 0,
    })
  const [jobs, setJobs] = useState([])
  const [attemptsByJob, setAttemptsByJob] =
    useState({})
  const [expandedJobId, setExpandedJobId] =
    useState(null)
  const [status, setStatus] = useState('')
  const [channel, setChannel] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] =
    useState(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] =
    useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] =
    useState(false)
  const [working, setWorking] = useState(false)
  const [retentionSettings, setRetentionSettings] =
    useState(DEFAULT_RETENTION_SETTINGS)
  const [cleanupResult, setCleanupResult] =
    useState(null)
  const [digestResult, setDigestResult] =
    useState(null)
  const [error, setError] = useState('')

  const loadData = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')

      try {
        const [
          nextOverview,
          nextJobs,
          nextRetentionSettings,
        ] =
          await Promise.all([
            getAdminNotificationDeliveryOverview(),
            getAdminNotificationDeliveryJobs({
              status,
              channel,
              page,
              pageSize,
            }),
            getAdminNotificationRetentionSettings(),
          ])

        setOverview(nextOverview)
        setJobs(nextJobs.jobs)
        setTotal(nextJobs.total)
        setTotalPages(
          nextJobs.totalPages
        )
        setRetentionSettings(
          nextRetentionSettings
        )
      } catch (loadError) {
        console.error(
          'Unable to load notification delivery monitor:',
          loadError
        )

        setError(
          loadError?.message ||
            'Unable to load notification delivery data.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      channel,
      page,
      pageSize,
      status,
    ]
  )

  useEffect(() => {
    loadData(false)
  }, [loadData])

  const counts = useMemo(
    () => overview.status_counts || [],
    [overview]
  )

  const firstRecord =
    total === 0
      ? 0
      : (page - 1) * pageSize + 1
  const lastRecord = Math.min(
    page * pageSize,
    total
  )

  async function toggleAttempts(jobId) {
    if (expandedJobId === jobId) {
      setExpandedJobId(null)
      return
    }

    setExpandedJobId(jobId)

    if (attemptsByJob[jobId]) {
      return
    }

    try {
      const attempts =
        await getAdminNotificationDeliveryAttempts(
          jobId
        )

      setAttemptsByJob((current) => ({
        ...current,
        [jobId]: attempts,
      }))
    } catch (attemptError) {
      toast.error(
        attemptError?.message ||
          'Unable to load delivery attempts.'
      )
    }
  }

  async function releaseStaleJobs() {
    try {
      setWorking(true)

      const released =
        await releaseStaleNotificationDeliveryJobs()

      toast.success(
        `${released} stale job${
          released === 1 ? '' : 's'
        } released.`
      )

      await loadData(true)
    } catch (releaseError) {
      toast.error(
        releaseError?.message ||
          'Unable to release stale jobs.'
      )
    } finally {
      setWorking(false)
    }
  }

  async function generateDigest(frequency) {
    try {
      setWorking(true)

      const result =
        await createAdminNotificationDigestJobs(
          frequency
        )

      setDigestResult(result)

      toast.success(
        `${formatLabel(result.frequency)} digest generated with ${result.created} job${
          result.created === 1 ? '' : 's'
        }.`
      )

      await loadData(true)
    } catch (digestError) {
      toast.error(
        digestError?.message ||
          'Unable to generate digest jobs.'
      )
    } finally {
      setWorking(false)
    }
  }

  function changeStatus(event) {
    setStatus(event.target.value)
    setPage(1)
    setExpandedJobId(null)
  }

  function changeChannel(event) {
    setChannel(event.target.value)
    setPage(1)
    setExpandedJobId(null)
  }

  function updateRetentionField(event) {
    const { name, value, type, checked } =
      event.target

    setRetentionSettings((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : Number(value),
    }))
  }

  async function saveRetentionSettings() {
    try {
      setWorking(true)

      const updated =
        await updateAdminNotificationRetentionSettings(
          retentionSettings
        )

      setRetentionSettings(updated)
      toast.success(
        'Retention settings saved.'
      )
    } catch (saveError) {
      toast.error(
        saveError?.message ||
          'Unable to save retention settings.'
      )
    } finally {
      setWorking(false)
    }
  }

  async function runCleanup(dryRun) {
    if (!dryRun) {
      const confirmed = window.confirm(
        'Delete notification records that match the retention policy? This cannot be undone.'
      )

      if (!confirmed) {
        return
      }
    }

    try {
      setWorking(true)

      const result =
        await runNotificationRetentionCleanup({
          dryRun,
        })

      setCleanupResult(result)

      toast.success(
        dryRun
          ? 'Cleanup dry run complete.'
          : 'Notification cleanup complete.'
      )

      await loadData(true)
    } catch (cleanupError) {
      toast.error(
        cleanupError?.message ||
          'Unable to run notification cleanup.'
      )
    } finally {
      setWorking(false)
    }
  }

  return (
    <DashboardShell
      title="Notification delivery"
      navItems={adminNav}
    >
      <div className="space-y-6">
        <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/40">
                <Send size={22} />
              </span>

              <div>
                <h2 className="text-lg font-black">
                  Delivery queue
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Monitor queued, delivered, skipped, suppressed, retried, and failed notification jobs.
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Last generated {formatDateTime(overview.generated_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={releaseStaleJobs}
                disabled={working}
              >
                {working ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <RotateCcw size={17} />
                )}
                Release stale
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  loadData(true)
                }
                disabled={refreshing}
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? 'animate-spin'
                      : ''
                  }
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Pending"
            value={getCount(
              counts,
              'pending'
            )}
            icon={Clock3}
          />
          <SummaryCard
            title="Retry scheduled"
            value={getCount(
              counts,
              'retry_scheduled'
            )}
            icon={RefreshCw}
            tone="warning"
          />
          <SummaryCard
            title="Delivered"
            value={getCount(
              counts,
              'delivered'
            )}
            icon={Send}
          />
          <SummaryCard
            title="Failed"
            value={getCount(
              counts,
              'failed'
            )}
            icon={AlertTriangle}
            tone="danger"
          />
          <SummaryCard
            title="Stale processing"
            value={
              overview.stale_processing_count
            }
            icon={RotateCcw}
            tone="warning"
          />
        </section>

        <section className="overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3 border-b p-5 dark:border-slate-800">
            <span className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/40">
              <Activity size={20} />
            </span>

            <div>
              <h2 className="font-black">
                Worker runs
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Recent scheduled or manual worker executions.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="px-5 py-4">
                    Started
                  </th>
                  <th className="px-5 py-4">
                    Worker
                  </th>
                  <th className="px-5 py-4">
                    Status
                  </th>
                  <th className="px-5 py-4">
                    Claimed
                  </th>
                  <th className="px-5 py-4">
                    Delivered
                  </th>
                  <th className="px-5 py-4">
                    Failed
                  </th>
                  <th className="px-5 py-4">
                    Worker errors
                  </th>
                  <th className="px-5 py-4">
                    Duration
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(overview.recent_worker_runs || [])
                  .length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No worker runs recorded yet.
                    </td>
                  </tr>
                )}

                {(overview.recent_worker_runs || []).map(
                  (run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-950/60"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        {formatDateTime(run.started_at)}
                      </td>
                      <td className="max-w-56 px-5 py-4">
                        <p className="truncate font-semibold">
                          {run.worker_id}
                        </p>
                        {run.error_message && (
                          <p className="mt-1 truncate text-xs text-rose-600 dark:text-rose-300">
                            {run.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={run.status} />
                      </td>
                      <td className="px-5 py-4">
                        {formatNumber(run.claimed_count)}
                      </td>
                      <td className="px-5 py-4">
                        {formatNumber(run.delivered_count)}
                      </td>
                      <td className="px-5 py-4">
                        {formatNumber(run.failed_count)}
                      </td>
                      <td className="px-5 py-4">
                        {formatNumber(run.worker_error_count)}
                      </td>
                      <td className="px-5 py-4">
                        {formatDuration(run.duration_ms)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/40">
                <Mail size={20} />
              </span>

              <div>
                <h2 className="font-black">
                  Digest generation
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create pending email digest jobs for users who selected daily or weekly summaries.
                </p>

                {digestResult && (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Last {formatLabel(digestResult.frequency)} run: {formatNumber(digestResult.created)} created - {formatNumber(digestResult.skipped)} skipped - Email provider {digestResult.provider_enabled ? 'enabled' : 'disabled'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary"
                disabled={working}
                onClick={() =>
                  generateDigest('daily')
                }
              >
                {working ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Mail size={17} />
                )}
                Daily digest
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={working}
                onClick={() =>
                  generateDigest('weekly')
                }
              >
                {working ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Mail size={17} />
                )}
                Weekly digest
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                <Trash2 size={20} />
              </span>

              <div>
                <h2 className="font-black">
                  Retention cleanup
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Delete old read or archived notifications and completed operational logs.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                name="enabled"
                checked={retentionSettings.enabled}
                onChange={updateRetentionField}
              />
              Enabled
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm font-semibold">
              <span>Read notifications days</span>
              <input
                className="input"
                type="number"
                min={30}
                max={1095}
                name="read_notification_days"
                value={retentionSettings.read_notification_days}
                onChange={updateRetentionField}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Archived notifications days</span>
              <input
                className="input"
                type="number"
                min={7}
                max={365}
                name="archived_notification_days"
                value={retentionSettings.archived_notification_days}
                onChange={updateRetentionField}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Expired notification grace days</span>
              <input
                className="input"
                type="number"
                min={0}
                max={365}
                name="expired_notification_grace_days"
                value={retentionSettings.expired_notification_grace_days}
                onChange={updateRetentionField}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Delivery job days</span>
              <input
                className="input"
                type="number"
                min={30}
                max={1095}
                name="delivery_job_days"
                value={retentionSettings.delivery_job_days}
                onChange={updateRetentionField}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Delivery attempt days</span>
              <input
                className="input"
                type="number"
                min={30}
                max={1095}
                name="delivery_attempt_days"
                value={retentionSettings.delivery_attempt_days}
                onChange={updateRetentionField}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Worker run days</span>
              <input
                className="input"
                type="number"
                min={7}
                max={365}
                name="worker_run_days"
                value={retentionSettings.worker_run_days}
                onChange={updateRetentionField}
              />
            </label>
          </div>

          {cleanupResult && (
            <div className="mt-5 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <p className="font-black">
                Last cleanup {cleanupResult.dry_run ? 'dry run' : 'run'}
              </p>
              <p className="mt-2 text-slate-500">
                Notifications: {formatNumber(cleanupResult.expired_notifications + cleanupResult.archived_notifications + cleanupResult.read_notifications)} - Delivery jobs: {formatNumber(cleanupResult.delivery_jobs)} - Attempts: {formatNumber(cleanupResult.delivery_attempts)} - Worker runs: {formatNumber(cleanupResult.worker_runs)}
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={working}
              onClick={saveRetentionSettings}
            >
              Save retention
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={working}
              onClick={() => runCleanup(true)}
            >
              Dry run
            </button>
            <button
              type="button"
              className="btn-primary bg-rose-600 hover:bg-rose-700"
              disabled={working}
              onClick={() => runCleanup(false)}
            >
              Run cleanup
            </button>
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm font-semibold">
              <span>Status</span>
              <select
                className="input"
                value={status}
                onChange={changeStatus}
              >
                {STATUS_OPTIONS.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Channel</span>
              <select
                className="input"
                value={channel}
                onChange={changeChannel}
              >
                {CHANNEL_OPTIONS.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Rows</span>
              <select
                className="input"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(
                    Number(
                      event.target.value
                    )
                  )
                  setPage(1)
                  setExpandedJobId(null)
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>
                  100
                </option>
              </select>
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 border-b p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black">
                Delivery jobs
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {firstRecord}-{lastRecord} of {total}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-64 place-items-center p-8">
              <div className="text-center">
                <LoaderCircle className="mx-auto animate-spin text-brand-600" />
                <p className="mt-3 text-sm text-slate-500">
                  Loading delivery jobs...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="font-bold text-rose-600">
                {error}
              </p>
              <button
                type="button"
                className="btn-secondary mt-4"
                onClick={() =>
                  loadData(false)
                }
              >
                Try again
              </button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-10 text-center">
              <Mail className="mx-auto text-slate-400" />
              <p className="mt-3 font-bold">
                No delivery jobs found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Change filters or wait for notification events to enqueue.
              </p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800">
              {jobs.map((job) => {
                const expanded =
                  expandedJobId === job.id
                const attempts =
                  attemptsByJob[job.id] || []

                return (
                  <article
                    key={job.id}
                    className="p-5 sm:p-6"
                  >
                    <button
                      type="button"
                      className="grid w-full gap-4 text-left xl:grid-cols-[1.2fr_0.8fr_1fr_1fr_auto] xl:items-center"
                      onClick={() =>
                        toggleAttempts(job.id)
                      }
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">
                            {job.title ||
                              job.event_key ||
                              'Notification job'}
                          </p>
                          <StatusPill
                            status={job.status}
                          />
                        </div>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {job.id}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Channel
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatLabel(job.channel)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {job.provider || '-'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Recipient
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {job.recipient_name ||
                            'User'}
                        </p>
                        <p className="break-all text-xs text-slate-500">
                          {job.recipient_email ||
                            job.recipient_user_id}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Attempts
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {job.attempt_count}/
                          {job.max_attempts}
                        </p>
                        <p className="text-xs text-slate-500">
                          Next {formatDateTime(job.next_attempt_at)}
                        </p>
                      </div>

                      <ChevronDown
                        className={`transition-transform ${
                          expanded
                            ? 'rotate-180'
                            : ''
                        }`}
                        size={20}
                      />
                    </button>

                    {(job.last_error_code ||
                      job.last_error_message) && (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                        <p className="font-black">
                          {job.last_error_code ||
                            'Delivery error'}
                        </p>
                        {job.last_error_message && (
                          <p className="mt-1">
                            {job.last_error_message}
                          </p>
                        )}
                      </div>
                    )}

                    {expanded && (
                      <div className="mt-5 border-t pt-5 dark:border-slate-800">
                        <h3 className="font-black">
                          Attempts
                        </h3>

                        {attempts.length === 0 ? (
                          <p className="mt-3 text-sm text-slate-500">
                            No attempts have been recorded for this job.
                          </p>
                        ) : (
                          <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                              <thead className="text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                  <th className="py-3 pr-4">
                                    Attempt
                                  </th>
                                  <th className="py-3 pr-4">
                                    Status
                                  </th>
                                  <th className="py-3 pr-4">
                                    Response
                                  </th>
                                  <th className="py-3 pr-4">
                                    Error
                                  </th>
                                  <th className="py-3 pr-4">
                                    Duration
                                  </th>
                                  <th className="py-3 pr-4">
                                    Time
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y dark:divide-slate-800">
                                {attempts.map(
                                  (attempt) => (
                                    <tr key={attempt.id}>
                                      <td className="py-3 pr-4 font-bold">
                                        {attempt.attempt_number}
                                      </td>
                                      <td className="py-3 pr-4">
                                        <StatusPill
                                          status={
                                            attempt.status
                                          }
                                        />
                                      </td>
                                      <td className="py-3 pr-4">
                                        {attempt.response_code ||
                                          '-'}
                                      </td>
                                      <td className="py-3 pr-4">
                                        {attempt.safe_error_code ||
                                          '-'}
                                      </td>
                                      <td className="py-3 pr-4">
                                        {attempt.duration_ms == null
                                          ? '-'
                                          : `${attempt.duration_ms} ms`}
                                      </td>
                                      <td className="py-3 pr-4">
                                        {formatDateTime(
                                          attempt.attempted_at
                                        )}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1 || loading}
                onClick={() => {
                  setPage((current) =>
                    Math.max(1, current - 1)
                  )
                  setExpandedJobId(null)
                }}
              >
                <ChevronLeft size={17} />
                Previous
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={
                  page >= totalPages || loading
                }
                onClick={() => {
                  setPage((current) =>
                    Math.min(
                      totalPages,
                      current + 1
                    )
                  )
                  setExpandedJobId(null)
                }}
              >
                Next
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}

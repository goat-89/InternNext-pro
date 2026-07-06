import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  DatabaseBackup,
  RefreshCw,
  Save,
  ScanSearch,
  Send,
  Server,
  ShieldAlert,
  Trash2,
} from 'lucide-react'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import toast from 'react-hot-toast'

import {
  DashboardShell,
} from '../components/Layout'
import {
  getAdminOperationalRetentionSettings,
  getAdminOperationalEvents,
  getAdminSystemHealthOverview,
  runOperationalRetentionCleanup,
  updateAdminOperationalRetentionSettings,
  updateAdminOperationalEventStatus,
} from '../lib/adminSystemHealthApi'
import {
  adminNav,
} from '../lib/dashboardNav'

const statusOptions = [
  ['', 'All statuses'],
  ['open', 'Open'],
  ['resolved', 'Resolved'],
  ['ignored', 'Ignored'],
]

const sourceOptions = [
  ['', 'All sources'],
  ['frontend', 'Frontend'],
  ['edge_function', 'Edge function'],
  ['database', 'Database'],
  ['authentication', 'Authentication'],
  ['storage', 'Storage'],
  ['payment', 'Payment'],
  ['notification', 'Notification'],
]

function formatDateTime(value) {
  if (!value) {
    return 'Not recorded'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not recorded'
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ).format(date)
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = 'text-slate-900 dark:text-white',
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>
          <p
            className={`mt-2 text-3xl font-black ${tone}`}
          >
            {value}
          </p>
        </div>
        <Icon
          size={21}
          className="text-slate-400"
        />
      </div>
    </div>
  )
}

function severityClass(severity) {
  const classes = {
    critical:
      'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    error:
      'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
    warning:
      'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    info:
      'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  }

  return classes[severity] || classes.info
}

export default function AdminSystemHealth() {
  const [overview, setOverview] =
    useState(null)
  const [events, setEvents] =
    useState([])
  const [status, setStatus] =
    useState('open')
  const [source, setSource] =
    useState('')
  const [loading, setLoading] =
    useState(true)
  const [refreshing, setRefreshing] =
    useState(false)
  const [updatingId, setUpdatingId] =
    useState('')
  const [
    retentionSettings,
    setRetentionSettings,
  ] = useState({
    enabled: true,
    resolved_event_days: 90,
    ignored_event_days: 30,
    open_noncritical_event_days: 90,
    updated_at: null,
  })
  const [
    cleanupResult,
    setCleanupResult,
  ] = useState(null)
  const [
    retentionAction,
    setRetentionAction,
  ] = useState('')
  const [error, setError] =
    useState('')

  const loadHealth = useCallback(
    async (refresh = false) => {
      refresh
        ? setRefreshing(true)
        : setLoading(true)
      setError('')

      try {
        const [
          nextOverview,
          nextEvents,
          nextRetentionSettings,
        ] =
          await Promise.all([
            getAdminSystemHealthOverview(),
            getAdminOperationalEvents({
              status,
              source,
              limit: 100,
            }),
            getAdminOperationalRetentionSettings(),
          ])

        setOverview(nextOverview)
        setEvents(nextEvents)
        setRetentionSettings(
          nextRetentionSettings
        )
      } catch {
        const message =
          'Unable to load system health.'

        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [source, status]
  )

  useEffect(() => {
    loadHealth(false)
  }, [loadHealth])

  async function changeStatus(
    eventId,
    nextStatus
  ) {
    setUpdatingId(eventId)

    try {
      const updated =
        await updateAdminOperationalEventStatus(
          eventId,
          nextStatus
        )

      setEvents((current) =>
        current
          .map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  ...updated,
                }
              : event
          )
          .filter(
            (event) =>
              !status ||
              event.status === status
          )
      )

      toast.success(
        'Operational event updated.'
      )
      await loadHealth(true)
    } catch {
      toast.error(
        'Unable to update the event.'
      )
    } finally {
      setUpdatingId('')
    }
  }

  function changeRetentionSetting(
    key,
    value
  ) {
    setRetentionSettings(
      (current) => ({
        ...current,
        [key]: value,
      })
    )
  }

  async function saveRetentionSettings() {
    setRetentionAction('saving')

    try {
      const updated =
        await updateAdminOperationalRetentionSettings(
          retentionSettings
        )

      setRetentionSettings(updated)
      toast.success(
        'Operational retention settings saved.'
      )
    } catch {
      toast.error(
        'Unable to save retention settings.'
      )
    } finally {
      setRetentionAction('')
    }
  }

  async function runRetentionCleanup(
    dryRun
  ) {
    if (
      !dryRun &&
      !window.confirm(
        'Delete operational events that match the retention policy? Open error and critical events will be preserved.'
      )
    ) {
      return
    }

    setRetentionAction(
      dryRun ? 'previewing' : 'cleaning'
    )

    try {
      const result =
        await runOperationalRetentionCleanup({
          dryRun,
        })

      setCleanupResult(result)
      toast.success(
        dryRun
          ? 'Retention preview complete.'
          : 'Operational event cleanup complete.'
      )

      if (!dryRun) {
        await loadHealth(true)
      }
    } catch {
      toast.error(
        dryRun
          ? 'Unable to preview retention cleanup.'
          : 'Unable to run retention cleanup.'
      )
    } finally {
      setRetentionAction('')
    }
  }

  const totalFailures =
    Number(
      overview?.failed_payments_24h || 0
    ) +
    Number(
      overview?.failed_webhooks_24h || 0
    ) +
    Number(
      overview?.failed_delivery_jobs || 0
    )

  return (
    <DashboardShell
      title="System health"
      navItems={adminNav}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              Last snapshot:{' '}
              {formatDateTime(
                overview?.generated_at
              )}
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary"
            disabled={refreshing}
            onClick={() => loadHealth(true)}
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

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Stat
            label="Open events"
            value={
              overview?.open_operational_events ||
              0
            }
            icon={Activity}
          />
          <Stat
            label="Critical"
            value={
              overview?.critical_operational_events ||
              0
            }
            icon={ShieldAlert}
            tone="text-rose-600"
          />
          <Stat
            label="Payment failures"
            value={
              overview?.failed_payments_24h ||
              0
            }
            icon={CreditCard}
            tone="text-orange-600"
          />
          <Stat
            label="Webhook failures"
            value={
              overview?.failed_webhooks_24h ||
              0
            }
            icon={Server}
            tone="text-orange-600"
          />
          <Stat
            label="Delivery failures"
            value={
              overview?.failed_delivery_jobs ||
              0
            }
            icon={Send}
            tone="text-amber-600"
          />
          <Stat
            label="Stale jobs"
            value={
              overview?.stale_delivery_jobs ||
              0
            }
            icon={Clock3}
            tone="text-amber-600"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="card">
            <div className="flex items-center gap-3">
              <CheckCircle2
                className="text-emerald-600"
                size={21}
              />
              <div>
                <p className="font-bold">
                  Last worker success
                </p>
                <p className="text-sm text-slate-500">
                  {formatDateTime(
                    overview?.last_worker_success_at
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <AlertTriangle
                className={
                  totalFailures
                    ? 'text-rose-600'
                    : 'text-slate-400'
                }
                size={21}
              />
              <div>
                <p className="font-bold">
                  Recent operational failures
                </p>
                <p className="text-sm text-slate-500">
                  {totalFailures} payment,
                  webhook, and delivery failures
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <DatabaseBackup
                  className="text-brand-600"
                  size={21}
                />
                <h2 className="text-lg font-black">
                  Operational event retention
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Remove expired resolved,
                ignored, and noncritical
                diagnostic events. Open error
                and critical events always
                require administrator review.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Last updated:{' '}
                {formatDateTime(
                  retentionSettings.updated_at
                )}
              </p>
            </div>

            <label className="flex items-center gap-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={
                  retentionSettings.enabled
                }
                onChange={(event) =>
                  changeRetentionSetting(
                    'enabled',
                    event.target.checked
                  )
                }
              />
              Automated cleanup enabled
            </label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold">
              Resolved event days
              <input
                type="number"
                min="7"
                max="730"
                className="input mt-1"
                value={
                  retentionSettings.resolved_event_days
                }
                onChange={(event) =>
                  changeRetentionSetting(
                    'resolved_event_days',
                    event.target.value
                  )
                }
              />
            </label>
            <label className="text-sm font-semibold">
              Ignored event days
              <input
                type="number"
                min="7"
                max="365"
                className="input mt-1"
                value={
                  retentionSettings.ignored_event_days
                }
                onChange={(event) =>
                  changeRetentionSetting(
                    'ignored_event_days',
                    event.target.value
                  )
                }
              />
            </label>
            <label className="text-sm font-semibold">
              Open info/warning days
              <input
                type="number"
                min="30"
                max="730"
                className="input mt-1"
                value={
                  retentionSettings.open_noncritical_event_days
                }
                onChange={(event) =>
                  changeRetentionSetting(
                    'open_noncritical_event_days',
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          {cleanupResult && (
            <div className="mt-5 border-y py-4 text-sm dark:border-slate-800">
              <p className="font-bold">
                {cleanupResult.dry_run
                  ? 'Latest preview'
                  : 'Latest cleanup'}
              </p>
              <p className="mt-1 text-slate-500">
                {cleanupResult.total_events}{' '}
                total: {cleanupResult.resolved_events}{' '}
                resolved, {cleanupResult.ignored_events}{' '}
                ignored, and{' '}
                {
                  cleanupResult.open_noncritical_events
                }{' '}
                open informational or warning
                events.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              disabled={Boolean(
                retentionAction
              )}
              onClick={
                saveRetentionSettings
              }
            >
              <Save size={17} />
              {retentionAction === 'saving'
                ? 'Saving...'
                : 'Save retention'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={Boolean(
                retentionAction
              )}
              onClick={() =>
                runRetentionCleanup(true)
              }
            >
              <ScanSearch size={17} />
              {retentionAction ===
              'previewing'
                ? 'Previewing...'
                : 'Preview cleanup'}
            </button>
            <button
              type="button"
              className="btn-secondary text-rose-600"
              disabled={Boolean(
                retentionAction
              )}
              onClick={() =>
                runRetentionCleanup(false)
              }
            >
              <Trash2 size={17} />
              {retentionAction === 'cleaning'
                ? 'Cleaning...'
                : 'Run cleanup'}
            </button>
          </div>
        </section>

        <section className="card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-black">
                Operational events
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Safe diagnostic codes from
                authenticated application sessions.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Status
                <select
                  className="input mt-1"
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value
                    )
                  }
                >
                  {statusOptions.map(
                    ([value, label]) => (
                      <option
                        key={value || 'all'}
                        value={value}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Source
                <select
                  className="input mt-1"
                  value={source}
                  onChange={(event) =>
                    setSource(
                      event.target.value
                    )
                  }
                >
                  {sourceOptions.map(
                    ([value, label]) => (
                      <option
                        key={value || 'all'}
                        value={value}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading system health...
            </div>
          ) : events.length === 0 ? (
            <div className="mt-5 py-12 text-center">
              <Activity
                className="mx-auto text-slate-400"
                size={32}
              />
              <h3 className="mt-3 font-bold">
                No matching events
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Operational events matching
                these filters will appear
                here.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-3">
                      Event
                    </th>
                    <th className="px-3 py-3">
                      Source
                    </th>
                    <th className="px-3 py-3">
                      Reference
                    </th>
                    <th className="px-3 py-3">
                      Time
                    </th>
                    <th className="px-3 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-slate-100 align-top dark:border-slate-800"
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-1 text-xs font-bold ${severityClass(
                              event.severity
                            )}`}
                          >
                            {event.severity}
                          </span>
                          <span className="font-semibold">
                            {event.code}
                          </span>
                        </div>
                        <p className="mt-2 max-w-md text-xs text-slate-500">
                          {event.route ||
                            event.event_type}
                        </p>
                      </td>
                      <td className="px-3 py-4 capitalize">
                        {String(
                          event.source || ''
                        ).replaceAll('_', ' ')}
                      </td>
                      <td className="px-3 py-4 font-mono text-xs">
                        {event.request_id ||
                          'Not available'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">
                        {formatDateTime(
                          event.occurred_at
                        )}
                      </td>
                      <td className="px-3 py-4 text-right">
                        {event.status ===
                        'open' ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={
                              updatingId ===
                              event.id
                            }
                            onClick={() =>
                              changeStatus(
                                event.id,
                                'resolved'
                              )
                            }
                          >
                            <CheckCircle2
                              size={16}
                            />
                            Resolve
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={
                              updatingId ===
                              event.id
                            }
                            onClick={() =>
                              changeStatus(
                                event.id,
                                'open'
                              )
                            }
                          >
                            Reopen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  )
}

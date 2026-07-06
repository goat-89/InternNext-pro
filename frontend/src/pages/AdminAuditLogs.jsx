import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import toast from 'react-hot-toast'

import { DashboardShell } from '../components/Layout'
import { adminNav } from '../lib/dashboardNav'

import {
  buildAdminAuditCsv,
  getAdminAuditActions,
  getAdminAuditLogs,
  getAllAdminAuditLogsForExport,
} from '../lib/adminAuditApi'

const EMPTY_FILTERS = {
  entityType: '',
  action: '',
  entityId: '',
  dateFrom: '',
  dateTo: '',
}

function formatDateTime(value) {
  if (!value) {
    return '—'
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

function formatLabel(value) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatJson(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '{}'
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function downloadTextFile(
  filename,
  content
) {
  const blob = new Blob(
    ['\uFEFF', content],
    {
      type: 'text/csv;charset=utf-8',
    }
  )

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function JsonPanel({ title, value }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        {formatJson(value)}
      </pre>
    </div>
  )
}

export default function AdminAuditLogs() {
  const [draftFilters, setDraftFilters] =
    useState(EMPTY_FILTERS)

  const [filters, setFilters] =
    useState(EMPTY_FILTERS)

  const [actions, setActions] = useState([])
  const [logs, setLogs] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const loadActions = useCallback(async () => {
    try {
      const result = await getAdminAuditActions()
      setActions(result)
    } catch (loadError) {
      console.error(
        'Unable to load audit actions:',
        loadError
      )
    }
  }, [])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getAdminAuditLogs({
        ...filters,
        page,
        pageSize,
      })

      setLogs(result.logs)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (loadError) {
      console.error(
        'Unable to load audit logs:',
        loadError
      )

      setLogs([])
      setTotal(0)
      setTotalPages(1)
      setError(
        loadError?.message ||
          'Unable to load audit logs.'
      )
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    loadActions()
  }, [loadActions])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  function updateDraftFilter(
    event
  ) {
    const { name, value } = event.target

    setDraftFilters(
      (current) => ({
        ...current,
        [name]: value,
      })
    )
  }

  function applyFilters(event) {
    event.preventDefault()
    setPage(1)
    setExpandedId(null)
    setFilters({ ...draftFilters })
  }

  function resetFilters() {
    setDraftFilters({ ...EMPTY_FILTERS })
    setFilters({ ...EMPTY_FILTERS })
    setPage(1)
    setExpandedId(null)
  }

  async function exportCsv() {
    setExporting(true)

    try {
      const allLogs =
        await getAllAdminAuditLogsForExport(
          filters
        )

      const csv = buildAdminAuditCsv(allLogs)
      const date = new Date()
        .toISOString()
        .slice(0, 10)

      downloadTextFile(
        `internnext-admin-audit-${date}.csv`,
        csv
      )

      toast.success(
        `Exported ${allLogs.length} audit records.`
      )
    } catch (exportError) {
      console.error(
        'Unable to export audit logs:',
        exportError
      )

      toast.error(
        exportError?.message ||
          'Unable to export audit logs.'
      )
    } finally {
      setExporting(false)
    }
  }

  const firstRecord =
    total === 0
      ? 0
      : (page - 1) * pageSize + 1

  const lastRecord = Math.min(
    page * pageSize,
    total
  )

  return (
    <DashboardShell
      title="Admin audit logs"
      navItems={adminNav}
    >
      <div className="space-y-6">
        <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/40">
                <ShieldCheck size={22} />
              </span>

              <div>
                <h2 className="text-lg font-black">
                  Moderation activity
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review administrator actions across accounts,
                  companies, and internships.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={loadLogs}
                disabled={loading}
              >
                <RefreshCw
                  size={17}
                  className={
                    loading ? 'animate-spin' : ''
                  }
                />
                Refresh
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={exportCsv}
                disabled={exporting || total === 0}
              >
                {exporting ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Download size={17} />
                )}
                Export CSV
              </button>
            </div>
          </div>
        </section>

        <form
          onSubmit={applyFilters}
          className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
        >
          <div className="mb-5 flex items-center gap-2">
            <Filter size={18} />
            <h2 className="font-black">
              Filters
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2 text-sm font-semibold">
              <span>Entity type</span>
              <select
                name="entityType"
                value={draftFilters.entityType}
                onChange={updateDraftFilter}
                className="input-field w-full"
              >
                <option value="">All entities</option>
                <option value="profile">Profile</option>
                <option value="company">Company</option>
                <option value="internship">Internship</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Action</span>
              <select
                name="action"
                value={draftFilters.action}
                onChange={updateDraftFilter}
                className="input-field w-full"
              >
                <option value="">All actions</option>

                {actions.map((action) => (
                  <option
                    key={action}
                    value={action}
                  >
                    {formatLabel(action)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Entity ID</span>
              <input
                name="entityId"
                value={draftFilters.entityId}
                onChange={updateDraftFilter}
                className="input-field w-full"
                placeholder="UUID"
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>From date</span>
              <input
                type="date"
                name="dateFrom"
                value={draftFilters.dateFrom}
                onChange={updateDraftFilter}
                className="input-field w-full"
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>To date</span>
              <input
                type="date"
                name="dateTo"
                value={draftFilters.dateTo}
                onChange={updateDraftFilter}
                className="input-field w-full"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              className="btn-primary"
            >
              <Filter size={17} />
              Apply filters
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={resetFilters}
            >
              <X size={17} />
              Clear
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black">
                Audit records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Showing {firstRecord}–{lastRecord} of {total}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold">
              Rows
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(
                    Number(event.target.value)
                  )
                  setPage(1)
                  setExpandedId(null)
                }}
                className="input-field py-2"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="grid min-h-64 place-items-center p-8">
              <div className="text-center">
                <LoaderCircle className="mx-auto animate-spin text-brand-600" />
                <p className="mt-3 text-sm text-slate-500">
                  Loading audit logs…
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
                onClick={loadLogs}
              >
                Try again
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldCheck className="mx-auto text-slate-400" />
              <p className="mt-3 font-bold">
                No audit records found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Change the filters or perform an admin moderation action.
              </p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800">
              {logs.map((log) => {
                const expanded =
                  expandedId === log.id

                return (
                  <article
                    key={log.id}
                    className="p-5 sm:p-6"
                  >
                    <button
                      type="button"
                      className="grid w-full gap-4 text-left lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center"
                      onClick={() =>
                        setExpandedId(
                          expanded ? null : log.id
                        )
                      }
                    >
                      <div>
                        <p className="font-black">
                          {formatLabel(log.action)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDateTime(log.created_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Administrator
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {log.adminName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {log.adminEmail || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Entity
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatLabel(log.entity_type)}
                        </p>
                        <p className="break-all text-xs text-slate-500">
                          {log.entity_id}
                        </p>
                      </div>

                      <ChevronDown
                        size={20}
                        className={`transition-transform ${
                          expanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expanded && (
                      <div className="mt-5 grid gap-4 border-t pt-5 dark:border-slate-800 lg:grid-cols-2">
                        <JsonPanel
                          title="Before"
                          value={log.old_values}
                        />

                        <JsonPanel
                          title="After"
                          value={log.new_values}
                        />
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
                  setExpandedId(null)
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
                  setExpandedId(null)
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
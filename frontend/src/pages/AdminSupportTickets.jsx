import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  MessageSquareText,
  RefreshCw,
  Save,
} from 'lucide-react'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import toast from 'react-hot-toast'

import { DashboardShell } from '../components/Layout'
import { EmptyState } from '../components/UI'
import { adminNav } from '../lib/dashboardNav'
import {
  getAdminSupportTickets,
  updateAdminSupportTicket,
} from '../lib/supportTicketsApi'

const statusOptions = [
  ['all', 'All tickets'],
  ['open', 'Open'],
  ['in_progress', 'In progress'],
  ['resolved', 'Resolved'],
  ['closed', 'Closed'],
]

const editableStatuses =
  statusOptions.filter(
    ([value]) => value !== 'all'
  )

const categoryLabels = {
  student_support: 'Student support',
  employer_inquiry: 'Employer inquiry',
  payment_support: 'Payment support',
  partnership: 'Partnership',
  general: 'General inquiry',
}

const statusLabels = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

function formatDateTime(value) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (
    Number.isNaN(date.getTime())
  ) {
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

function getStatusClass(status) {
  const classes = {
    open:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
    in_progress:
      'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
    resolved:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    closed:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }

  return (
    classes[status] ||
    classes.open
  )
}

function normalizeDraft(ticket) {
  return {
    status: ticket.status || 'open',
    adminNotes:
      ticket.admin_notes || '',
  }
}

export default function AdminSupportTickets() {
  const [tickets, setTickets] =
    useState([])
  const [drafts, setDrafts] =
    useState({})
  const [filter, setFilter] =
    useState('all')
  const [loading, setLoading] =
    useState(true)
  const [refreshing, setRefreshing] =
    useState(false)
  const [savingId, setSavingId] =
    useState('')
  const [error, setError] =
    useState('')

  const loadTickets = useCallback(
    async (
      showRefreshState = false
    ) => {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')

      try {
        const records =
          await getAdminSupportTickets({
            status: filter,
            limit: 200,
          })

        setTickets(records)
        setDrafts(
          Object.fromEntries(
            records.map((ticket) => [
              ticket.id,
              normalizeDraft(ticket),
            ])
          )
        )
      } catch (loadError) {
        console.error(
          'Unable to load support tickets:',
          loadError
        )

        const message =
          loadError?.message ||
          'Unable to load support tickets.'

        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [filter]
  )

  useEffect(() => {
    loadTickets(false)
  }, [loadTickets])

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter(
        (ticket) =>
          ticket.status === 'open'
      ).length,
      active: tickets.filter(
        (ticket) =>
          ticket.status ===
          'in_progress'
      ).length,
      done: tickets.filter(
        (ticket) =>
          ticket.status ===
            'resolved' ||
          ticket.status === 'closed'
      ).length,
    }
  }, [tickets])

  function updateDraft(
    ticketId,
    field,
    value
  ) {
    setDrafts((current) => ({
      ...current,
      [ticketId]: {
        ...current[ticketId],
        [field]: value,
      },
    }))
  }

  async function saveTicket(ticket) {
    const draft =
      drafts[ticket.id] ||
      normalizeDraft(ticket)

    setSavingId(ticket.id)

    try {
      const updated =
        await updateAdminSupportTicket(
          ticket.id,
          {
            status: draft.status,
            adminNotes:
              draft.adminNotes,
          }
        )

      setTickets((current) =>
        current.map((item) =>
          item.id === ticket.id
            ? updated
            : item
        )
      )

      setDrafts((current) => ({
        ...current,
        [ticket.id]:
          normalizeDraft(updated),
      }))

      toast.success(
        'Support ticket updated.'
      )
    } catch (saveError) {
      console.error(
        'Unable to update support ticket:',
        saveError
      )

      toast.error(
        saveError?.message ||
          'Unable to update support ticket.'
      )
    } finally {
      setSavingId('')
    }
  }

  return (
    <DashboardShell
      title="Support tickets"
      navItems={adminNav}
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-slate-500">
              Loaded tickets
            </p>

            <p className="mt-2 text-3xl font-black">
              {stats.total}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-slate-500">
              Open
            </p>

            <p className="mt-2 text-3xl font-black text-amber-600">
              {stats.open}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-slate-500">
              In progress
            </p>

            <p className="mt-2 text-3xl font-black text-sky-600">
              {stats.active}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-slate-500">
              Resolved/closed
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-600">
              {stats.done}
            </p>
          </div>
        </section>

        <section className="card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black">
                <MessageSquareText size={21} />
                Contact inquiries
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Review public contact submissions and update support status.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                className="input sm:w-52"
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value
                  )
                }
              >
                {statusOptions.map(
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

              <button
                type="button"
                className="btn-secondary"
                disabled={
                  refreshing ||
                  loading
                }
                onClick={() =>
                  loadTickets(true)
                }
              >
                {refreshing ? (
                  <LoaderCircle
                    className="animate-spin"
                    size={18}
                  />
                ) : (
                  <RefreshCw size={18} />
                )}
                Refresh
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid min-h-72 place-items-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="text-center">
              <LoaderCircle
                className="mx-auto animate-spin text-brand-600"
                size={34}
              />

              <p className="mt-3 text-sm font-semibold text-slate-500">
                Loading support tickets...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 shrink-0"
                size={20}
              />

              <div>
                <p className="font-black">
                  Support tickets unavailable
                </p>

                <p className="mt-2 text-sm">
                  {error}
                </p>
              </div>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            title="No support tickets"
            text="New contact submissions will appear here."
          />
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const draft =
                drafts[ticket.id] ||
                normalizeDraft(ticket)
              const changed =
                draft.status !==
                  ticket.status ||
                draft.adminNotes !==
                  (ticket.admin_notes || '')

              return (
                <article
                  key={ticket.id}
                  className="card"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            'badge',
                            getStatusClass(
                              ticket.status
                            ),
                          ].join(' ')}
                        >
                          {statusLabels[
                            ticket.status
                          ] ||
                            ticket.status}
                        </span>

                        <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {categoryLabels[
                            ticket.category
                          ] ||
                            ticket.category}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl font-black">
                        {ticket.subject}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Mail size={15} />
                          {ticket.email}
                        </span>

                        <span>
                          From{' '}
                          <b className="text-slate-700 dark:text-slate-200">
                            {ticket.full_name}
                          </b>
                        </span>

                        {ticket.phone && (
                          <span>
                            {ticket.phone}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Clock3 size={15} />
                          {formatDateTime(
                            ticket.created_at
                          )}
                        </span>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                        {ticket.message}
                      </p>
                    </div>

                    <div className="w-full shrink-0 space-y-3 xl:w-80">
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold">
                          Status
                        </span>

                        <select
                          className="input"
                          value={draft.status}
                          onChange={(event) =>
                            updateDraft(
                              ticket.id,
                              'status',
                              event.target.value
                            )
                          }
                        >
                          {editableStatuses.map(
                            ([
                              value,
                              label,
                            ]) => (
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

                      <label className="block">
                        <span className="mb-2 block text-sm font-bold">
                          Admin notes
                        </span>

                        <textarea
                          className="input min-h-28"
                          value={
                            draft.adminNotes
                          }
                          onChange={(event) =>
                            updateDraft(
                              ticket.id,
                              'adminNotes',
                              event.target
                                .value
                            )
                          }
                          placeholder="Internal notes"
                        />
                      </label>

                      <button
                        type="button"
                        className="btn-primary w-full"
                        disabled={
                          !changed ||
                          savingId ===
                            ticket.id
                        }
                        onClick={() =>
                          saveTicket(ticket)
                        }
                      >
                        {savingId ===
                        ticket.id ? (
                          <LoaderCircle
                            className="animate-spin"
                            size={18}
                          />
                        ) : changed ? (
                          <Save size={18} />
                        ) : (
                          <CheckCircle2
                            size={18}
                          />
                        )}
                        {changed
                          ? 'Save ticket'
                          : 'Saved'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

import {
  AlertTriangle,
  BadgeIndianRupee,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  XCircle,
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
  formatPaymentAmount,
  getAdminPaymentOrders,
} from '../lib/paymentsApi'

const statusOptions = [
  ['all', 'All payments'],
  ['initiated', 'Initiated'],
  ['created', 'Created'],
  ['paid', 'Paid'],
  ['failed', 'Failed'],
  ['cancelled', 'Cancelled'],
]

const statusLabels = {
  initiated: 'Initiated',
  created: 'Created',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
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
    initiated:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    created:
      'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
    paid:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    failed:
      'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
    cancelled:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  }

  return (
    classes[status] ||
    classes.initiated
  )
}

export default function AdminPayments() {
  const [payments, setPayments] =
    useState([])
  const [filter, setFilter] =
    useState('all')
  const [loading, setLoading] =
    useState(true)
  const [refreshing, setRefreshing] =
    useState(false)
  const [error, setError] =
    useState('')

  const loadPayments = useCallback(
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
          await getAdminPaymentOrders({
            status: filter,
            limit: 250,
          })

        setPayments(records)
      } catch (loadError) {
        console.error(
          'Unable to load payments:',
          loadError
        )

        const message =
          loadError?.message ||
          'Unable to load payments.'

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
    loadPayments(false)
  }, [loadPayments])

  const stats = useMemo(() => {
    const paid = payments.filter(
      (payment) =>
        payment.status === 'paid'
    )
    const failed = payments.filter(
      (payment) =>
        payment.status === 'failed'
    )
    const pending = payments.filter(
      (payment) =>
        payment.status ===
          'initiated' ||
        payment.status === 'created'
    )
    const revenue = paid.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    )

    return {
      total: payments.length,
      pending: pending.length,
      paid: paid.length,
      failed: failed.length,
      revenue,
    }
  }, [payments])

  return (
    <DashboardShell
      title="Payments"
      navItems={adminNav}
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-5">
          <div className="card">
            <p className="text-sm text-slate-500">
              Loaded
            </p>
            <p className="mt-2 text-3xl font-black">
              {stats.total}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-slate-500">
              Pending
            </p>
            <p className="mt-2 text-3xl font-black text-sky-600">
              {stats.pending}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-slate-500">
              Paid
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {stats.paid}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-slate-500">
              Failed
            </p>
            <p className="mt-2 text-3xl font-black text-rose-600">
              {stats.failed}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-slate-500">
              Paid revenue
            </p>
            <p className="mt-2 text-2xl font-black">
              {formatPaymentAmount(
                stats.revenue,
                'INR'
              )}
            </p>
          </div>
        </section>

        <section className="card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black">
                <BadgeIndianRupee size={21} />
                Razorpay orders
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Review server-created Razorpay orders and verified payment status.
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
                  loadPayments(true)
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
                Loading payments...
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
                  Payments unavailable
                </p>
                <p className="mt-2 text-sm">
                  {error}
                </p>
              </div>
            </div>
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payments"
            text="Razorpay checkout orders will appear here."
          />
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <article
                key={payment.id}
                className="card"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          'badge',
                          getStatusClass(
                            payment.status
                          ),
                        ].join(' ')}
                      >
                        {statusLabels[
                          payment.status
                        ] ||
                          payment.status}
                      </span>

                      <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {payment.role_scope}
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-black">
                      {payment.plan_name}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Receipt {payment.receipt}
                    </p>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <p>
                        <b>Customer:</b>{' '}
                        {payment.billing_name ||
                          'Not provided'}
                      </p>
                      <p>
                        <b>Email:</b>{' '}
                        {payment.billing_email ||
                          'Not provided'}
                      </p>
                      <p>
                        <b>Order:</b>{' '}
                        {payment.razorpay_order_id ||
                          'Pending'}
                      </p>
                      <p>
                        <b>Payment:</b>{' '}
                        {payment.razorpay_payment_id ||
                          'Pending'}
                      </p>
                    </div>

                    {payment.failure_reason && (
                      <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                        {payment.failure_reason}
                      </p>
                    )}
                  </div>

                  <div className="w-full shrink-0 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950 xl:w-72">
                    <p className="text-sm text-slate-500">
                      Amount
                    </p>
                    <p className="mt-1 text-2xl font-black">
                      {formatPaymentAmount(
                        payment.amount,
                        payment.currency
                      )}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-slate-500">
                      <p className="flex items-center gap-2">
                        <Clock3 size={15} />
                        Created{' '}
                        {formatDateTime(
                          payment.created_at
                        )}
                      </p>

                      {payment.paid_at && (
                        <p className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle2
                            size={15}
                          />
                          Paid{' '}
                          {formatDateTime(
                            payment.paid_at
                          )}
                        </p>
                      )}

                      {payment.status ===
                        'failed' && (
                        <p className="flex items-center gap-2 text-rose-600">
                          <XCircle size={15} />
                          Failed
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

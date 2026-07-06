import {
  BadgeIndianRupee,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
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
} from '../lib/paymentsApi'
import {
  getAdminSubscriptions,
} from '../lib/subscriptionsApi'
import {
  getSubscriptionStatusLabel,
} from '../lib/subscriptionRules'

const statusOptions = [
  ['all', 'All subscriptions'],
  ['active', 'Active'],
  ['trialing', 'Trial'],
  ['grace_period', 'Grace period'],
  ['past_due', 'Past due'],
  ['cancelled', 'Cancelled'],
  ['expired', 'Expired'],
  ['refunded', 'Refunded'],
  ['suspended', 'Suspended'],
]

function formatDate(value) {
  if (!value) {
    return 'Not available'
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

export default function AdminSubscriptions() {
  const [
    subscriptions,
    setSubscriptions,
  ] = useState([])
  const [filter, setFilter] =
    useState('all')
  const [loading, setLoading] =
    useState(true)
  const [refreshing, setRefreshing] =
    useState(false)
  const [error, setError] =
    useState('')

  const loadSubscriptions =
    useCallback(
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
            await getAdminSubscriptions({
              status: filter,
              limit: 250,
            })

          setSubscriptions(records)
        } catch (loadError) {
          console.error(
            'Unable to load subscriptions:',
            loadError
          )

          const message =
            loadError?.message ||
            'Unable to load subscriptions.'

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
    loadSubscriptions(false)
  }, [loadSubscriptions])

  const stats = useMemo(() => {
    const active =
      subscriptions.filter(
        (subscription) =>
          subscription.status ===
          'active'
      )
    const revenue = active.reduce(
      (sum, subscription) =>
        sum +
        Number(
          subscription
            .subscription_plans
            ?.amount || 0
        ),
      0
    )

    return {
      total: subscriptions.length,
      active: active.length,
      revenue,
    }
  }, [subscriptions])

  return (
    <DashboardShell
      title="Subscriptions"
      navItems={adminNav}
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
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
              Active
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {stats.active}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-slate-500">
              Active value
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
                <ShieldCheck size={21} />
                Subscription records
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Review activated plans created from verified Razorpay payments.
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
                  loadSubscriptions(true)
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
                Loading subscriptions...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        ) : subscriptions.length === 0 ? (
          <EmptyState
            title="No subscriptions"
            text="Verified paid plans will appear here after activation."
          />
        ) : (
          <div className="space-y-4">
            {subscriptions.map(
              (subscription) => {
                const plan =
                  subscription
                    .subscription_plans || {}

                return (
                  <article
                    key={subscription.id}
                    className="card"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                            {getSubscriptionStatusLabel(
                              subscription.status
                            )}
                          </span>

                          <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {plan.role_scope ||
                              'role'}
                          </span>
                        </div>

                        <h3 className="mt-3 text-xl font-black">
                          {plan.name ||
                            'Subscription plan'}
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          User {subscription.user_id}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950 lg:w-80">
                        <p className="flex items-center gap-2 font-black">
                          <BadgeIndianRupee
                            size={16}
                          />
                          {formatPaymentAmount(
                            plan.amount,
                            plan.currency
                          )}
                        </p>

                        <p className="mt-3 flex items-center gap-2 text-slate-500">
                          <Clock3 size={15} />
                          Ends{' '}
                          {formatDate(
                            subscription
                              .current_period_end
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              }
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

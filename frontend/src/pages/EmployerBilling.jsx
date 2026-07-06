import {
  CreditCard,
  ReceiptText,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Link } from 'react-router-dom'

import {
  DashboardShell,
} from '../components/Layout'

import {
  EmptyState,
} from '../components/UI'

import {
  employerNav,
} from '../lib/dashboardNav'
import EntitlementUsageCard from '../components/billing/EntitlementUsageCard'
import SubscriptionStatusCard from '../components/billing/SubscriptionStatusCard'

import {
  formatPaymentAmount,
  getMyPaymentOrders,
} from '../lib/paymentsApi'
import {
  getEmployerEntitlementStatus,
} from '../lib/subscriptionsApi'

function formatBillingDate(value) {
  if (!value) {
    return 'Not available'
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

function getStatusClass(status) {
  const classes = {
    paid: 'text-emerald-600',
    created: 'text-sky-600',
    initiated: 'text-slate-500',
    failed: 'text-rose-600',
    cancelled: 'text-amber-600',
  }

  return classes[status] || 'text-slate-500'
}

function isEmployerOrder(order) {
  const roleScope =
    String(order.role_scope || '')
      .trim()
      .toLowerCase()

  if (!roleScope) {
    return true
  }

  return roleScope === 'employer'
}

export default function EmployerBilling() {
  const [
    payments,
    setPayments,
  ] = useState([])
  const [
    entitlementStatus,
    setEntitlementStatus,
  ] = useState(null)

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

    async function loadPayments() {
      try {
        setLoading(true)
        setError('')

        const records =
          await getMyPaymentOrders()
        const status =
          await getEmployerEntitlementStatus()

        if (!active) {
          return
        }

        setPayments(
          records.filter(isEmployerOrder)
        )
        setEntitlementStatus(status)
      } catch (loadError) {
        console.error(
          'Unable to load employer payments:',
          loadError
        )

        if (active) {
          setError(
            loadError?.message ||
              'Unable to load billing history.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadPayments()

    return () => {
      active = false
    }
  }, [])

  const paidPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.status === 'paid'
      ),
    [payments]
  )

  const currentPlan =
    paidPayments[0] || null

  const totalPaid = paidPayments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  )

  return (
    <DashboardShell
      title="Subscription and billing"
      navItems={employerNav}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-brand-600">
                Billing history
              </p>

              <h1 className="mt-2 text-2xl font-black">
                Employer payments
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Razorpay orders and completed employer
                plan payments for this account.
              </p>
            </div>

            <Link
              to="/pricing"
              className="btn-primary"
            >
              View plans
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {Array.from({
                length: 4,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-6">
              <EmptyState
                title="Unable to load billing"
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
            </div>
          ) : payments.length > 0 ? (
            <div className="mt-6 space-y-3">
              {payments.map((payment) => (
                <article
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                      <ReceiptText className="h-5 w-5" />
                    </span>

                    <div>
                      <h2 className="font-black">
                        {payment.plan_name ||
                          'Employer plan'}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {payment.receipt ||
                          payment.razorpay_order_id ||
                          'No receipt'}{' '}
                        -{' '}
                        {formatBillingDate(
                          payment.paid_at ||
                            payment.created_at
                        )}
                      </p>

                      {payment.failure_reason && (
                        <p className="mt-1 text-xs text-rose-600">
                          {payment.failure_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black">
                      {formatPaymentAmount(
                        payment.amount,
                        payment.currency
                      )}
                    </p>

                    <p
                      className={`text-sm capitalize ${getStatusClass(
                        payment.status
                      )}`}
                    >
                      {payment.status || 'unknown'}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No employer payments yet"
                text="Completed employer plan payments will appear here after checkout."
                action={
                  <Link
                    to="/pricing"
                    className="btn-primary"
                  >
                    Choose a plan
                  </Link>
                }
              />
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <SubscriptionStatusCard
            subscription={
              entitlementStatus
                ?.subscription ||
              (currentPlan
                ? {
                    plan_name:
                      currentPlan.plan_name,
                    status:
                      currentPlan.status,
                    current_period_end:
                      currentPlan.paid_at,
                  }
                : null)
            }
          />

          <EntitlementUsageCard
            status={entitlementStatus}
          />

          <section className="card">
            <CreditCard className="h-6 w-6 text-brand-600" />

            <p className="text-sm font-semibold text-slate-500">
              Total paid
            </p>

            <p className="mt-2 text-3xl font-black">
              {formatPaymentAmount(totalPaid)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Sum of successful employer payments.
            </p>
          </section>

          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            <h2 className="font-black">
              Secure checkout
            </h2>

            <p className="mt-2 text-sm leading-6">
              Payments are created and verified through
              Supabase Edge Functions with Razorpay
              server-side verification.
            </p>
          </section>
        </aside>
      </div>
    </DashboardShell>
  )
}

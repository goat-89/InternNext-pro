import {
  CalendarClock,
  ShieldCheck,
} from 'lucide-react'

import {
  getSubscriptionStatusLabel,
} from '../../lib/subscriptionRules'

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
    }
  ).format(date)
}

export default function SubscriptionStatusCard({
  subscription,
}) {
  const status =
    subscription?.status || 'free'

  return (
    <section className="card">
      <ShieldCheck className="h-6 w-6 text-brand-600" />

      <h2 className="mt-4 font-black">
        Current subscription
      </h2>

      <p className="mt-3 text-xl font-black">
        {subscription?.plan_name ||
          'Employer Free'}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {getSubscriptionStatusLabel(
          status
        )}
      </p>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
        <p className="flex items-center gap-2 text-slate-500">
          <CalendarClock size={16} />
          Valid until
        </p>

        <p className="mt-1 font-black">
          {formatDate(
            subscription?.current_period_end
          )}
        </p>
      </div>
    </section>
  )
}

import {
  Activity,
  BarChart3,
  FileDown,
  Megaphone,
} from 'lucide-react'

function formatLimit(value) {
  if (value === null) {
    return 'Unlimited'
  }

  return String(value)
}

const entitlementRows = [
  {
    key: 'active_internships',
    label: 'Active internships',
    icon: Activity,
  },
  {
    key: 'monthly_posts',
    label: 'Monthly posts',
    icon: Megaphone,
  },
  {
    key: 'resume_downloads',
    label: 'Resume downloads',
    icon: FileDown,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
]

export default function EntitlementUsageCard({
  status,
}) {
  const entitlements =
    status?.entitlements || {}

  const usageByFeature = {
    active_internships:
      status?.activeCount ?? 0,
    monthly_posts:
      status?.monthlyPostsUsed ?? 0,
  }

  return (
    <section className="card">
      <h2 className="font-black">
        Plan usage
      </h2>

      <div className="mt-4 space-y-3">
        {entitlementRows.map(
          ({ key, label, icon: Icon }) => {
            const entitlement =
              entitlements[key] || {}
            const enabled = Boolean(
              entitlement.enabled
            )
            const limit =
              entitlement.limit ??
              null
            const used =
              usageByFeature[key]

            return (
              <div
                key={key}
                className="rounded-2xl border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon
                      size={17}
                      className="text-brand-600"
                    />
                    <p className="font-black">
                      {label}
                    </p>
                  </div>

                  <span
                    className={`badge ${
                      enabled
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {enabled
                      ? 'Enabled'
                      : 'Locked'}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  {used === undefined
                    ? `Limit: ${formatLimit(
                        limit
                      )}`
                    : `${used} used of ${formatLimit(
                        limit
                      )}`}
                </p>
              </div>
            )
          }
        )}
      </div>
    </section>
  )
}

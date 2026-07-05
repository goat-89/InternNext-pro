export function normalizeRelation(value) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

export function formatDate(value, options = {}) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(undefined, options)
}

export function formatMoney(
  min,
  max,
  currency = 'INR',
  period = 'monthly',
  type = 'paid'
) {
  if (type === 'unpaid') return 'Unpaid'

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  })

  if (
    min != null &&
    max != null &&
    Number(min) !== Number(max)
  ) {
    return `${formatter.format(min)} - ${formatter.format(max)} / ${period}`
  }

  const amount = min ?? max
  return amount != null
    ? `${formatter.format(amount)} / ${period}`
    : 'Stipend not disclosed'
}

export function formatStatus(status) {
  const labels = {
    active: 'Active',
    suspended: 'Suspended',
    draft: 'Draft',
    pending: 'Pending approval',
    approved: 'Approved',
    rejected: 'Rejected',
    paused: 'Paused',
    closed: 'Closed',
    applied: 'Applied',
    under_review: 'Under review',
    shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview scheduled',
    selected: 'Selected',
    withdrawn: 'Withdrawn',
  }

  return labels[status] || status || 'Unknown'
}

export function statusClass(status) {
  const map = {
    active:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    approved:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    selected:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    pending:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    under_review:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    paused:
      'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    rejected:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    suspended:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    shortlisted:
      'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    interview_scheduled:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    applied:
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    draft:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    withdrawn:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    closed:
      'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  }

  return map[status] || map.draft
}

export function splitList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  return String(value || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

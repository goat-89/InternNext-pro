import {
  Bookmark,
  Building2,
  Clock3,
  MapPin,
  Wallet,
} from 'lucide-react'

import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function InternshipCard({
  item,
  i,
  internship,
}) {
  const record = item ?? i ?? internship

  const app = useApp()
  const saved = Array.isArray(app?.saved)
    ? app.saved
    : []

  const toggleSave =
    typeof app?.toggleSave === 'function'
      ? app.toggleSave
      : () => {}

  if (!record || typeof record !== 'object') {
    return null
  }

  const id = String(record.id ?? '')

  const title =
    record.title ??
    record.role ??
    'Untitled internship'

  const company =
    record.company ??
    record.companies?.name ??
    'Company not available'

  const logo =
    record.logo ??
    String(company)
      .slice(0, 2)
      .toUpperCase()

  const location =
    record.location ??
    'Location not specified'

  const mode =
    record.mode ??
    record.work_mode ??
    'Not specified'

  const duration =
    record.duration ??
    (record.duration_months
      ? `${record.duration_months} months`
      : 'Duration not specified')

  const stipendValue = Number(
    record.stipend ??
      record.stipend_min ??
      0
  )

  const stipend = Number.isFinite(stipendValue)
    ? stipendValue
    : 0

  const skills = Array.isArray(record.skills)
    ? record.skills
    : Array.isArray(record.skills_required)
      ? record.skills_required
      : []

  const isSaved = id
    ? saved.includes(id)
    : false

  function handleSave() {
    if (!id) return
    toggleSave(id)
  }

  return (
    <article className="card group transition hover:-translate-y-1 hover:border-brand-300">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 font-black text-brand-700 dark:bg-brand-900/30">
          {logo}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              {id ? (
                <Link
                  to={`/internships/${id}`}
                  className="font-extrabold group-hover:text-brand-600"
                >
                  {title}
                </Link>
              ) : (
                <h3 className="font-extrabold">
                  {title}
                </h3>
              )}

              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                <Building2 size={14} />
                {company}
              </p>
            </div>

            <button
              type="button"
              aria-label={
                isSaved
                  ? 'Remove saved internship'
                  : 'Save internship'
              }
              onClick={handleSave}
              disabled={!id}
              className="rounded-xl p-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
            >
              <Bookmark
                size={19}
                className={
                  isSaved
                    ? 'fill-brand-600 text-brand-600'
                    : ''
                }
              />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <MapPin size={15} />
              {location}
            </span>

            <span className="flex items-center gap-1">
              <Wallet size={15} />
              ₹{stipend.toLocaleString()}/mo
            </span>

            <span className="flex items-center gap-1">
              <Clock3 size={15} />
              {duration}
            </span>

            <span>{mode}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                className="badge bg-slate-100 dark:bg-slate-800"
                key={skill}
              >
                {skill}
              </span>
            ))}

            {record.featured && (
              <span className="badge bg-amber-100 text-amber-800">
                Featured
              </span>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {record.posted
                ? `Posted ${record.posted}`
                : 'Recently posted'}
            </span>

            {id && (
              <Link
                className="btn-primary"
                to={`/internships/${id}`}
              >
                View details
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

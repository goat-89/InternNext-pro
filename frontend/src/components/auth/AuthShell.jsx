import { Link } from 'react-router-dom'

function getRolePath(role, mode) {
  if (mode === 'signup') {
    return role === 'employer'
      ? '/signup/employer'
      : '/signup/student'
  }

  return `/login?role=${role}&mode=login`
}

function RoleSwitch({ role, mode }) {
  const activeRole =
    role === 'employer' ? 'employer' : 'student'
  const safeMode =
    mode === 'signup' ? 'signup' : 'login'

  return (
    <div
      className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-950"
      role="tablist"
      aria-label="Choose account type"
    >
      {['student', 'employer'].map((nextRole) => {
        const active = activeRole === nextRole

        return (
          <Link
            key={nextRole}
            to={getRolePath(nextRole, safeMode)}
            role="tab"
            aria-selected={active}
            className={
              active
                ? 'btn-primary justify-center'
                : 'btn justify-center'
            }
          >
            {nextRole === 'student'
              ? 'Student'
              : 'Employer'}
          </Link>
        )
      })}
    </div>
  )
}

export default function AuthShell({
  children,
  role,
  mode = 'login',
}) {
  const showRoleSwitch =
    role === 'student' || role === 'employer'

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-3 py-4 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-4">
      <section className="w-full max-w-md rounded-3xl border bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        {showRoleSwitch && (
          <RoleSwitch
            role={role}
            mode={mode}
          />
        )}
        {children}
      </section>
    </main>
  )
}

export function AuthAlert({
  children,
  tone = 'info',
}) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
    warning:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    error:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  }

  return (
    <div
      className={`rounded-2xl border p-4 text-sm leading-6 ${tones[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {children}
    </div>
  )
}

export function GoogleMark() {
  return (
    <span
      aria-hidden="true"
      className="grid h-5 w-5 place-items-center rounded-full bg-white text-sm font-black text-slate-900"
    >
      G
    </span>
  )
}

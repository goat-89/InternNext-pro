import {
  BriefcaseBusiness,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react'

import {
  Link,
  NavLink,
} from 'react-router-dom'

import { useState } from 'react'

import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

import LogoutButton from './LogoutButton'
import NotificationBell from './NotificationBell'

const publicNavigation = [
  ['Home', '/'],
  ['Internships', '/internships'],
  ['Services', '/services'],
  ['Pricing', '/pricing'],
  ['Resources', '/blog'],
  ['Contact', '/contact'],
]

function getDashboardPath(role) {
  switch (role) {
    case 'student':
      return '/student/dashboard'

    case 'employer':
      return '/employer/dashboard'

    case 'admin':
      return '/admin/dashboard'

    default:
      return '/'
  }
}


export function Navbar() {
  const {
    dark,
    setDark,
  } = useApp()

  const {
    user,
    profile,
    loading,
  } = useAuth()

  const [open, setOpen] = useState(false)

  const dashboardPath =
    getDashboardPath(profile?.role)

  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur dark:bg-slate-950/90">
      <div className="container-app flex items-center justify-between py-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-black"
        >
          <span className="rounded-xl bg-brand-600 p-2 text-white">
            <BriefcaseBusiness size={20} />
          </span>

          InternNext
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {publicNavigation.map(
            ([name, path]) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `text-sm font-semibold ${
                    isActive
                      ? 'text-brand-600'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                  }`
                }
              >
                {name}
              </NavLink>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Toggle theme"
            className="btn-secondary px-3"
            onClick={() => setDark(!dark)}
          >
            {dark ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>

          {!loading && user && profile && (
            <>
              <div className="hidden sm:block">
                <NotificationBell />
              </div>

              <Link
                to={dashboardPath}
                className="btn-primary hidden sm:inline-flex"
              >
                Dashboard
              </Link>

              <LogoutButton className="btn-secondary hidden sm:inline-flex" />
            </>
          )}

          {!loading && !user && (
            <>
              <Link
                to="/signup/student"
                className="btn-secondary hidden xl:inline-flex"
              >
                Student signup
              </Link>

              <Link
                to="/signup/employer"
                className="btn-secondary hidden xl:inline-flex"
              >
                Employer signup
              </Link>

              <Link
                to="/login"
                className="btn-primary hidden sm:inline-flex"
              >
                Sign in
              </Link>
            </>
          )}

          <button
            type="button"
            className="btn-secondary px-3 lg:hidden"
            onClick={() =>
              setOpen((current) => !current)
            }
            aria-label="Toggle navigation"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="container-app border-t py-4 lg:hidden">
          {publicNavigation.map(
            ([name, path]) => (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 font-semibold hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                {name}
              </Link>
            )
          )}

          {!loading && user && profile ? (
            <div className="mt-4 space-y-3 border-t pt-4 dark:border-slate-800">
              <div className="px-3">
                <p className="font-semibold">
                  {profile.full_name || user.email}
                </p>

                <p className="text-sm capitalize text-slate-500">
                  {profile.role} account
                </p>
              </div>

              <Link
                to={dashboardPath}
                onClick={() => setOpen(false)}
                className="btn-primary w-full"
              >
                Open dashboard
              </Link>

              <LogoutButton className="btn-secondary w-full justify-center" />
            </div>
          ) : (
            !loading && (
              <div className="mt-4 space-y-3 border-t pt-4 dark:border-slate-800">
                <Link
                  to="/signup/student"
                  onClick={() => setOpen(false)}
                  className="btn-secondary w-full justify-center"
                >
                  Student signup
                </Link>

                <Link
                  to="/signup/employer"
                  onClick={() => setOpen(false)}
                  className="btn-secondary w-full justify-center"
                >
                  Employer signup
                </Link>

                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="btn-primary w-full justify-center"
                >
                  Sign in
                </Link>
              </div>
            )
          )}
        </div>
      )}
    </header>
  )
}

export function Footer() {
  const footerGroups = [
    [
      'Platform',
      [
        ['Internships', '/internships'],
        ['Pricing', '/pricing'],
        ['Employer access', '/signup/employer'],
        ['Help center', '/help'],
      ],
    ],
    [
      'Company',
      [
        ['About', '/about'],
        ['Contact', '/contact'],
        ['Resources', '/blog'],
        ['Student safety', '/student-safety'],
      ],
    ],
    [
      'Legal',
      [
        ['Privacy', '/privacy'],
        ['Terms', '/terms'],
        ['Cookies', '/cookies'],
        ['Refunds', '/refund'],
        ['Data deletion', '/data-deletion'],
        ['Grievance', '/grievance'],
      ],
    ],
  ]

  return (
    <footer className="border-t bg-white py-12 dark:bg-slate-950">
      <div className="container-app grid gap-8 md:grid-cols-4">
        <div>
          <h3 className="text-xl font-black">
            InternNext
          </h3>

          <p className="mt-3 text-sm text-slate-500">
            Verified internships, smarter hiring, and career
            growth in one trusted platform.
          </p>
        </div>

        {footerGroups.map(([heading, items]) => (
          <div key={heading}>
            <h4 className="font-bold">
              {heading}
            </h4>

            <div className="mt-3 space-y-2 text-sm text-slate-500">
              {items.map(([label, path]) => (
                <Link
                  key={path}
                  to={path}
                  className="block hover:text-brand-600"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="container-app mt-10 border-t pt-6 text-sm text-slate-500">
        &copy; 2026 InternNext Technologies. Built for ambitious
        students and modern teams.
      </div>
    </footer>
  )
}

export function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export function DashboardShell({
  title,
  navItems,
  children,
}) {
  const {
    user,
    profile,
  } = useAuth()

  const role = profile?.role || ''
  const name =
    profile?.full_name ||
    user?.email ||
    'InternNext User'

  const dashboardPath =
    getDashboardPath(role)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex">
        <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-white p-5 lg:block dark:bg-slate-900">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-black"
          >
            <BriefcaseBusiness className="text-brand-600" />

            InternNext
          </Link>

          <div className="mt-8 space-y-1">
            {navItems.map(
              ([itemName, path, Icon]) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  {Icon && <Icon size={18} />}
                  {itemName}
                </NavLink>
              )
            )}
          </div>

          <LogoutButton className="btn-secondary absolute bottom-6 left-5 right-5 justify-center" />
        </aside>

        <div className="min-w-0 flex-1 lg:ml-72">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white/90 px-4 py-4 backdrop-blur sm:px-8 dark:bg-slate-900/90">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
                {role} workspace
              </p>

              <h1 className="text-xl font-black">
                {title}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />

              <Link
                to={dashboardPath}
                className="hidden text-right sm:block"
              >
                <p className="text-sm font-bold">
                  {name}
                </p>

                <p className="text-xs text-slate-500">
                  {user?.email}
                </p>
              </Link>

              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

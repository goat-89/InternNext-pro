import {
  useEffect,
  useState,
} from 'react'

import {
  Navigate,
  Outlet,
} from 'react-router-dom'

import {
  useAuth,
} from '../../context/AuthContext'

import {
  getDashboardRoute,
} from '../../lib/authRoutes'

import {
  supabase,
} from '../../lib/supabase'

import AuthLoadingScreen from './AuthLoadingScreen'

export default function OnboardingRoute({
  role,
}) {
  const {
    user,
    profile,
    loading,
  } = useAuth()

  const [
    checkingCompany,
    setCheckingCompany,
  ] = useState(
    role === 'employer'
  )

  const [
    hasCompany,
    setHasCompany,
  ] = useState(false)

  const [
    companyCheckError,
    setCompanyCheckError,
  ] = useState(null)

  const [
    checkVersion,
    setCheckVersion,
  ] = useState(0)

  useEffect(() => {
    let active = true

    async function checkEmployerCompany() {
      if (role !== 'employer') {
        if (active) {
          setCheckingCompany(false)
          setHasCompany(false)
          setCompanyCheckError(null)
        }

        return
      }

      if (
        !user?.id ||
        !profile ||
        profile.role !== 'employer'
      ) {
        if (active) {
          setCheckingCompany(false)
          setHasCompany(false)
        }

        return
      }

      try {
        setCheckingCompany(true)
        setCompanyCheckError(null)

        const {
          data,
          error,
        } = await supabase
          .from('companies')
          .select(`
            id,
            status
          `)
          .eq('owner_id', user.id)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (active) {
          setHasCompany(
            Boolean(data?.id)
          )
        }
      } catch (error) {
        console.error(
          'Unable to check employer company:',
          error
        )

        if (active) {
          setHasCompany(false)
          setCompanyCheckError(error)
        }
      } finally {
        if (active) {
          setCheckingCompany(false)
        }
      }
    }

    void checkEmployerCompany()

    return () => {
      active = false
    }
  }, [
    role,
    user?.id,
    profile?.role,
    checkVersion,
  ])

  if (
    loading ||
    checkingCompany
  ) {
    return <AuthLoadingScreen />
  }

  if (!user || !profile) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  if (
    profile.account_status ===
    'suspended'
  ) {
    return (
      <Navigate
        to="/account-suspended"
        replace
      />
    )
  }

  if (
    profile.account_status ===
    'deleted'
  ) {
    return (
      <Navigate
        to="/account-deleted"
        replace
      />
    )
  }

  if (profile.role !== role) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    )
  }

  if (
    role === 'employer' &&
    companyCheckError
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <section className="w-full max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm dark:bg-slate-900">
          <h1 className="text-2xl font-bold">
            Unable to check company profile
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            The company record could not be loaded. Check your connection and Supabase permissions.
          </p>

          <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {companyCheckError.message}
          </p>

          <button
            type="button"
            className="btn-primary mt-6"
            onClick={() => {
              setCheckVersion(
                (current) =>
                  current + 1
              )
            }}
          >
            Try again
          </button>
        </section>
      </main>
    )
  }

  const onboardingComplete =
    role === 'employer'
      ? hasCompany
      : Boolean(
          profile.onboarding_completed
        )

  if (onboardingComplete) {
    return (
      <Navigate
        to={getDashboardRoute(
          profile.role
        )}
        replace
      />
    )
  }

  return <Outlet />
}

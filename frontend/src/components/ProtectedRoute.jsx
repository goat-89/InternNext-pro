import {
  useEffect,
  useState,
} from 'react'

import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { getOnboardingRoute } from '../lib/authRoutes'
import { supabase } from '../lib/supabase'
import AuthLoadingScreen from './auth/AuthLoadingScreen'

export default function ProtectedRoute({
  allowedRoles,
  requireOnboarding = true,
}) {
  const location = useLocation()

  const {
    user,
    profile,
    loading,
  } = useAuth()

  const [companyExists, setCompanyExists] =
    useState(null)

  useEffect(() => {
    let active = true

    async function checkEmployerCompany() {
      if (
        !requireOnboarding ||
        !user?.id ||
        profile?.role !== 'employer'
      ) {
        if (active) {
          setCompanyExists(null)
        }
        return
      }

      setCompanyExists(null)

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (active) {
          setCompanyExists(Boolean(data?.id))
        }
      } catch (error) {
        console.error(
          'Unable to verify employer onboarding:',
          error
        )

        if (active) {
          setCompanyExists(false)
        }
      }
    }

    void checkEmployerCompany()

    return () => {
      active = false
    }
  }, [
    requireOnboarding,
    user?.id,
    profile?.role,
  ])

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (!user || !profile) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname +
            location.search,
        }}
      />
    )
  }

  if (
    profile.account_status === 'suspended'
  ) {
    return (
      <Navigate
        to="/account-suspended"
        replace
      />
    )
  }

  if (
    profile.account_status === 'deleted'
  ) {
    return (
      <Navigate
        to="/account-deleted"
        replace
      />
    )
  }

  if (
    allowedRoles?.length &&
    !allowedRoles.includes(profile.role)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    )
  }

  if (
    requireOnboarding &&
    profile.role === 'employer' &&
    companyExists === null
  ) {
    return <AuthLoadingScreen />
  }

  const onboardingComplete =
    profile.role === 'admin' ||
    (profile.role === 'employer'
      ? Boolean(
          profile.onboarding_completed &&
            companyExists
        )
      : Boolean(
          profile.onboarding_completed
        ))

  if (
    requireOnboarding &&
    !onboardingComplete
  ) {
    return (
      <Navigate
        to={getOnboardingRoute(
          profile.role
        )}
        replace
      />
    )
  }

  return <Outlet />
}

import { useEffect, useState } from 'react'
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { logoutCurrentSession } from '../../lib/authApi'
import { getPostAuthRoute } from '../../lib/authRoutes'

function getSafeNextPath(value) {
  if (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
  ) {
    return value
  }

  return ''
}

function getSafeRoleIntent(value) {
  return ['student', 'employer', 'admin'].includes(
    value
  )
    ? value
    : ''
}

function getRoleMismatchMessage(roleIntent) {
  if (roleIntent === 'student') {
    return 'Employer accounts cannot use Student login. Please use Employer login.'
  }

  if (roleIntent === 'employer') {
    return 'Student accounts cannot use Employer login. Please use Student login.'
  }

  return 'This account cannot use this sign-in area. Choose the correct Student or Employer access.'
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const {
    user,
    profile,
    loading,
    error: authError,
  } = useAuth()

  const [errorMessage, setErrorMessage] = useState('')

  const nextPath = getSafeNextPath(
    searchParams.get('next') || ''
  )
  const roleIntent = getSafeRoleIntent(
    searchParams.get('role_intent') || ''
  )

  useEffect(() => {
    const callbackError =
      searchParams.get('error_description') ||
      searchParams.get('error')

    if (callbackError) {
      setErrorMessage(
        decodeURIComponent(callbackError)
      )
    }
  }, [searchParams])

  useEffect(() => {
    if (loading || errorMessage) {
      return
    }

    if (authError) {
      setErrorMessage(
        authError.message ||
          'Unable to complete authentication.'
      )
      return
    }

    if (user && profile) {
      if (
        roleIntent &&
        profile.role !== roleIntent
      ) {
        void logoutCurrentSession().catch(
          (logoutError) => {
            console.error(
              'Role mismatch sign-out failed:',
              logoutError
            )
          }
        )
        setErrorMessage(
          getRoleMismatchMessage(roleIntent)
        )
        return
      }

      const fallbackRoute =
        getPostAuthRoute(profile)

      navigate(
        profile.role === 'student' &&
          nextPath
          ? nextPath
          : fallbackRoute,
        {
          replace: true,
        }
      )
      return
    }

    const timeoutId = window.setTimeout(() => {
      setErrorMessage(
        'The authentication link is invalid, expired, or has already been used.'
      )
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    loading,
    user,
    profile,
    authError,
    errorMessage,
    navigate,
    nextPath,
    roleIntent,
  ])

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="card w-full max-w-lg p-8 text-center">
          <h1 className="text-2xl font-bold">
            Authentication failed
          </h1>

          <p className="mt-3 text-sm text-red-600">
            {errorMessage}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="btn-primary"
            >
              Return to login
            </Link>

            <Link
              to="/verify-email"
              className="btn-ghost"
            >
              Resend verification
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="card w-full max-w-md p-8 text-center">
        <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-brand-600" />

        <h1 className="mt-5 text-xl font-bold">
          Completing authentication
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Verifying your account and loading your InternNext profile...
        </p>
      </section>
    </main>
  )
}

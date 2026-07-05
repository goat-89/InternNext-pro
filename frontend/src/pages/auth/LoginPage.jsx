import { zodResolver } from '@hookform/resolvers/zod'
import {
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import AuthShell, {
  AuthAlert,
} from '../../components/auth/AuthShell'
import { useAuth } from '../../context/AuthContext'
import { getAuthErrorMessage } from '../../lib/authErrors'
import { getPostAuthRoute } from '../../lib/authRoutes'
import { loginSchema } from '../../validation/authSchemas'

export default function LoginPage({
  expectedRole,
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const { signIn } = useAuth()

  const [submitting, setSubmitting] =
    useState(false)
  const [showPassword, setShowPassword] =
    useState(false)
  const [formMessage, setFormMessage] =
    useState('')

  const pageCopy = useMemo(() => {
    if (expectedRole === 'student') {
      return {
        eyebrow: 'Student access',
        title: 'Student sign in',
        description:
          'Continue to your profile, saved internships, and applications.',
        helper:
          'Students can also use passwordless access from the main login page.',
      }
    }

    if (expectedRole === 'employer') {
      return {
        eyebrow: 'Employer access',
        title: 'Employer sign in',
        description:
          'Manage company onboarding, internships, and applicants.',
        helper:
          'Use the employer account verified for your company workspace.',
      }
    }

    return {
      eyebrow: 'Secure access',
      title: 'Sign in to InternNext',
      description:
        'Continue with the account type selected for this secure session.',
      helper:
        'Access remains protected by verified profile roles after sign-in.',
    }
  }, [expectedRole])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values) {
    try {
      setSubmitting(true)
      setFormMessage('')

      const profile = await signIn({
        email: values.email,
        password: values.password,
        expectedRole,
      })

      toast.success(
        `Welcome back, ${
          profile.full_name || 'user'
        }.`
      )

      const requestedRoute =
        location.state?.from

      const fallbackRoute =
        getPostAuthRoute(profile)

      navigate(
        requestedRoute || fallbackRoute,
        {
          replace: true,
        }
      )
    } catch (error) {
      const message = getAuthErrorMessage(error)
      toast.error(message)
      setFormMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow={pageCopy.eyebrow}
      title={pageCopy.title}
      description={pageCopy.description}
      role={
        expectedRole === 'employer'
          ? 'employer'
          : 'student'
      }
      mode="login"
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">
          {pageCopy.eyebrow}
        </p>

        <h1 className="mt-1.5 text-xl font-black text-slate-950 dark:text-white">
          {pageCopy.title}
        </h1>

        <p className="mt-1.5 text-sm leading-5 text-slate-500 dark:text-slate-300">
          {pageCopy.description}
        </p>
      </div>

      {formMessage && (
        <div className="mt-4">
          <AuthAlert tone="error">
            {formMessage}
          </AuthAlert>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-5 space-y-4"
        noValidate
      >
        <label className="block">
          <span
            className="mb-1.5 block text-sm font-semibold"
            id="login-email-label"
          >
            Email
          </span>

          <div className="relative">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />

            <input
              {...register('email')}
              type="email"
              className="input pl-10"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              aria-labelledby="login-email-label"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email
                  ? 'login-email-error'
                  : undefined
              }
              disabled={submitting}
            />
          </div>

          {errors.email && (
            <span
              id="login-email-error"
              className="mt-1 block text-sm text-red-600"
            >
              {errors.email.message}
            </span>
          )}
        </label>

        <label className="block">
          <span
            className="mb-1.5 block text-sm font-semibold"
            id="login-password-label"
          >
            Password
          </span>

          <div className="relative">
            <Lock
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />

            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              className="input pl-10 pr-12"
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-labelledby="login-password-label"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password
                  ? 'login-password-error'
                  : undefined
              }
              disabled={submitting}
            />

            <button
              type="button"
              className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              onClick={() =>
                setShowPassword(
                  (current) => !current
                )
              }
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
              disabled={submitting}
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {errors.password && (
            <span
              id="login-password-error"
              className="mt-1 block text-sm text-red-600"
            >
              {errors.password.message}
            </span>
          )}
        </label>

        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-600"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full justify-center"
        >
          {submitting ? (
            <LoaderCircle
              className="animate-spin"
              size={18}
            />
          ) : null}
          {submitting
            ? 'Signing in...'
            : 'Sign in'}
        </button>
      </form>

      {expectedRole === 'employer' && (
        <div className="mt-4 rounded-2xl border bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Secure employer login checks your password first, then verifies the trusted employer role before opening hiring tools.
        </div>
      )}

      <p className="mt-4 text-center text-sm leading-5 text-slate-500 dark:text-slate-300">
        {pageCopy.helper}
      </p>

      {expectedRole === 'employer' && (
        <p className="mt-3 text-center text-sm">
          New employer?{' '}
          <Link
            to="/signup/employer"
            className="font-semibold text-brand-600"
          >
            Create account
          </Link>
        </p>
      )}

      {expectedRole === 'student' && (
        <div className="mt-4 text-center">
          <Link
            to="/login?role=student&mode=login"
            className="text-sm font-semibold text-brand-600"
          >
            Use passwordless login
          </Link>
        </div>
      )}
    </AuthShell>
  )
}

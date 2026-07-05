import { zodResolver } from '@hookform/resolvers/zod'
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { getAuthErrorMessage } from '../../lib/authErrors'
import { getPostAuthRoute } from '../../lib/authRoutes'
import { loginSchema } from '../../validation/authSchemas'
import { AuthAlert } from '../../components/auth/AuthShell'

export default function AdminAccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()

  const [submitting, setSubmitting] =
    useState(false)
  const [showPassword, setShowPassword] =
    useState(false)
  const [formMessage, setFormMessage] =
    useState('')

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
        expectedRole: 'admin',
      })

      toast.success('Access verified.')

      navigate(
        location.state?.from ||
          getPostAuthRoute(profile),
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
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-300/20">
              <ShieldCheck size={24} />
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-200">
                Secure access
              </p>
              <h1 className="text-2xl font-black">
                Operations sign in
              </h1>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-300">
            This entry is only for pre-authorized operational accounts. Authorization is verified after sign-in from trusted profile data.
          </p>

          {formMessage && (
            <div className="mt-5">
              <AuthAlert tone="error">
                {formMessage}
              </AuthAlert>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-7 space-y-5"
            noValidate
          >
            <label className="block">
              <span
                id="admin-email-label"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Approved email
              </span>

              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />

                <input
                  {...register('email')}
                  type="email"
                  className="input border-white/10 bg-slate-900/80 pl-10 text-white placeholder:text-slate-500"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@example.com"
                  disabled={submitting}
                  aria-labelledby="admin-email-label"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email
                      ? 'admin-email-error'
                      : undefined
                  }
                />
              </div>

              {errors.email && (
                <span
                  id="admin-email-error"
                  className="mt-1 block text-sm text-red-300"
                >
                  {errors.email.message}
                </span>
              )}
            </label>

            <label className="block">
              <span
                id="admin-password-label"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Password
              </span>

              <div className="relative">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />

                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input border-white/10 bg-slate-900/80 pl-10 pr-12 text-white placeholder:text-slate-500"
                  autoComplete="current-password"
                  placeholder="Enter password"
                  disabled={submitting}
                  aria-labelledby="admin-password-label"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password
                      ? 'admin-password-error'
                      : 'admin-password-help'
                  }
                />

                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
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

              {errors.password ? (
                <span
                  id="admin-password-error"
                  className="mt-1 block text-sm text-red-300"
                >
                  {errors.password.message}
                </span>
              ) : (
                <span
                  id="admin-password-help"
                  className="mt-1 block text-xs text-slate-500"
                >
                  MFA should be enforced through Supabase when configured.
                </span>
              )}
            </label>

            <button
              type="submit"
              className="btn-primary w-full justify-center bg-indigo-500 hover:bg-indigo-400"
              disabled={submitting}
            >
              {submitting ? (
                <LoaderCircle
                  className="animate-spin"
                  size={18}
                />
              ) : null}
              {submitting
                ? 'Verifying access...'
                : 'Continue securely'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5 text-sm">
            <Link
              to="/"
              className="font-semibold text-indigo-200 hover:text-white"
            >
              Return to public site
            </Link>

            <Link
              to="/forgot-password"
              className="font-semibold text-slate-300 hover:text-white"
            >
              Recover access
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

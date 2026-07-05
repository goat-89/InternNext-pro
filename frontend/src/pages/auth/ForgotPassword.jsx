import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import { requestPasswordReset } from '../../lib/authApi'
import { getAuthErrorMessage } from '../../lib/authErrors'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      toast.error('Enter your email address.')
      return
    }

    try {
      setSubmitting(true)

      await requestPasswordReset(normalizedEmail)

      setSubmitted(true)

      toast.success(
        'Check your email for password reset instructions.'
      )
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Forgot your password?
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Enter your email address and we will send you a secure password reset
          link.
        </p>

        {submitted ? (
          <div className="mt-8">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              When an InternNext account exists for this email, a password reset
              link will be sent.
            </div>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-5 w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Try another email
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Email address
              </span>

              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={submitting}
                required
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? 'Sending reset link…'
                : 'Send password reset link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Remember your password?{' '}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:underline"
          >
            Return to login
          </Link>
        </p>
      </section>
    </main>
  )
}

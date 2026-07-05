import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  logoutCurrentSession,
  updatePassword,
} from '../../lib/authApi'

import { getAuthErrorMessage } from '../../lib/authErrors'

export default function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] =
    useState('')

  const [submitting, setSubmitting] =
    useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (password.length < 8) {
      toast.error(
        'Password must contain at least 8 characters.'
      )
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    try {
      setSubmitting(true)

      await updatePassword(password)

      await logoutCurrentSession()

      toast.success(
        'Password updated successfully. Sign in again.'
      )

      navigate('/login', {
        replace: true,
      })
    } catch (error) {
      console.error(
        'Password update failed:',
        error
      )

      toast.error(
        getAuthErrorMessage(error)
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Create a new password
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Enter a strong new password for your InternNext account.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              New password
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              className="input"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              disabled={submitting}
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Confirm new password
            </span>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              className="input"
              placeholder="Enter password again"
              autoComplete="new-password"
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
              ? 'Updating password…'
              : 'Update password'}
          </button>
        </form>

        <Link
          to="/login"
          className="mt-6 block text-center text-sm font-semibold text-indigo-600 hover:underline"
        >
          Return to login
        </Link>
      </section>
    </main>
  )
}
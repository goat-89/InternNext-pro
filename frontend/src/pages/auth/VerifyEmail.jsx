import {
  LoaderCircle,
  MailCheck,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Link,
  useSearchParams,
} from 'react-router-dom'

import AuthShell, {
  AuthAlert,
} from '../../components/auth/AuthShell'
import { resendVerification } from '../../lib/authApi'
import { getAuthErrorMessage } from '../../lib/authErrors'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState(
    searchParams.get('email') || ''
  )
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  async function handleResend() {
    const normalizedEmail =
      email.trim().toLowerCase()

    if (!normalizedEmail) {
      toast.error('Enter your email address.')
      setMessage('Enter your email address.')
      return
    }

    try {
      setSending(true)
      setMessage('')

      await resendVerification(normalizedEmail)

      const successMessage =
        'Verification email sent. Check your inbox and spam folder.'

      toast.success(successMessage)
      setMessage(successMessage)
    } catch (error) {
      console.error(
        'Resend verification failed:',
        error
      )

      const errorMessage =
        getAuthErrorMessage(error)

      toast.error(errorMessage)
      setMessage(errorMessage)
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Verify your email"
      description="Confirm your address before continuing into InternNext."
    >
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
          <MailCheck size={28} />
        </div>

        <h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
          Verify your email
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">
          We sent a verification link to your email address. Open the link to activate your InternNext account.
        </p>
      </div>

      {message && (
        <div className="mt-5">
          <AuthAlert
            tone={
              message
                .toLowerCase()
                .includes('sent')
                ? 'success'
                : 'error'
            }
          >
            {message}
          </AuthAlert>
        </div>
      )}

      <label className="mt-7 block text-left">
        <span
          className="mb-2 block text-sm font-semibold"
          id="verify-email-label"
        >
          Email address
        </span>

        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          placeholder="you@example.com"
          className="input"
          autoComplete="email"
          inputMode="email"
          disabled={sending}
          aria-labelledby="verify-email-label"
        />
      </label>

      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        className="btn-primary mt-4 w-full justify-center"
      >
        {sending ? (
          <LoaderCircle
            className="animate-spin"
            size={18}
          />
        ) : null}
        {sending
          ? 'Sending verification email...'
          : 'Resend verification email'}
      </button>

      <p className="mt-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
        Check your spam or promotions folder when the email does not appear.
      </p>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="text-sm font-semibold text-brand-600"
        >
          Return to login
        </Link>
      </div>
    </AuthShell>
  )
}

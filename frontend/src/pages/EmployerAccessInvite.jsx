import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import toast from 'react-hot-toast'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

import {
  acceptEmployerAccessInvite,
  validateEmployerAccessInvite,
} from '../lib/employerAccessInvitesApi'

function normalizeEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function formatInviteDate(value) {
  if (!value) {
    return 'Not available'
  }

  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

export default function EmployerAccessInvite() {
  const { token = '' } = useParams()
  const navigate = useNavigate()

  const {
    user,
    profile,
    loading: authLoading,
    signOut,
  } = useAuth()

  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] =
    useState('')
  const [accepting, setAccepting] =
    useState(false)

  useEffect(() => {
    let active = true

    async function loadInvite() {
      if (!token) {
        setInvite(null)
        setErrorMessage(
          'This employer access link is missing an invite token.'
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setErrorMessage('')

        const nextInvite =
          await validateEmployerAccessInvite(token)

        if (!active) return

        setInvite(nextInvite)

        if (!nextInvite.valid) {
          if (nextInvite.alreadyUsed) {
            setErrorMessage(
              'This employer access invite has already been used.'
            )
          } else {
            setErrorMessage(
              'This employer access invite is invalid, expired, or revoked.'
            )
          }
        }
      } catch (error) {
        if (!active) return

        setErrorMessage(
          error.message ||
            'Unable to validate this employer access invite.'
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadInvite()

    return () => {
      active = false
    }
  }, [token])

  const signupPath = useMemo(() => {
    return `/signup/employer?invite=${encodeURIComponent(
      token
    )}`
  }, [token])

  const profileEmail = normalizeEmail(
    profile?.email
  )

  const inviteEmail = normalizeEmail(
    invite?.invitedEmail
  )

  const emailMatches =
    Boolean(profileEmail) &&
    Boolean(inviteEmail) &&
    profileEmail === inviteEmail

  const canAccept =
    Boolean(invite?.valid) &&
    Boolean(user) &&
    profile?.role === 'employer' &&
    emailMatches

  async function acceptInvite() {
    try {
      setAccepting(true)

      await acceptEmployerAccessInvite(token)

      toast.success(
        'Employer access invite accepted.'
      )

      navigate(
        profile?.onboarding_completed
          ? '/employer/dashboard'
          : '/onboarding/employer',
        {
          replace: true,
        }
      )
    } catch (error) {
      toast.error(
        error.message ||
          'Unable to accept this invite.'
      )
    } finally {
      setAccepting(false)
    }
  }

  async function switchAccount() {
    await signOut()
    navigate('/login/employer', {
      replace: true,
    })
  }

  if (loading || authLoading) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <section className="card p-8 text-center">
          <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-brand-600" />

          <h1 className="mt-5 text-xl font-bold">
            Checking employer invite
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Validating this access link.
          </p>
        </section>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <section className="card p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

          <h1 className="mt-5 text-2xl font-black">
            Invite unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {errorMessage}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/login/employer"
              className="btn-primary"
            >
              Employer sign in
            </Link>

            <Link
              to="/contact"
              className="btn-secondary"
            >
              Contact support
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <section className="card p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={26} />
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-wider text-brand-600">
              Employer access invite
            </p>

            <h1 className="mt-2 text-2xl font-black md:text-3xl">
              Join InternNext as an employer
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              This private invite is for the email
              address below. Use the same account to
              accept access.
            </p>
          </div>
        </div>

        <dl className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-500">
              Invited email
            </dt>
            <dd className="mt-1 font-bold text-slate-900">
              {invite.invitedEmail}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-slate-500">
              Company
            </dt>
            <dd className="mt-1 font-bold text-slate-900">
              {invite.companyName || 'Not specified'}
            </dd>
          </div>

          <div className="md:col-span-2">
            <dt className="font-semibold text-slate-500">
              Expires
            </dt>
            <dd className="mt-1 font-bold text-slate-900">
              {formatInviteDate(invite.expiresAt)}
            </dd>
          </div>
        </dl>

        {!user && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={signupPath}
              className="btn-primary"
            >
              Create employer account
            </Link>

            <Link
              to="/login/employer"
              className="btn-secondary"
            >
              Sign in as employer
            </Link>
          </div>
        )}

        {user &&
          profile?.role !== 'employer' && (
            <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              This invite can only be accepted by an
              employer account. Sign out and use the
              invited employer email address.
            </div>
          )}

        {user &&
          profile?.role === 'employer' &&
          !emailMatches && (
            <div className="mt-8 space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p>
                You are signed in as{' '}
                <strong>{profile.email}</strong>, but
                this invite is for{' '}
                <strong>{invite.invitedEmail}</strong>.
              </p>

              <button
                type="button"
                onClick={switchAccount}
                className="btn-secondary"
              >
                Switch account
              </button>
            </div>
          )}

        {canAccept && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={accepting}
              onClick={acceptInvite}
              className="btn-primary"
            >
              {accepting
                ? 'Accepting...'
                : 'Accept invite'}
            </button>

            <Link
              to="/employer/dashboard"
              className="btn-secondary"
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  Smartphone,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import AuthShell, {
  AuthAlert,
  GoogleMark,
} from '../../components/auth/AuthShell'
import { usePlatformSettings } from '../../context/PlatformSettingsContext'
import {
  fetchCurrentProfile,
  loginWithGoogleForStudent,
  loginWithPassword,
  logoutCurrentSession,
  sendStudentEmailOtp,
  sendStudentPhoneOtp,
  verifyStudentEmailOtp,
  verifyStudentPhoneOtp,
} from '../../lib/authApi'
import { getAuthErrorMessage } from '../../lib/authErrors'
import { getPostAuthRoute } from '../../lib/authRoutes'
import {
  loginSchema,
  studentEmailOtpSchema,
  studentPhoneOtpSchema,
} from '../../validation/authSchemas'

const RESEND_SECONDS = 60
const whatsappOtpEnabled =
  import.meta.env.VITE_ENABLE_WHATSAPP_OTP ===
  'true'

function getInitialMethod(searchParams) {
  const value = searchParams.get('method')

  return ['email', 'phone', 'password'].includes(
    value
  )
    ? value
    : 'email'
}

const countryCodes = [
  ['+91', 'India'],
  ['+1', 'United States'],
  ['+44', 'United Kingdom'],
  ['+61', 'Australia'],
  ['+971', 'United Arab Emirates'],
  ['+65', 'Singapore'],
]

function isSafeRelativePath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//')
  )
}

function normalizePhoneNumber(
  countryCode,
  phone
) {
  const digits = String(phone || '').replace(
    /\D/g,
    ''
  )

  const code = String(countryCode || '').trim()

  if (!code || digits.length < 6) {
    return ''
  }

  return `${code}${digits}`
}

async function loadProfileWithRetry(userId) {
  let lastError = null

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fetchCurrentProfile(userId)
    } catch (error) {
      lastError = error
      await new Promise((resolve) => {
        window.setTimeout(
          resolve,
          250 * (attempt + 1)
        )
      })
    }
  }

  throw lastError
}

export default function StudentPasswordlessAuth({
  initialMode = 'login',
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const {
    studentRegistrationEnabled,
    supportEmail,
    loading: settingsLoading,
  } = usePlatformSettings()

  const requestedRoute =
    isSafeRelativePath(location.state?.from)
      ? location.state.from
      : ''

  const [mode, setMode] =
    useState(initialMode)
  const [method, setMethod] =
    useState(() =>
      getInitialMethod(searchParams)
    )
  const [channel, setChannel] =
    useState('sms')
  const [pending, setPending] =
    useState(null)
  const [submitting, setSubmitting] =
    useState(false)
  const [googleLoading, setGoogleLoading] =
    useState(false)
  const [showPassword, setShowPassword] =
    useState(false)
  const [formMessage, setFormMessage] =
    useState('')
  const [otp, setOtp] = useState([
    '',
    '',
    '',
    '',
    '',
    '',
  ])
  const [cooldown, setCooldown] =
    useState(0)

  const otpRefs = useRef([])

  const emailForm = useForm({
    resolver: zodResolver(
      studentEmailOtpSchema
    ),
    defaultValues: {
      email: '',
    },
  })

  const phoneForm = useForm({
    resolver: zodResolver(
      studentPhoneOtpSchema
    ),
    defaultValues: {
      countryCode: '+91',
      phone: '',
    },
  })

  const passwordForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const otpValue = otp.join('')

  const destinationLabel =
    pending?.method === 'phone'
      ? pending.phone
      : pending?.email || ''

  const canCreate =
    mode !== 'signup' ||
    studentRegistrationEnabled

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    const nextMethod =
      getInitialMethod(searchParams)

    setMethod(nextMethod)
  }, [searchParams])

  useEffect(() => {
    if (
      mode === 'signup' &&
      method === 'password'
    ) {
      setMethod('email')
    }
  }, [mode, method])

  useEffect(() => {
    if (
      !whatsappOtpEnabled &&
      channel === 'whatsapp'
    ) {
      setChannel('sms')
    }
  }, [channel])

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setCooldown((current) =>
        Math.max(current - 1, 0)
      )
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [cooldown])

  useEffect(() => {
    if (pending) {
      window.setTimeout(() => {
        otpRefs.current[0]?.focus()
      }, 0)
    }
  }, [pending])

  function resetOtp() {
    setOtp(['', '', '', '', '', ''])
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setPending(null)
    setFormMessage('')
    resetOtp()
  }

  async function afterVerified(data) {
    const userId = data?.user?.id

    if (!userId) {
      throw new Error(
        'Authentication completed, but the user profile could not be loaded.'
      )
    }

    const profile =
      await loadProfileWithRetry(userId)

    if (profile.role !== 'student') {
      await logoutCurrentSession()

      throw new Error(
        'Employer accounts cannot use Student login. Please use Employer login.'
      )
    }

    toast.success('Signed in successfully.')

    navigate(
      requestedRoute ||
        getPostAuthRoute(profile),
      {
        replace: true,
      }
    )
  }

  async function sendEmail(values) {
    if (!canCreate) {
      toast.error(
        'Student registration is currently closed.'
      )
      return
    }

    const email =
      values.email.trim().toLowerCase()

    try {
      setSubmitting(true)
      setFormMessage('')

      await sendStudentEmailOtp({
        email,
        mode,
      })

      setPending({
        method: 'email',
        email,
        mode,
      })
      resetOtp()
      setCooldown(RESEND_SECONDS)

      toast.success(
        'We sent a six-digit code to your email.'
      )
      setFormMessage(
        'Code sent. Check your inbox and spam folder.'
      )
    } catch (error) {
      console.error(
        'Email OTP request failed:',
        error
      )
      const message = getAuthErrorMessage(error)
      toast.error(message)
      setFormMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function sendPhone(values) {
    if (!canCreate) {
      toast.error(
        'Student registration is currently closed.'
      )
      return
    }

    const phone = normalizePhoneNumber(
      values.countryCode,
      values.phone
    )

    if (!phone) {
      phoneForm.setError('phone', {
        message:
          'Enter a valid mobile number.',
      })
      return
    }

    try {
      setSubmitting(true)
      setFormMessage('')

      await sendStudentPhoneOtp({
        phone,
        mode,
        channel,
      })

      setPending({
        method: 'phone',
        phone,
        mode,
        channel,
      })
      resetOtp()
      setCooldown(RESEND_SECONDS)

      toast.success(
        channel === 'whatsapp'
          ? 'We requested a WhatsApp code.'
          : 'We sent an SMS code.'
      )
      setFormMessage(
        channel === 'whatsapp'
          ? 'WhatsApp delivery was requested. If it is not configured, use SMS or email.'
          : 'SMS code sent. Delivery can take a few moments.'
      )
    } catch (error) {
      console.error(
        'Phone OTP request failed:',
        error
      )
      const message = getAuthErrorMessage(error)
      toast.error(message)
      setFormMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function signInWithStudentPassword(values) {
    try {
      setSubmitting(true)
      setFormMessage('')

      const data = await loginWithPassword(
        values.email,
        values.password
      )

      await afterVerified(data)
    } catch (error) {
      console.error(
        'Student password sign-in failed:',
        error
      )
      const message = getAuthErrorMessage(error)
      toast.error(message)
      setFormMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function resendOtp() {
    if (!pending || cooldown > 0) {
      return
    }

    try {
      setSubmitting(true)
      setFormMessage('')

      if (pending.method === 'email') {
        await sendStudentEmailOtp({
          email: pending.email,
          mode: pending.mode,
        })
      } else {
        await sendStudentPhoneOtp({
          phone: pending.phone,
          mode: pending.mode,
          channel: pending.channel,
        })
      }

      resetOtp()
      setCooldown(RESEND_SECONDS)
      toast.success('A new code was sent.')
      setFormMessage('A new code was sent.')
    } catch (error) {
      console.error('OTP resend failed:', error)
      const message = getAuthErrorMessage(error)
      toast.error(message)
      setFormMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function verifyOtp(event) {
    event.preventDefault()

    if (!pending || otpValue.length !== 6) {
      toast.error('Enter the six-digit code.')
      return
    }

    try {
      setSubmitting(true)
      setFormMessage('')

      const data =
        pending.method === 'email'
          ? await verifyStudentEmailOtp({
              email: pending.email,
              token: otpValue,
            })
          : await verifyStudentPhoneOtp({
              phone: pending.phone,
              token: otpValue,
            })

      await afterVerified(data)
    } catch (error) {
      console.error(
        'OTP verification failed:',
        error
      )
      const message = getAuthErrorMessage(error)
      toast.error(message)
      setFormMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function continueWithGoogle() {
    try {
      setGoogleLoading(true)
      setFormMessage('')

      await loginWithGoogleForStudent(
        requestedRoute
      )
    } catch (error) {
      console.error(
        'Google sign-in failed:',
        error
      )
      const message = getAuthErrorMessage(error)
      toast.error(message)
      setFormMessage(message)
      setGoogleLoading(false)
    }
  }

  function updateOtp(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1)

    setOtp((current) => {
      const next = [...current]
      next[index] = digit
      return next
    })

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpPaste(event) {
    const digits = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6)

    if (!digits) {
      return
    }

    event.preventDefault()

    const next = ['', '', '', '', '', '']

    digits.split('').forEach((digit, index) => {
      next[index] = digit
    })

    setOtp(next)

    otpRefs.current[
      Math.min(digits.length, 5)
    ]?.focus()
  }

  function handleOtpKeyDown(event, index) {
    if (
      event.key === 'Backspace' &&
      !otp[index] &&
      index > 0
    ) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const pageTitle =
    mode === 'signup'
      ? 'Create your student account'
      : 'Student sign in'

  const helperCopy =
    mode === 'signup'
      ? 'Create a student account with a verified email, phone number, or Google account.'
      : 'Use a secure one-time code, password, or Google to continue.'

  const methodDescription = useMemo(() => {
    if (pending?.method === 'phone') {
      return pending.channel === 'whatsapp'
        ? 'Enter the WhatsApp code sent to your mobile number.'
        : 'Enter the SMS code sent to your mobile number.'
    }

    return 'Enter the email code sent to your inbox.'
  }, [pending])

  if (settingsLoading) {
    return (
      <main className="grid min-h-[70vh] place-items-center px-4">
        <section className="card w-full max-w-md p-8 text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-4 font-semibold text-slate-500">
            Checking student access...
          </p>
        </section>
      </main>
    )
  }

  return (
    <AuthShell
      eyebrow="Student access"
      title="Turn your skills into real experience"
      description="Continue with a secure one-time code or Google, then build your profile and track your applications."
      role="student"
      mode={mode}
    >
          <div>
            <h2 className="text-2xl font-black">
              {pending
                ? 'Verify your code'
                : pageTitle}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {pending
                ? methodDescription
                : helperCopy}
            </p>
          </div>

          {formMessage && (
            <div className="mt-5">
              <AuthAlert
                tone={
                  formMessage.toLowerCase().includes('sent')
                    ? 'success'
                    : 'error'
                }
              >
                {formMessage}
              </AuthAlert>
            </div>
          )}

          {!pending && (
            <>
              <div
                className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-950"
                role="tablist"
                aria-label="Choose login or signup"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  className={
                    mode === 'login'
                      ? 'btn-primary'
                      : 'btn'
                  }
                  onClick={() =>
                    switchMode('login')
                  }
                >
                  Log in
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  className={
                    mode === 'signup'
                      ? 'btn-primary'
                      : 'btn'
                  }
                  onClick={() =>
                    switchMode('signup')
                  }
                >
                  Create account
                </button>
              </div>

              {mode === 'signup' &&
                !studentRegistrationEnabled && (
                  <div className="mt-5">
                    <AuthAlert tone="warning">
                    Student registration is currently closed. Existing students can still log in.
                    {supportEmail && (
                      <>
                        {' '}
                        Contact{' '}
                        <a
                          href={`mailto:${supportEmail}`}
                          className="font-semibold underline"
                        >
                          {supportEmail}
                        </a>
                        .
                      </>
                    )}
                    </AuthAlert>
                  </div>
                )}

              <button
                type="button"
                onClick={continueWithGoogle}
                disabled={googleLoading}
                className="btn-secondary mt-6 w-full justify-center border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-100"
              >
                {googleLoading ? (
                  <LoaderCircle
                    className="animate-spin"
                    size={18}
                  />
                ) : (
                  <GoogleMark />
                )}
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                or continue with
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <div
                className={
                  mode === 'login'
                    ? 'grid grid-cols-3 gap-2'
                    : 'grid grid-cols-2 gap-2'
                }
                role="tablist"
                aria-label="Choose authentication method"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === 'email'}
                  className={
                    method === 'email'
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }
                  onClick={() =>
                    setMethod('email')
                  }
                >
                  <Mail size={18} />
                  Email
                </button>

                {mode === 'login' && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={
                      method === 'password'
                    }
                    className={
                      method === 'password'
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }
                    onClick={() =>
                      setMethod('password')
                    }
                  >
                    <Lock size={18} />
                    Password
                  </button>
                )}

                <button
                  type="button"
                  role="tab"
                  aria-selected={method === 'phone'}
                  className={
                    method === 'phone'
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }
                  onClick={() =>
                    setMethod('phone')
                  }
                >
                  <Smartphone size={18} />
                  Mobile
                </button>
              </div>

              {method === 'email' ? (
                <form
                  onSubmit={emailForm.handleSubmit(
                    sendEmail
                  )}
                  className="mt-6 space-y-5"
                  noValidate
                >
                  <label className="block">
                    <span
                      className="mb-2 block text-sm font-semibold"
                      id="student-email-label"
                    >
                      Email address
                    </span>
                    <input
                      {...emailForm.register(
                        'email'
                      )}
                      type="email"
                      className="input"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      disabled={submitting}
                      aria-labelledby="student-email-label"
                      aria-invalid={
                        Boolean(
                          emailForm.formState.errors
                            .email
                        )
                      }
                      aria-describedby={
                        emailForm.formState.errors
                          .email
                          ? 'student-email-error'
                          : undefined
                      }
                    />
                    {emailForm.formState.errors
                      .email && (
                      <span
                        id="student-email-error"
                        className="mt-1 block text-sm text-red-600"
                      >
                        {
                          emailForm.formState
                            .errors.email
                            .message
                        }
                      </span>
                    )}
                  </label>

                  <button
                    type="submit"
                    disabled={
                      submitting || !canCreate
                    }
                    className="btn-primary w-full"
                  >
                    {submitting ? (
                      <LoaderCircle
                        className="animate-spin"
                        size={18}
                      />
                    ) : null}
                    Continue with email OTP
                  </button>
                </form>
              ) : method === 'password' ? (
                <form
                  onSubmit={passwordForm.handleSubmit(
                    signInWithStudentPassword
                  )}
                  className="mt-6 space-y-5"
                  noValidate
                >
                  <label className="block">
                    <span
                      className="mb-2 block text-sm font-semibold"
                      id="student-password-email-label"
                    >
                      Email address
                    </span>

                    <div className="relative">
                      <Mail
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />

                      <input
                        {...passwordForm.register(
                          'email'
                        )}
                        type="email"
                        className="input pl-10"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="you@example.com"
                        disabled={submitting}
                        aria-labelledby="student-password-email-label"
                        aria-invalid={Boolean(
                          passwordForm.formState
                            .errors.email
                        )}
                        aria-describedby={
                          passwordForm.formState
                            .errors.email
                            ? 'student-password-email-error'
                            : undefined
                        }
                      />
                    </div>

                    {passwordForm.formState.errors
                      .email && (
                      <span
                        id="student-password-email-error"
                        className="mt-1 block text-sm text-red-600"
                      >
                        {
                          passwordForm.formState
                            .errors.email
                            .message
                        }
                      </span>
                    )}
                  </label>

                  <label className="block">
                    <span
                      className="mb-2 block text-sm font-semibold"
                      id="student-password-label"
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
                        {...passwordForm.register(
                          'password'
                        )}
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        className="input pl-10 pr-12"
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        disabled={submitting}
                        aria-labelledby="student-password-label"
                        aria-invalid={Boolean(
                          passwordForm.formState
                            .errors.password
                        )}
                        aria-describedby={
                          passwordForm.formState
                            .errors.password
                            ? 'student-password-error'
                            : undefined
                        }
                      />

                      <button
                        type="button"
                        className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        onClick={() =>
                          setShowPassword(
                            (current) =>
                              !current
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

                    {passwordForm.formState.errors
                      .password && (
                      <span
                        id="student-password-error"
                        className="mt-1 block text-sm text-red-600"
                      >
                        {
                          passwordForm.formState
                            .errors.password
                            .message
                        }
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
                    className="btn-primary w-full"
                  >
                    {submitting ? (
                      <LoaderCircle
                        className="animate-spin"
                        size={18}
                      />
                    ) : null}
                    Sign in securely
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={phoneForm.handleSubmit(
                    sendPhone
                  )}
                  className="mt-6 space-y-5"
                  noValidate
                >
                  <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold">
                        Country
                      </span>
                      <select
                        {...phoneForm.register(
                          'countryCode'
                        )}
                        className="input"
                        disabled={submitting}
                        aria-label="Country code"
                      >
                        {countryCodes.map(
                          ([code, name]) => (
                            <option
                              key={code}
                              value={code}
                            >
                              {name} {code}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold">
                        Mobile number
                      </span>
                      <input
                        {...phoneForm.register(
                          'phone'
                        )}
                        type="tel"
                        className="input"
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="98765 43210"
                        disabled={submitting}
                        aria-invalid={
                          Boolean(
                            phoneForm.formState
                              .errors.phone
                          )
                        }
                      />
                    </label>
                  </div>

                  {(phoneForm.formState.errors
                    .countryCode ||
                    phoneForm.formState.errors
                      .phone) && (
                    <p className="text-sm text-red-600">
                      {phoneForm.formState.errors
                        .countryCode?.message ||
                        phoneForm.formState
                          .errors.phone
                          ?.message}
                    </p>
                  )}

                  <div>
                    <p className="mb-2 text-sm font-semibold">
                      Delivery method
                    </p>

                    <div
                      className={
                        whatsappOtpEnabled
                          ? 'grid grid-cols-2 gap-2'
                          : 'grid gap-2'
                      }
                      role="group"
                      aria-label="OTP delivery method"
                    >
                      <button
                        type="button"
                        className={
                          channel === 'sms'
                            ? 'btn-primary'
                            : 'btn-secondary'
                        }
                        onClick={() =>
                          setChannel('sms')
                        }
                        disabled={submitting}
                      >
                        SMS
                      </button>

                      {whatsappOtpEnabled && (
                        <button
                          type="button"
                          className={
                            channel === 'whatsapp'
                              ? 'btn-primary'
                              : 'btn-secondary'
                          }
                          onClick={() =>
                            setChannel(
                              'whatsapp'
                            )
                          }
                          disabled={submitting}
                        >
                          WhatsApp
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      submitting || !canCreate
                    }
                    className="btn-primary w-full"
                  >
                    {submitting ? (
                      <LoaderCircle
                        className="animate-spin"
                        size={18}
                      />
                    ) : null}
                    Send mobile OTP
                  </button>
                </form>
              )}
            </>
          )}

          {pending && (
            <form
              onSubmit={verifyOtp}
              className="mt-7 space-y-6"
            >
              <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                Code sent to{' '}
                <b className="break-all">
                  {destinationLabel}
                </b>
              </div>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">
                  Six-digit OTP
                </legend>

                <div
                  className="grid grid-cols-6 gap-1.5 sm:gap-2"
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] =
                          element
                      }}
                      value={digit}
                      onChange={(event) =>
                        updateOtp(
                          index,
                          event.target.value
                        )
                      }
                      onKeyDown={(event) =>
                        handleOtpKeyDown(
                          event,
                          index
                        )
                      }
                      inputMode="numeric"
                      autoComplete={
                        index === 0
                          ? 'one-time-code'
                          : 'off'
                      }
                      maxLength={1}
                      className="h-11 min-w-0 rounded-2xl border bg-white px-0 text-center text-lg font-black outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:bg-slate-950 dark:focus:ring-brand-900 sm:h-12 sm:text-xl"
                      aria-label={`OTP digit ${index + 1}`}
                      disabled={submitting}
                    />
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={
                  submitting ||
                  otpValue.length !== 6
                }
                className="btn-primary w-full"
              >
                {submitting ? (
                  <LoaderCircle
                    className="animate-spin"
                    size={18}
                  />
                ) : null}
                Verify and continue
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  className="font-semibold text-brand-600 disabled:text-slate-400"
                  onClick={resendOtp}
                  disabled={
                    submitting || cooldown > 0
                  }
                >
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : 'Resend code'}
                </button>

                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300"
                  onClick={() => {
                    setPending(null)
                    resetOtp()
                  }}
                  disabled={submitting}
                >
                  <ArrowLeft size={16} />
                  Change details
                </button>
              </div>
            </form>
          )}

          <p className="mt-7 text-center text-sm text-slate-500">
            {mode === 'signup'
              ? 'Already registered?'
              : 'New to InternNext?'}{' '}
            <button
              type="button"
              className="inline-flex min-h-10 items-center px-2 font-semibold text-brand-600"
              onClick={() =>
                switchMode(
                  mode === 'signup'
                    ? 'login'
                    : 'signup'
                )
              }
            >
              {mode === 'signup'
                ? 'Log in'
                : 'Create account'}
            </button>
          </p>

          <p className="mt-3 text-center text-xs text-slate-400">
            Employers should use the business access flow.
          </p>

          <div className="mt-5 flex justify-center gap-4 text-sm">
            <Link
              to="/login?role=employer&mode=login"
              className="font-semibold text-brand-600"
            >
              Employer login
            </Link>
          </div>
    </AuthShell>
  )
}

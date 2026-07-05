import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react'
import {
  cloneElement,
  isValidElement,
  useEffect,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import AuthShell, {
  AuthAlert,
} from '../../components/auth/AuthShell'
import { useAuth } from '../../context/AuthContext'
import { usePlatformSettings } from '../../context/PlatformSettingsContext'
import { getAuthErrorMessage } from '../../lib/authErrors'
import {
  acceptEmployerAccessInvite,
  validateEmployerAccessInvite,
} from '../../lib/employerAccessInvitesApi'
import { employerSignupSchema } from '../../validation/authSchemas'

const fieldIcons = {
  contactPerson: UserRound,
  companyName: Building2,
  email: Mail,
  phone: Phone,
  password: Lock,
  confirmPassword: Lock,
}

export default function EmployerSignup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const inviteToken =
    searchParams.get('invite')?.trim() || ''

  const { signUpEmployer } = useAuth()

  const {
    employerRegistrationEnabled,
    supportEmail,
    loading: settingsLoading,
  } = usePlatformSettings()

  const [submitting, setSubmitting] =
    useState(false)
  const [showPassword, setShowPassword] =
    useState(false)
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false)
  const [formMessage, setFormMessage] =
    useState('')
  const [inviteState, setInviteState] =
    useState({
      loading: Boolean(inviteToken),
      invite: null,
      error: '',
    })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      employerSignupSchema
    ),
    defaultValues: {
      contactPerson: '',
      companyName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false,
    },
  })

  useEffect(() => {
    let active = true

    async function loadInvite() {
      if (!inviteToken) {
        setInviteState({
          loading: false,
          invite: null,
          error: '',
        })
        return
      }

      try {
        setInviteState({
          loading: true,
          invite: null,
          error: '',
        })

        const invite =
          await validateEmployerAccessInvite(
            inviteToken
          )

        if (!active) {
          return
        }

        if (!invite.valid) {
          setInviteState({
            loading: false,
            invite,
            error: invite.alreadyUsed
              ? 'This employer access invite has already been used.'
              : 'This employer access invite is invalid, expired, or revoked.',
          })
          return
        }

        setValue('email', invite.invitedEmail, {
          shouldValidate: true,
        })

        if (invite.companyName) {
          setValue(
            'companyName',
            invite.companyName,
            {
              shouldValidate: true,
            }
          )
        }

        setInviteState({
          loading: false,
          invite,
          error: '',
        })
      } catch (error) {
        if (!active) {
          return
        }

        setInviteState({
          loading: false,
          invite: null,
          error:
            error.message ||
            'Unable to validate this employer access invite.',
        })
      }
    }

    void loadInvite()

    return () => {
      active = false
    }
  }, [inviteToken, setValue])

  const hasValidInvite = Boolean(
    inviteState.invite?.valid
  )

  async function onSubmit(values) {
    if (
      !employerRegistrationEnabled &&
      !hasValidInvite
    ) {
      const message =
        'Employer registration is currently closed.'

      toast.error(message)
      setFormMessage(message)
      return
    }

    try {
      setSubmitting(true)
      setFormMessage('')

      const result =
        await signUpEmployer(values)

      if (result?.session) {
        if (inviteToken) {
          await acceptEmployerAccessInvite(
            inviteToken
          )
        }

        toast.success(
          'Employer account created.'
        )

        navigate('/onboarding/employer', {
          replace: true,
        })
        return
      }

      toast.success(
        inviteToken
          ? 'Account created. Check your email to verify it, then open the invite link again.'
          : 'Account created. Check your email to verify it.'
      )

      navigate(
        `/verify-email?email=${encodeURIComponent(
          values.email
        )}`,
        {
          replace: true,
        }
      )
    } catch (error) {
      const message =
        getAuthErrorMessage(error)

      toast.error(message)
      setFormMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (settingsLoading || inviteState.loading) {
    return (
      <AuthShell
        eyebrow="Employer access"
        title="Build your next team with emerging talent"
        description="Checking whether employer registration is available."
        role="employer"
        mode="signup"
      >
        <div className="py-8 text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-4 font-semibold text-slate-500">
            Checking registration availability...
          </p>
        </div>
      </AuthShell>
    )
  }

  if (inviteState.error) {
    return (
      <AuthShell
        eyebrow="Employer access"
        title="This employer invite cannot be used"
        description="Invite validation happens before account creation."
        role="employer"
        mode="signup"
      >
        <AuthAlert tone="error">
          {inviteState.error}
        </AuthAlert>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            to="/login?role=employer&mode=login"
            className="btn-primary justify-center"
          >
            Employer sign in
          </Link>

          <Link
            to="/contact"
            className="btn-secondary justify-center"
          >
            Contact support
          </Link>
        </div>
      </AuthShell>
    )
  }

  if (
    !employerRegistrationEnabled &&
    !hasValidInvite
  ) {
    return (
      <AuthShell
        eyebrow="Employer access"
        title="Employer registration is temporarily unavailable"
        description="Existing employers can still sign in."
        role="employer"
        mode="signup"
      >
        <AuthAlert tone="warning">
          New employer accounts cannot be created at the moment.
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

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            to="/login?role=employer&mode=login"
            className="btn-primary justify-center"
          >
            Employer sign in
          </Link>

          <Link
            to="/"
            className="btn-secondary justify-center"
          >
            Back to home
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Employer access"
      title="Build your next team with emerging talent"
      description="Create a verified hiring account and complete company onboarding after signup."
      role="employer"
      mode="signup"
    >
      <div>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-600">
          Employer registration
        </p>

        <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
          Create employer account
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
          {hasValidInvite
            ? 'Use the invited email address to create your employer account.'
            : 'Register your hiring account and submit your company for verification.'}
        </p>
      </div>

      <div
        className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-950"
        role="tablist"
        aria-label="Employer access mode"
      >
        <Link
          to="/login?role=employer&mode=login"
          role="tab"
          aria-selected="false"
          className="btn justify-center"
        >
          Log in
        </Link>

        <Link
          to="/signup/employer"
          role="tab"
          aria-selected="true"
          className="btn-primary justify-center"
        >
          Create account
        </Link>
      </div>

      {hasValidInvite && (
        <div className="mt-5">
          <AuthAlert tone="success">
            This signup is linked to an employer access invite for{' '}
            <strong>
              {
                inviteState.invite
                  .invitedEmail
              }
            </strong>
            .
          </AuthAlert>
        </div>
      )}

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
        <Field
          id="employer-contact-person"
          label="Contact person"
          error={
            errors.contactPerson?.message
          }
          iconKey="contactPerson"
        >
          <input
            {...register('contactPerson')}
            className="input pl-10"
            autoComplete="name"
            placeholder="Hiring manager name"
            disabled={submitting}
          />
        </Field>

        <Field
          id="employer-company-name"
          label="Company name"
          error={errors.companyName?.message}
          iconKey="companyName"
        >
          <input
            {...register('companyName')}
            className="input pl-10"
            autoComplete="organization"
            placeholder="Company or organisation"
            readOnly={
              hasValidInvite &&
              Boolean(
                inviteState.invite?.companyName
              )
            }
            disabled={submitting}
          />
        </Field>

        <Field
          id="employer-email"
          label="Business email"
          error={errors.email?.message}
          iconKey="email"
        >
          <input
            {...register('email')}
            type="email"
            className="input pl-10"
            autoComplete="email"
            inputMode="email"
            placeholder="hiring@company.com"
            readOnly={hasValidInvite}
            disabled={submitting}
          />
        </Field>

        <Field
          id="employer-phone"
          label="Phone number"
          error={errors.phone?.message}
          iconKey="phone"
        >
          <input
            {...register('phone')}
            type="tel"
            className="input pl-10"
            autoComplete="tel"
            inputMode="tel"
            placeholder="98765 43210"
            disabled={submitting}
          />
        </Field>

        <Field
          id="employer-password"
          label="Password"
          error={errors.password?.message}
          iconKey="password"
        >
          <PasswordField
            register={register('password')}
            visible={showPassword}
            onToggle={() =>
              setShowPassword(
                (current) => !current
              )
            }
            disabled={submitting}
            autoComplete="new-password"
          />
        </Field>

        <Field
          id="employer-confirm-password"
          label="Confirm password"
          error={
            errors.confirmPassword?.message
          }
          iconKey="confirmPassword"
        >
          <PasswordField
            register={register(
              'confirmPassword'
            )}
            visible={showConfirmPassword}
            onToggle={() =>
              setShowConfirmPassword(
                (current) => !current
              )
            }
            disabled={submitting}
            autoComplete="new-password"
          />
        </Field>

        <label className="flex items-start gap-3 rounded-2xl border bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          <input
            {...register('acceptedTerms')}
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            disabled={submitting}
          />

          <span>
            I accept the{' '}
            <Link
              to="/terms"
              className="font-semibold text-brand-600"
            >
              Terms
            </Link>{' '}
            and{' '}
            <Link
              to="/privacy"
              className="font-semibold text-brand-600"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {errors.acceptedTerms && (
          <p className="text-sm text-red-600">
            {errors.acceptedTerms.message}
          </p>
        )}

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
            ? 'Creating account...'
            : 'Create employer account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        Already hiring with us?{' '}
        <Link
          to="/login?role=employer&mode=login"
          className="font-semibold text-brand-600"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

function PasswordField({
  register,
  visible,
  onToggle,
  disabled,
  autoComplete,
  ...fieldProps
}) {
  return (
    <div className="relative">
      <input
        {...register}
        {...fieldProps}
        type={visible ? 'text' : 'password'}
        className="input pl-10 pr-12"
        autoComplete={autoComplete}
        placeholder="Create a secure password"
        disabled={disabled}
      />

      <button
        type="button"
        className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        onClick={onToggle}
        aria-label={
          visible
            ? 'Hide password'
            : 'Show password'
        }
        disabled={disabled}
      >
        {visible ? (
          <EyeOff size={18} />
        ) : (
          <Eye size={18} />
        )}
      </button>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  iconKey,
  children,
}) {
  const Icon = fieldIcons[iconKey]
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const enhancedChild = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-labelledby': labelId,
        'aria-invalid': Boolean(error),
        'aria-describedby': error
          ? errorId
          : undefined,
      })
    : children

  return (
    <label className="block">
      <span
        id={labelId}
        className="mb-2 block text-sm font-semibold"
      >
        {label}
      </span>

      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400"
            size={18}
          />
        )}

        {enhancedChild}
      </div>

      {error && (
        <span
          id={errorId}
          className="mt-1 block text-sm text-red-600"
        >
          {error}
        </span>
      )}
    </label>
  )
}

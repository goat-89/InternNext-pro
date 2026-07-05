import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { usePlatformSettings } from '../../context/PlatformSettingsContext';
import { getAuthErrorMessage } from '../../lib/authErrors';
import { studentSignupSchema } from '../../validation/authSchemas';

export default function StudentSignup() {
const navigate = useNavigate();

const { signUpStudent } =
useAuth();

const {
studentRegistrationEnabled,
supportEmail,
loading: settingsLoading,
} = usePlatformSettings();

const [
submitting,
setSubmitting,
] = useState(false);

const {
register,
handleSubmit,
formState: { errors },
} = useForm({
resolver:
zodResolver(
studentSignupSchema
),


defaultValues: {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
},


});

async function onSubmit(values) {
if (
!studentRegistrationEnabled
) {
toast.error(
'Student registration is currently closed.'
);


  return;
}

try {
  setSubmitting(true);

  const data =
    await signUpStudent(values);

  toast.success(
    'Account created. Check your email to verify it.'
  );

  navigate(
    `/verify-email?email=${encodeURIComponent(
      values.email
    )}`,
    {
      replace: true,

      state: {
        hasSession:
          Boolean(
            data.session
          ),
      },
    }
  );
} catch (error) {
  toast.error(
    getAuthErrorMessage(
      error
    )
  );
} finally {
  setSubmitting(false);
}


}

if (settingsLoading) {
return ( <main className="mx-auto max-w-xl px-4 py-12"> <div className="card p-8 text-center"> <p className="font-semibold text-slate-500">
Checking registration
availability… </p> </div> </main>
);
}

if (
!studentRegistrationEnabled
) {
return ( <main className="mx-auto max-w-xl px-4 py-12"> <div className="card p-6 text-center md:p-8"> <p className="text-sm font-black uppercase tracking-wider text-amber-600">
Registration closed </p>


      <h1 className="mt-3 text-2xl font-black">
        Student registration is
        temporarily unavailable
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        New student accounts
        cannot be created at the
        moment. Existing students
        can continue to sign in.
      </p>

      {supportEmail && (
        <p className="mt-4 text-sm text-slate-500">
          Need help?{' '}
          <a
            href={
              'mailto:' +
              supportEmail
            }
            className="font-semibold text-brand-600"
          >
            {supportEmail}
          </a>
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/login/student"
          className="btn-primary"
        >
          Student sign in
        </Link>

        <Link
          to="/"
          className="btn-secondary"
        >
          Back to home
        </Link>
      </div>
    </div>
  </main>
);


}

return ( <main className="mx-auto max-w-xl px-4 py-12"> <div className="card p-6 md:p-8"> <h1 className="text-2xl font-bold">
Create your student account </h1>


    <p className="mt-2 text-sm text-slate-500">
      Discover verified
      internships and track every
      application.
    </p>

    <form
      onSubmit={
        handleSubmit(
          onSubmit
        )
      }
      className="mt-8 space-y-5"
    >
      <Field
        label="Full name"
        error={errors.fullName?.message}
      >
        <input
          {...register('fullName')}
          className="input"
          autoComplete="name"
        />
      </Field>


      <Field
        label="Email"
        error={
          errors.email
            ?.message
        }
      >
        <input
          {...register(
            'email'
          )}
          type="email"
          className="input"
          autoComplete="email"
        />
      </Field>

      <Field
        label="Mobile number"
        error={
          errors.phone
            ?.message
        }
      >
        <input
          {...register(
            'phone'
          )}
          type="tel"
          className="input"
          autoComplete="tel"
        />
      </Field>

      <Field
        label="Password"
        error={
          errors.password
            ?.message
        }
      >
        <input
          {...register(
            'password'
          )}
          type="password"
          className="input"
          autoComplete="new-password"
        />
      </Field>

      <Field
        label="Confirm password"
        error={
          errors
            .confirmPassword
            ?.message
        }
      >
        <input
          {...register(
            'confirmPassword'
          )}
          type="password"
          className="input"
          autoComplete="new-password"
        />
      </Field>

      <label className="flex items-start gap-3">
        <input
          {...register(
            'acceptedTerms'
          )}
          type="checkbox"
          className="mt-1"
        />

        <span className="text-sm">
          I accept the Terms and
          Privacy Policy.
        </span>
      </label>

      {errors.acceptedTerms && (
        <p className="text-sm text-red-600">
          {
            errors
              .acceptedTerms
              .message
          }
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting
          ? 'Creating account…'
          : 'Create student account'}
      </button>
    </form>

    <p className="mt-6 text-center text-sm">
      Already registered?{' '}
      <Link
        to="/login/student"
        className="font-semibold text-brand-600"
      >
        Sign in
      </Link>
    </p>
  </div>
</main>


);
}

function Field({
label,
error,
children,
}) {
return ( <label className="block"> <span className="mb-2 block text-sm font-medium">
{label} </span>


  {children}

  {error && (
    <span className="mt-1 block text-sm text-red-600">
      {error}
    </span>
  )}
</label>


);
}

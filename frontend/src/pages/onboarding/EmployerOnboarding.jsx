import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { completeEmployerOnboarding } from '../../lib/authApi'

const initialForm = {
  fullName: '',
  phone: '',

  designation: '',
  department: '',
  linkedinUrl: '',

  companyName: '',
  legalName: '',
  description: '',
  industry: '',
  companyType: '',
  companySize: '',
  foundedYear: '',

  website: '',
  businessEmail: '',
  companyPhone: '',
  headquarters: '',

  gstNumber: '',
  registrationNumber: '',
}

export default function EmployerOnboarding() {
  const navigate = useNavigate()

  const {
    user,
    profile,
    refreshProfile,
  } = useAuth()

  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm((current) => ({
      ...current,

      fullName:
        profile?.full_name ||
        current.fullName,

      phone:
        profile?.phone ||
        current.phone,

      companyName:
        user?.user_metadata?.company_name ||
        current.companyName,

      businessEmail:
        user?.email ||
        current.businessEmail,
    }))
  }, [user, profile])

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function validateForm() {
    if (form.fullName.trim().length < 2) {
      return 'Enter the contact person name.'
    }

    if (form.companyName.trim().length < 2) {
      return 'Enter the company name.'
    }

    if (form.description.trim().length < 20) {
      return 'Company description must contain at least 20 characters.'
    }

    if (!form.industry.trim()) {
      return 'Select or enter the company industry.'
    }

    if (!form.businessEmail.trim()) {
      return 'Enter the business email address.'
    }

    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = validateForm()

    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      setLoading(true)

      await completeEmployerOnboarding(form)

      await refreshProfile()

      toast.success(
        'Company profile submitted for verification.'
      )

      navigate('/employer/dashboard', {
        replace: true,
      })
    } catch (error) {
      console.error(
        'Employer onboarding failed:',
        error
      )

      toast.error(
        error?.message ||
          'Unable to complete employer onboarding.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8"
      >
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Employer onboarding
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            Create your company profile
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Add your recruiter and company details. The InternNext team can review the company before internships are published.
          </p>
        </header>

        <section className="mt-10">
          <SectionTitle
            title="Recruiter information"
            description="Information about the person managing this employer account."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="Contact person"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
              autoComplete="name"
            />

            <Field
              label="Phone number"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="tel"
              autoComplete="tel"
            />

            <Field
              label="Designation"
              name="designation"
              value={form.designation}
              onChange={handleChange}
              placeholder="HR Manager"
            />

            <Field
              label="Department"
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="Human Resources"
            />

            <Field
              label="LinkedIn profile"
              name="linkedinUrl"
              value={form.linkedinUrl}
              onChange={handleChange}
              type="url"
              placeholder="https://linkedin.com/in/..."
              className="md:col-span-2"
            />
          </div>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-10 dark:border-slate-800">
          <SectionTitle
            title="Company details"
            description="These details will appear on your public employer profile."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="Company name"
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              required
            />

            <Field
              label="Legal company name"
              name="legalName"
              value={form.legalName}
              onChange={handleChange}
            />

            <Field
              label="Industry"
              name="industry"
              value={form.industry}
              onChange={handleChange}
              required
              placeholder="Information Technology"
            />

            <SelectField
              label="Company type"
              name="companyType"
              value={form.companyType}
              onChange={handleChange}
              options={[
                '',
                'Private company',
                'Public company',
                'Startup',
                'Nonprofit',
                'Government',
                'Educational institution',
              ]}
            />

            <SelectField
              label="Company size"
              name="companySize"
              value={form.companySize}
              onChange={handleChange}
              options={[
                '',
                '1-10',
                '11-50',
                '51-200',
                '201-500',
                '501-1000',
                '1001-5000',
                '5000+',
              ]}
            />

            <Field
              label="Founded year"
              name="foundedYear"
              value={form.foundedYear}
              onChange={handleChange}
              type="number"
              min="1700"
              max="2100"
              placeholder="2022"
            />

            <TextAreaField
              label="Company description"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              className="md:col-span-2"
              placeholder="Describe the company, products, culture, and opportunities..."
            />
          </div>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-10 dark:border-slate-800">
          <SectionTitle
            title="Contact and location"
            description="Provide official contact information for verification."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="Business email"
              name="businessEmail"
              value={form.businessEmail}
              onChange={handleChange}
              type="email"
              required
              autoComplete="email"
            />

            <Field
              label="Company phone"
              name="companyPhone"
              value={form.companyPhone}
              onChange={handleChange}
              type="tel"
            />

            <Field
              label="Website"
              name="website"
              value={form.website}
              onChange={handleChange}
              type="url"
              placeholder="https://company.com"
            />

            <Field
              label="Headquarters"
              name="headquarters"
              value={form.headquarters}
              onChange={handleChange}
              placeholder="Pune, Maharashtra"
            />
          </div>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-10 dark:border-slate-800">
          <SectionTitle
            title="Verification details"
            description="Optional during onboarding. These may be required before company approval."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="GST number"
              name="gstNumber"
              value={form.gstNumber}
              onChange={handleChange}
            />

            <Field
              label="Registration number"
              name="registrationNumber"
              value={form.registrationNumber}
              onChange={handleChange}
            />
          </div>
        </section>

        <div className="mt-10 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/')}
            disabled={loading}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? 'Submitting company…'
              : 'Complete employer onboarding'}
          </button>
        </div>
      </form>
    </main>
  )
}

function SectionTitle({
  title,
  description,
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  )
}

function Field({
  label,
  className = '',
  ...inputProps
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>

      <input
        {...inputProps}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  )
}

function SelectField({
  label,
  options,
  ...selectProps
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>

      <select
        {...selectProps}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        {options.map((option) => (
          <option
            key={option || 'empty'}
            value={option}
          >
            {option || 'Select an option'}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextAreaField({
  label,
  className = '',
  ...textareaProps
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>

      <textarea
        {...textareaProps}
        rows={5}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  )
}
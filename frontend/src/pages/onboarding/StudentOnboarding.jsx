import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { completeStudentOnboarding } from '../../lib/authApi'

const initialForm = {
  fullName: '',
  phone: '',
  college: '',
  university: '',
  degree: '',
  specialization: '',
  passingYear: '',
  bio: '',
  skills: '',
  preferredCategories: '',
  preferredLocations: '',
  preferredWorkModes: [],
  availableImmediately: false,
  portfolioUrl: '',
  githubUrl: '',
  linkedinUrl: '',
}

function commaSeparatedToArray(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function StudentOnboarding() {
  const navigate = useNavigate()

  const {
    profile,
    refreshProfile,
  } = useAuth()

  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setForm((current) => ({
      ...current,
      fullName:
        profile?.full_name ||
        current.fullName,
      phone:
        profile?.phone ||
        current.phone,
    }))
  }, [profile])

  function handleChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))
  }

  function handleWorkModeChange(event) {
    const {
      value,
      checked,
    } = event.target

    setForm((current) => {
      const currentModes =
        current.preferredWorkModes

      return {
        ...current,

        preferredWorkModes: checked
          ? [...currentModes, value]
          : currentModes.filter(
              (mode) => mode !== value
            ),
      }
    })
  }

  function validateForm() {
    if (form.fullName.trim().length < 2) {
      return 'Enter your full name.'
    }

    if (!form.college.trim()) {
      return 'Enter your college name.'
    }

    if (!form.degree.trim()) {
      return 'Enter your degree.'
    }

    if (!form.passingYear) {
      return 'Enter your passing year.'
    }

    const passingYear =
      Number(form.passingYear)

    if (
      Number.isNaN(passingYear) ||
      passingYear < 1950 ||
      passingYear > 2100
    ) {
      return 'Enter a valid passing year.'
    }

    if (
      commaSeparatedToArray(form.skills).length === 0
    ) {
      return 'Add at least one skill.'
    }

    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError =
      validateForm()

    if (validationError) {
      toast.error(validationError)
      return
    }

    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),

      college: form.college.trim(),
      university: form.university.trim(),
      degree: form.degree.trim(),

      specialization:
        form.specialization.trim(),

      passingYear: form.passingYear,

      bio: form.bio.trim(),

      skills:
        commaSeparatedToArray(
          form.skills
        ),

      preferredCategories:
        commaSeparatedToArray(
          form.preferredCategories
        ),

      preferredLocations:
        commaSeparatedToArray(
          form.preferredLocations
        ),

      preferredWorkModes:
        form.preferredWorkModes,

      availableImmediately:
        form.availableImmediately,

      portfolioUrl:
        form.portfolioUrl.trim(),

      githubUrl:
        form.githubUrl.trim(),

      linkedinUrl:
        form.linkedinUrl.trim(),
    }

    try {
      setSubmitting(true)

      await completeStudentOnboarding(
        payload
      )

      await refreshProfile()

      toast.success(
        'Your student profile is ready.'
      )

      navigate('/student/dashboard', {
        replace: true,
      })
    } catch (error) {
      console.error(
        'Student onboarding failed:',
        error
      )

      toast.error(
        error?.message ||
          'Unable to complete student onboarding.'
      )
    } finally {
      setSubmitting(false)
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
            Student onboarding
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            Build your internship profile
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Add your education, skills, and preferences to receive better internship recommendations.
          </p>
        </header>

        <section className="mt-10">
          <SectionTitle
            title="Personal information"
            description="Basic details associated with your InternNext account."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="Full name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              autoComplete="name"
              required
            />

            <Field
              label="Phone number"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="tel"
              autoComplete="tel"
            />
          </div>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-10 dark:border-slate-800">
          <SectionTitle
            title="Education"
            description="Tell employers about your academic background."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="College"
              name="college"
              value={form.college}
              onChange={handleChange}
              required
              placeholder="College name"
            />

            <Field
              label="University"
              name="university"
              value={form.university}
              onChange={handleChange}
              placeholder="University name"
            />

            <Field
              label="Degree"
              name="degree"
              value={form.degree}
              onChange={handleChange}
              required
              placeholder="B.Tech, BCA, B.Sc"
            />

            <Field
              label="Specialization"
              name="specialization"
              value={form.specialization}
              onChange={handleChange}
              placeholder="Computer Science"
            />

            <Field
              label="Passing year"
              name="passingYear"
              value={form.passingYear}
              onChange={handleChange}
              type="number"
              min="1950"
              max="2100"
              required
              placeholder="2027"
            />
          </div>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-10 dark:border-slate-800">
          <SectionTitle
            title="Skills and preferences"
            description="Separate multiple values using commas."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="Skills"
              name="skills"
              value={form.skills}
              onChange={handleChange}
              required
              placeholder="React, JavaScript, SQL"
            />

            <Field
              label="Preferred categories"
              name="preferredCategories"
              value={form.preferredCategories}
              onChange={handleChange}
              placeholder="Web Development, Data Science"
            />

            <Field
              label="Preferred locations"
              name="preferredLocations"
              value={form.preferredLocations}
              onChange={handleChange}
              placeholder="Pune, Mumbai, Bengaluru"
              className="md:col-span-2"
            />
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Preferred work modes
            </legend>

            <div className="mt-3 flex flex-wrap gap-4">
              {[
                {
                  value: 'remote',
                  label: 'Remote',
                },
                {
                  value: 'hybrid',
                  label: 'Hybrid',
                },
                {
                  value: 'onsite',
                  label: 'On-site',
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={form.preferredWorkModes.includes(
                      option.value
                    )}
                    onChange={
                      handleWorkModeChange
                    }
                  />

                  <span>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-6 flex items-center gap-3">
            <input
              type="checkbox"
              name="availableImmediately"
              checked={
                form.availableImmediately
              }
              onChange={handleChange}
            />

            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              I am available to start immediately
            </span>
          </label>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-10 dark:border-slate-800">
          <SectionTitle
            title="About and professional links"
            description="Add a short introduction and optional portfolio links."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <TextAreaField
              label="Bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Describe your interests, experience, and career goals."
              className="md:col-span-2"
            />

            <Field
              label="Portfolio URL"
              name="portfolioUrl"
              value={form.portfolioUrl}
              onChange={handleChange}
              type="url"
              placeholder="https://yourportfolio.com"
            />

            <Field
              label="GitHub URL"
              name="githubUrl"
              value={form.githubUrl}
              onChange={handleChange}
              type="url"
              placeholder="https://github.com/username"
            />

            <Field
              label="LinkedIn URL"
              name="linkedinUrl"
              value={form.linkedinUrl}
              onChange={handleChange}
              type="url"
              placeholder="https://linkedin.com/in/username"
              className="md:col-span-2"
            />
          </div>
        </section>

        <div className="mt-10 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() =>
              navigate('/')
            }
            disabled={submitting}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? 'Saving profile…'
              : 'Complete student profile'}
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
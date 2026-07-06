import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  LoaderCircle,
} from 'lucide-react'

import toast from 'react-hot-toast'

import {
  getEmployerInternshipById,
  updateEmployerInternship,
} from '../lib/employerInternshipsApi'

const categories = [
  'Web Development',
  'Mobile Development',
  'Software Engineering',
  'Data Science',
  'Machine Learning',
  'UI/UX Design',
  'Digital Marketing',
  'Finance',
  'Human Resources',
  'Content Writing',
  'Business Development',
  'Other',
]

function arrayToText(value) {
  return Array.isArray(value)
    ? value.join(', ')
    : ''
}

function internshipToForm(
  internship
) {
  return {
    title:
      internship.title || '',

    department:
      internship.department || '',

    category:
      internship.category ||
      'Web Development',

    location:
      internship.location || '',

    workMode:
      internship.work_mode ||
      'remote',

    experienceLevel:
      internship.experience_level ||
      'beginner',

    durationMonths:
      internship.duration_months ??
      '',

    openings:
      internship.openings ?? 1,

    compensationType:
      internship.compensation_type ||
      'paid',

    stipendMin:
      internship.stipend_min ??
      '',

    stipendMax:
      internship.stipend_max ??
      '',

    currency:
      internship.currency || 'INR',

    stipendPeriod:
      internship.stipend_period ||
      'monthly',

    startDate:
      internship.start_date || '',

    deadline:
      internship.deadline || '',

    skillsRequired:
      arrayToText(
        internship.skills_required
      ),

    preferredSkills:
      arrayToText(
        internship.preferred_skills
      ),

    eligibility:
      arrayToText(
        internship.eligibility
      ),

    description:
      internship.description || '',

    responsibilities:
      arrayToText(
        internship.responsibilities
      ),

    perks:
      arrayToText(
        internship.perks
      ),

    screeningSteps:
      arrayToText(
        internship.screening_steps
      ),
  }
}

function getTodayDate() {
  const now = new Date()

  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60000
  )

  return localDate
    .toISOString()
    .split('T')[0]
}

export default function EditInternship() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] =
    useState(null)

  const [internship, setInternship] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    savingAction,
    setSavingAction,
  ] = useState('')

  const minimumDate = getTodayDate()
  const saving = Boolean(savingAction)

  useEffect(() => {
    let active = true

    async function loadInternship() {
      try {
        setLoading(true)
        setError('')

        const record =
          await getEmployerInternshipById(
            id
          )

        if (!active) {
          return
        }

        setInternship(record)
        setForm(
          internshipToForm(record)
        )
      } catch (loadError) {
        console.error(
          'Unable to load internship:',
          loadError
        )

        if (active) {
          setError(
            loadError?.message ||
              'Unable to load internship.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadInternship()

    return () => {
      active = false
    }
  }, [id])

  function updateField(event) {
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
    if (!form.title.trim()) {
      toast.error(
        'Internship title is required.'
      )
      return false
    }

    if (!form.category.trim()) {
      toast.error(
        'Category is required.'
      )
      return false
    }

    if (!form.location.trim()) {
      toast.error(
        'Location is required.'
      )
      return false
    }

    if (!form.deadline) {
      toast.error(
        'Application deadline is required.'
      )
      return false
    }

    if (!form.description.trim()) {
      toast.error(
        'Description is required.'
      )
      return false
    }

    if (
      form.compensationType ===
        'paid' &&
      form.stipendMin !== '' &&
      form.stipendMax !== '' &&
      Number(form.stipendMax) <
        Number(form.stipendMin)
    ) {
      toast.error(
        'Maximum stipend cannot be lower than minimum stipend.'
      )
      return false
    }

    return true
  }

  async function saveChanges(
    submitForReview
  ) {
    if (saving || !form) {
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      setSavingAction(
        submitForReview
          ? 'review'
          : 'draft'
      )

      await updateEmployerInternship(
        id,
        form,
        {
          submitForReview,
        }
      )

      toast.success(
        submitForReview
          ? 'Changes saved and internship submitted for approval.'
          : 'Internship changes saved as draft.'
      )

      navigate(
        '/employer/listings',
        {
          replace: true,
        }
      )
    } catch (saveError) {
      console.error(
        'Unable to update internship:',
        saveError
      )

      toast.error(
        saveError?.message ||
          'Unable to update internship.'
      )
    } finally {
      setSavingAction('')
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20">
        <div className="card flex min-h-72 items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </main>
    )
  }

  if (error || !form) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="card">
          <h1 className="text-2xl font-black">
            Unable to edit internship
          </h1>

          <p className="mt-3 text-slate-500">
            {error ||
              'Internship data is unavailable.'}
          </p>

          <Link
            to="/employer/listings"
            className="btn-primary mt-6"
          >
            Back to listings
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-brand-600">
            Employer workspace
          </p>

          <h1 className="mt-1 text-3xl font-black">
            Edit internship
          </h1>

          <p className="mt-2 text-slate-500">
            Update the listing and save it
            as a draft or submit it again
            for approval.
          </p>
        </div>

        <Link
          to="/employer/listings"
          className="btn-secondary"
        >
          Back to listings
        </Link>
      </div>

      {internship?.status ===
        'rejected' &&
        internship.rejection_reason && (
          <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Rejection reason:{' '}
            {
              internship.rejection_reason
            }
          </div>
        )}

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
        }}
        className="space-y-6"
      >
        <section className="card">
          <h2 className="text-xl font-black">
            Basic information
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold">
                Internship title *
              </span>

              <input
                name="title"
                value={form.title}
                onChange={updateField}
                className="input w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Department
              </span>

              <input
                name="department"
                value={form.department}
                onChange={updateField}
                className="input w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Category *
              </span>

              <select
                name="category"
                value={form.category}
                onChange={updateField}
                className="input w-full"
              >
                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Location *
              </span>

              <input
                name="location"
                value={form.location}
                onChange={updateField}
                className="input w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Work mode
              </span>

              <select
                name="workMode"
                value={form.workMode}
                onChange={updateField}
                className="input w-full"
              >
                <option value="remote">
                  Remote
                </option>

                <option value="hybrid">
                  Hybrid
                </option>

                <option value="onsite">
                  On-site
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Experience level
              </span>

              <select
                name="experienceLevel"
                value={
                  form.experienceLevel
                }
                onChange={updateField}
                className="input w-full"
              >
                <option value="beginner">
                  Beginner
                </option>

                <option value="intermediate">
                  Intermediate
                </option>

                <option value="advanced">
                  Advanced
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Duration in months
              </span>

              <input
                type="number"
                min="1"
                max="36"
                name="durationMonths"
                value={
                  form.durationMonths
                }
                onChange={updateField}
                className="input w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Openings
              </span>

              <input
                type="number"
                min="1"
                name="openings"
                value={form.openings}
                onChange={updateField}
                className="input w-full"
              />
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">
            Compensation and dates
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Compensation type
              </span>

              <select
                name="compensationType"
                value={
                  form.compensationType
                }
                onChange={updateField}
                className="input w-full"
              >
                <option value="paid">
                  Paid
                </option>

                <option value="unpaid">
                  Unpaid
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Stipend period
              </span>

              <select
                name="stipendPeriod"
                value={
                  form.stipendPeriod
                }
                onChange={updateField}
                disabled={
                  form.compensationType ===
                  'unpaid'
                }
                className="input w-full disabled:opacity-60"
              >
                <option value="monthly">
                  Monthly
                </option>

                <option value="weekly">
                  Weekly
                </option>

                <option value="daily">
                  Daily
                </option>

                <option value="fixed">
                  Fixed amount
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Minimum stipend
              </span>

              <input
                type="number"
                min="0"
                name="stipendMin"
                value={form.stipendMin}
                onChange={updateField}
                disabled={
                  form.compensationType ===
                  'unpaid'
                }
                className="input w-full disabled:opacity-60"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Maximum stipend
              </span>

              <input
                type="number"
                min="0"
                name="stipendMax"
                value={form.stipendMax}
                onChange={updateField}
                disabled={
                  form.compensationType ===
                  'unpaid'
                }
                className="input w-full disabled:opacity-60"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Currency
              </span>

              <select
                name="currency"
                value={form.currency}
                onChange={updateField}
                disabled={
                  form.compensationType ===
                  'unpaid'
                }
                className="input w-full disabled:opacity-60"
              >
                <option value="INR">
                  INR
                </option>

                <option value="USD">
                  USD
                </option>

                <option value="EUR">
                  EUR
                </option>

                <option value="GBP">
                  GBP
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Start date
              </span>

              <input
                type="date"
                min={minimumDate}
                name="startDate"
                value={form.startDate}
                onChange={updateField}
                className="input w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Application deadline *
              </span>

              <input
                type="date"
                min={minimumDate}
                name="deadline"
                value={form.deadline}
                onChange={updateField}
                className="input w-full"
              />
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">
            Skills and details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Separate multiple values with
            commas.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Required skills
              </span>

              <input
                name="skillsRequired"
                value={
                  form.skillsRequired
                }
                onChange={updateField}
                className="input w-full"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Preferred skills
              </span>

              <input
                name="preferredSkills"
                value={
                  form.preferredSkills
                }
                onChange={updateField}
                className="input w-full"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Eligibility
              </span>

              <input
                name="eligibility"
                value={form.eligibility}
                onChange={updateField}
                className="input w-full"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Description *
              </span>

              <textarea
                rows="6"
                name="description"
                value={form.description}
                onChange={updateField}
                className="input w-full resize-y"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Responsibilities
              </span>

              <textarea
                rows="3"
                name="responsibilities"
                value={
                  form.responsibilities
                }
                onChange={updateField}
                className="input w-full resize-y"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Perks
              </span>

              <input
                name="perks"
                value={form.perks}
                onChange={updateField}
                className="input w-full"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Screening steps
              </span>

              <input
                name="screeningSteps"
                value={
                  form.screeningSteps
                }
                onChange={updateField}
                className="input w-full"
              />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              saveChanges(false)
            }
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingAction === 'draft'
              ? 'Saving…'
              : 'Save as draft'}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              saveChanges(true)
            }
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingAction === 'review'
              ? 'Submitting…'
              : 'Save and submit for approval'}
          </button>
        </div>
      </form>
    </main>
  )
}
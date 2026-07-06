import {
AlertTriangle,
CheckCircle2,
LoaderCircle,
RefreshCw,
} from 'lucide-react';

import {
useCallback,
useEffect,
useState,
} from 'react';

import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import {
createEmployerInternship,
getEmployerCompany,
getEmployerInternshipLimitStatus,
} from '../lib/employerInternshipsApi';


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

const initialForm = {
  title: '',
  department: '',
  category: 'Web Development',
  location: '',
  workMode: 'remote',
  experienceLevel: 'beginner',

  durationMonths: '3',
  openings: '1',

  compensationType: 'paid',
  stipendMin: '',
  stipendMax: '',
  currency: 'INR',
  stipendPeriod: 'monthly',

  startDate: '',
  deadline: '',

  skillsRequired: '',
  preferredSkills: '',
  eligibility: '',

  description: '',
  responsibilities: '',
  perks: '',
  screeningSteps: '',
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

function InternshipLimitStatus({
loading,
error,
status,
onRefresh,
}) {
if (loading) {
return ( <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"> <div className="flex items-center gap-3 text-sm font-semibold text-slate-500"> <LoaderCircle
         className="animate-spin text-brand-600"
         size={19}
       />


      Checking active internship capacity…
    </div>
  </section>
);


}

if (error) {
return ( <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"> <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"> <div className="flex items-start gap-3"> <AlertTriangle
           className="mt-0.5 shrink-0"
           size={20}
         />


        <div>
          <p className="font-black">
            Capacity could not be loaded
          </p>

          <p className="mt-1 text-sm leading-6">
            {error}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 px-4 py-2 text-sm font-bold dark:border-amber-800"
      >
        <RefreshCw size={16} />

        Retry
      </button>
    </div>
  </section>
);


}

const activeCount =
Number(
status?.activeCount ?? 0
);

const maximumActive =
Number(
status?.maximumActive ?? 25
);

const remaining =
Number(
status?.remaining ?? 0
);

const limitReached =
Boolean(
status?.limitReached
);

return (
<section
className={[
'rounded-3xl border p-5 shadow-sm',


    limitReached
      ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200',
  ].join(' ')}
>
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      {limitReached ? (
        <AlertTriangle
          className="mt-0.5 shrink-0"
          size={21}
        />
      ) : (
        <CheckCircle2
          className="mt-0.5 shrink-0"
          size={21}
        />
      )}

      <div>
        <p className="font-black">
          {limitReached
            ? 'Active internship limit reached'
            : 'Internship capacity available'}
        </p>

        <p className="mt-1 text-sm leading-6">
          {activeCount} of{' '}
          {maximumActive} active
          internships are currently
          in use.{' '}

          {limitReached
            ? 'You can save this listing as a draft, but it cannot be submitted for approval.'
            : `${remaining} active slot${
                remaining === 1
                  ? ''
                  : 's'
              } remaining.`}
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={onRefresh}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-current/20 px-4 py-2 text-sm font-bold"
    >
      <RefreshCw size={16} />

      Refresh
    </button>
  </div>
</section>


);
}


export default function PostInternship() {
  const navigate = useNavigate()
  const [
  company,
  setCompany,
] = useState(null)

const [
  loadingCompany,
  setLoadingCompany,
] = useState(true)

const [
  companyError,
  setCompanyError,
] = useState('')
useEffect(() => {
  let active = true

  async function loadCompany() {
    try {
      setLoadingCompany(true)
      setCompanyError('')

      const record =
        await getEmployerCompany()

      if (active) {
        setCompany(record)
      }
    } catch (error) {
      console.error(
        'Unable to load employer company:',
        error
      )

      if (active) {
        setCompany(null)

        setCompanyError(
          error?.message ||
            'Unable to load company details.'
        )
      }
    } finally {
      if (active) {
        setLoadingCompany(false)
      }
    }
  }

  void loadCompany()

  return () => {
    active = false
  }
}, [])
const companyApproved =
  company?.status === 'approved'

  const [form, setForm] =
    useState(initialForm)

  const [
    savingAction,
    setSavingAction,
  ] = useState('')

  const [
    limitStatus,
    setLimitStatus,
  ] = useState(null)

  const [
    limitLoading,
    setLimitLoading,
  ] = useState(true)

  const [
    limitError,
    setLimitError,
  ] = useState('')

  const limitReached =
    Boolean(
      limitStatus?.limitReached
    )

  const loadLimitStatus =
    useCallback(async () => {
      setLimitLoading(true)
      setLimitError('')

      try {
        const result =
          await getEmployerInternshipLimitStatus()

        setLimitStatus(result)

        return result
      } catch (error) {
        console.error(
          'Unable to load internship limit:',
          error
        )

        setLimitError(
          error?.message ||
            'Unable to load the employer internship limit.'
        )

        return null
      } finally {
        setLimitLoading(false)
      }
    }, [])

  useEffect(() => {
    void loadLimitStatus()
  }, [loadLimitStatus])

  const minimumDate = getTodayDate()

  const saving =
    savingAction !== ''

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

  async function saveInternship(
    submitForReview
  ) {
    if (
  submitForReview &&
  !companyApproved
) {
  toast.error(
    company?.status === 'pending'
      ? 'Your company is still waiting for admin approval.'
      : company?.status === 'rejected'
        ? 'Your company was rejected. Update the company profile before submitting internships.'
        : 'Complete and approve your company profile before submitting internships.'
  )

  return
}
    if (saving) {
      return
    }

    if (!validateForm()) {
      return
    }

    if (submitForReview) {
  const currentLimit =
    await loadLimitStatus();

  if (
    currentLimit?.limitReached
  ) {
    toast.error(
      'You have reached the maximum number of active internships. Save this listing as a draft or close an active internship first.'
    );

    return;
  }
}

    try {
      setSavingAction(
        submitForReview
          ? 'review'
          : 'draft'
      )
      const internship =
        await createEmployerInternship(
          form,
          {
            submitForReview,
          }
        )

      toast.success(
        submitForReview
          ? 'Internship submitted for approval.'
          : 'Internship saved as draft.'
      )

      navigate(
        '/employer/listings',
        {
          state: {
            createdInternshipId:
              internship.id,
          },
        }
      )
    } catch (error) {
      console.error(
        'Internship submission failed:',
        error
      )

      toast.error(
        error?.message ||
          'Unable to create internship.'
      )
    } finally {
      setSavingAction('')
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-7">
        <p className="text-sm font-bold text-brand-600">
          Employer workspace
        </p>

        <h1 className="mt-1 text-3xl font-black">
          Post an internship
        </h1>

        <p className="mt-2 text-slate-500">
          Save the internship as a draft or
          submit it for admin approval.
        </p>
      </div>
      {loadingCompany ? (
  <section className="mb-6 rounded-3xl border bg-white p-5 dark:bg-slate-900">
    <p className="text-sm text-slate-500">
      Checking company approval status…
    </p>
  </section>
) : companyError ? (
  <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
    <h2 className="font-bold text-red-700 dark:text-red-300">
      Unable to load company profile
    </h2>

    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
      {companyError}
    </p>
  </section>
) : !company ? (
  <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
    <h2 className="font-bold text-amber-800 dark:text-amber-300">
      Company profile required
    </h2>

    <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
      Complete employer onboarding before creating an internship.
    </p>
  </section>
) : company.status === 'approved' ? (
  <section className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
    <h2 className="font-bold text-emerald-800 dark:text-emerald-300">
      Company approved
    </h2>

    <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
      {company.name} is approved. You can submit internships for admin review.
    </p>
  </section>
) : company.status === 'pending' ? (
  <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
    <h2 className="font-bold text-amber-800 dark:text-amber-300">
      Company approval pending
    </h2>

    <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
      You may save internship drafts, but submission is disabled until an administrator approves {company.name}.
    </p>
  </section>
) : (
  <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
    <h2 className="font-bold text-red-800 dark:text-red-300">
      Company not approved
    </h2>

    <p className="mt-2 text-sm text-red-700 dark:text-red-400">
      {company.rejection_reason ||
        'Update your company profile and submit it for review again.'}
    </p>
  </section>
)}

      <div className="mb-6">
  <InternshipLimitStatus
    loading={limitLoading}
    error={limitError}
    status={limitStatus}
    onRefresh={() =>
      void loadLimitStatus()
    }
  />
</div>

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
                placeholder="React Developer Intern"
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
                placeholder="Engineering"
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
                placeholder="Pune"
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
                name="durationMonths"
                type="number"
                min="1"
                max="36"
                value={
                  form.durationMonths
                }
                onChange={updateField}
                className="input w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Number of openings
              </span>

              <input
                name="openings"
                type="number"
                min="1"
                value={form.openings}
                onChange={updateField}
                className="input w-full"
              />
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">
            Compensation
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
                name="stipendMin"
                type="number"
                min="0"
                value={form.stipendMin}
                onChange={updateField}
                disabled={
                  form.compensationType ===
                  'unpaid'
                }
                placeholder="12000"
                className="input w-full disabled:opacity-60"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Maximum stipend
              </span>

              <input
                name="stipendMax"
                type="number"
                min="0"
                value={form.stipendMax}
                onChange={updateField}
                disabled={
                  form.compensationType ===
                  'unpaid'
                }
                placeholder="18000"
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
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">
            Dates
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Expected start date
              </span>

              <input
                name="startDate"
                type="date"
                min={minimumDate}
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
                name="deadline"
                type="date"
                min={minimumDate}
                value={form.deadline}
                onChange={updateField}
                className="input w-full"
              />
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">
            Skills and requirements
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Separate multiple values with
            commas.
          </p>

          <div className="mt-5 grid gap-4">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Required skills
              </span>

              <input
                name="skillsRequired"
                value={
                  form.skillsRequired
                }
                onChange={updateField}
                placeholder="React, JavaScript, CSS"
                className="input w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Preferred skills
              </span>

              <input
                name="preferredSkills"
                value={
                  form.preferredSkills
                }
                onChange={updateField}
                placeholder="Tailwind CSS, Git"
                className="input w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Eligibility
              </span>

              <input
                name="eligibility"
                value={form.eligibility}
                onChange={updateField}
                placeholder="Students, Recent graduates, Basic React knowledge"
                className="input w-full"
              />
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">
            Internship details
          </h2>

          <div className="mt-5 grid gap-4">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Description *
              </span>

              <textarea
                name="description"
                rows="6"
                value={form.description}
                onChange={updateField}
                placeholder="Describe the internship, team and learning opportunity."
                className="input w-full resize-y"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Responsibilities
              </span>

              <textarea
                name="responsibilities"
                rows="3"
                value={
                  form.responsibilities
                }
                onChange={updateField}
                placeholder="Build UI components, Fix bugs, Participate in code reviews"
                className="input w-full resize-y"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Perks
              </span>

              <input
                name="perks"
                value={form.perks}
                onChange={updateField}
                placeholder="Certificate, Mentorship, Flexible hours"
                className="input w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Screening steps
              </span>

              <input
                name="screeningSteps"
                value={
                  form.screeningSteps
                }
                onChange={updateField}
                placeholder="Profile review, Technical task, Interview"
                className="input w-full"
              />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={
  saving ||
  loadingCompany ||
  !company
}
            onClick={() =>
              saveInternship(false)
            }
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingAction === 'draft'
              ? 'Saving draft…'
              : 'Save draft'}
          </button>

          <button
  type="button"
  disabled={
    saving ||
    limitLoading ||
    limitReached
  }
  onClick={() =>
    void saveInternship(true)
  }
  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
  title={
    limitReached
      ? 'The active internship limit has been reached.'
      : ''
  }
>
  {savingAction === 'review'
    ? 'Submitting…'
    : limitReached
      ? 'Active limit reached'
      : 'Submit for approval'}
</button>
        </div>
      </form>
    </main>
  )
}

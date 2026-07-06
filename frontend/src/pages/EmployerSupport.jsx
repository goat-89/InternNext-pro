import {
  Headphones,
  LoaderCircle,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react'

import {
  useState,
} from 'react'

import toast from 'react-hot-toast'

import {
  DashboardShell,
} from '../components/Layout'

import {
  employerNav,
} from '../lib/dashboardNav'

import {
  createSupportTicket,
} from '../lib/supportTicketsApi'

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  category: 'employer_inquiry',
  subject: '',
  message: '',
}

const categoryOptions = [
  [
    'employer_inquiry',
    'Employer inquiry',
  ],
  [
    'payment_support',
    'Payment support',
  ],
  [
    'partnership',
    'Partnership',
  ],
  [
    'general',
    'General inquiry',
  ],
]

function Field({
  label,
  children,
  className = '',
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-bold">
        {label}
      </span>

      {children}
    </label>
  )
}

export default function EmployerSupport() {
  const [
    form,
    setForm,
  ] = useState(initialForm)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    lastTicket,
    setLastTicket,
  ] = useState(null)

  function changeField(event) {
    const {
      name,
      value,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function submitTicket(event) {
    event.preventDefault()

    if (submitting) {
      return
    }

    try {
      setSubmitting(true)

      const ticket =
        await createSupportTicket(form)

      setLastTicket(ticket)
      setForm(initialForm)

      toast.success(
        'Support ticket submitted.'
      )
    } catch (error) {
      console.error(
        'Unable to submit employer support ticket:',
        error
      )

      toast.error(
        error?.message ||
          'Unable to submit support ticket.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardShell
      title="Employer support"
      navItems={employerNav}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/40">
              <Headphones className="h-5 w-5" />
            </span>

            <div>
              <p className="text-sm font-black uppercase tracking-wider text-brand-600">
                Support request
              </p>

              <h1 className="mt-2 text-2xl font-black">
                Contact the InternNext team
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Submit hiring, billing, verification,
                or platform questions to the support
                queue.
              </p>
            </div>
          </div>

          {lastTicket && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              Ticket submitted. Reference:{' '}
              <strong>{lastTicket.id}</strong>
            </div>
          )}

          <form
            onSubmit={submitTicket}
            className="mt-6 grid gap-5 md:grid-cols-2"
          >
            <Field label="Full name">
              <input
                className="input"
                name="fullName"
                value={form.fullName}
                onChange={changeField}
                autoComplete="name"
                required
              />
            </Field>

            <Field label="Email address">
              <input
                className="input"
                name="email"
                type="email"
                value={form.email}
                onChange={changeField}
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Phone number">
              <input
                className="input"
                name="phone"
                value={form.phone}
                onChange={changeField}
                autoComplete="tel"
              />
            </Field>

            <Field label="Inquiry type">
              <select
                className="input"
                name="category"
                value={form.category}
                onChange={changeField}
              >
                {categoryOptions.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field
              label="Subject"
              className="md:col-span-2"
            >
              <input
                className="input"
                name="subject"
                value={form.subject}
                onChange={changeField}
                maxLength={180}
                required
              />
            </Field>

            <Field
              label="Message"
              className="md:col-span-2"
            >
              <textarea
                className="input min-h-40 resize-y"
                name="message"
                value={form.message}
                onChange={changeField}
                maxLength={5000}
                required
              />
            </Field>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}

                {submitting
                  ? 'Submitting...'
                  : 'Submit ticket'}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-5">
          <section className="card">
            <Mail className="h-6 w-6 text-brand-600" />

            <h2 className="mt-4 font-black">
              Email support
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              support@internnext.in
            </p>
          </section>

          <section className="card">
            <Phone className="h-6 w-6 text-brand-600" />

            <h2 className="mt-4 font-black">
              Business support
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              +91 98765 43210
            </p>
          </section>

          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            <h2 className="font-black">
              Response workflow
            </h2>

            <p className="mt-2 text-sm leading-6">
              Submitted tickets appear in the admin
              support queue with your signed-in user id
              attached for follow-up.
            </p>
          </section>
        </aside>
      </div>
    </DashboardShell>
  )
}

import { motion } from 'framer-motion'
import { ArrowRight, Search, ShieldCheck, Sparkles, Users, Building2, BadgeCheck, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import toast from 'react-hot-toast'
import { Section, StatCard, Accordion } from '../components/UI'
import InternshipCard from '../components/InternshipCard'
import {
  getPublicInternships,
} from '../lib/internshipsApi'
import {
  createSupportTicket,
} from '../lib/supportTicketsApi'
import {
  usePlatformSettings,
} from '../context/PlatformSettingsContext'

const testimonials = [
  [
    'Aarav Shah',
    'Student',
    'InternNext helped me move from applications to a PPO in four months.',
  ],
  [
    'Diya Mehta',
    'Student',
    'The recommendation flow made my internship search much more focused.',
  ],
  [
    'Rohan Kulkarni',
    'Recruiter',
    'The candidate pipeline helped our team shortlist strong applicants faster.',
  ],
  [
    'Sara Khan',
    'Student',
    'I could save roles, track applications, and prepare for interviews in one place.',
  ],
  [
    'Nikhil Rao',
    'Founder',
    'Employer analytics and verified listings make every hiring campaign easier to measure.',
  ],
]

const faqs = [
  [
    'Are internships verified?',
    'Listings are reviewed before approved opportunities appear in public internship browsing.',
  ],
  [
    'Is applying free?',
    'Students can browse, save, and apply for standard internships at no cost.',
  ],
  [
    'How are payments handled?',
    'Paid plans use Razorpay orders verified through Supabase Edge Functions and server-side payment checks.',
  ],
  [
    'Can employers manage candidates?',
    'Yes. Employers can review applicants, move candidates through the pipeline, and schedule interviews.',
  ],
  [
    'How do support tickets work?',
    'Contact and employer support forms create persistent tickets for the admin support queue.',
  ],
  [
    'Can I delete my account?',
    'Students and employers can request account deletion from settings after typing a confirmation phrase.',
  ],
]

function prepareHomeInternship(record) {
  const companyName =
    record.companies?.name ||
    'Company not available'

  const workMode =
    String(
      record.work_mode || ''
    ).toLowerCase()

  const normalizedMode =
    workMode === 'remote'
      ? 'Remote'
      : workMode === 'hybrid'
        ? 'Hybrid'
        : workMode === 'onsite'
          ? 'Onsite'
          : 'Not specified'

  return {
    ...record,

    company: companyName,

    logo:
      companyName
        .slice(0, 2)
        .toUpperCase() || 'IN',

    mode: normalizedMode,

    duration: record.duration_months
      ? `${record.duration_months} months`
      : 'Not specified',

    stipend: Number(
      record.stipend_min || 0
    ),

    skills: Array.isArray(
      record.skills_required
    )
      ? record.skills_required
      : [],

    posted: record.published_at
      ? new Date(
          record.published_at
        ).toLocaleDateString()
      : 'Recently',
  }
}
export function Home() {
  const navigate = useNavigate()

  const [query, setQuery] =
    useState('')

  const [
    internships,
    setInternships,
  ] = useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    async function loadHomepage() {
      try {
        setLoading(true)
        setError('')

        const records =
          await getPublicInternships()

        if (!active) return

        setInternships(
          records.map(
            prepareHomeInternship
          )
        )
      } catch (loadError) {
        console.error(
          'Homepage internships failed:',
          loadError
        )

        if (!active) return

        setError(
          loadError?.message ||
            'Unable to load internships.'
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadHomepage()

    return () => {
      active = false
    }
  }, [])

  const categories = useMemo(() => {
    return [
      ...new Set(
        internships
          .map(
            (internship) =>
              internship.category
          )
          .filter(Boolean)
      ),
    ]
      .sort()
      .slice(0, 15)
  }, [internships])

  const featuredInternships =
    useMemo(() => {
      const featured =
        internships.filter(
          (internship) =>
            internship.featured
        )

      if (featured.length > 0) {
        return featured.slice(0, 6)
      }

      return internships.slice(0, 6)
    }, [internships])

  const companyCount = useMemo(() => {
    return new Set(
      internships
        .map(
          (internship) =>
            internship.companies?.id
        )
        .filter(Boolean)
    ).size
  }, [internships])

  function handleSearch(event) {
    event?.preventDefault()

    navigate(
      `/internships?q=${encodeURIComponent(
        query.trim()
      )}`
    )
  }

  return (
    <>
      <section className="overflow-hidden bg-gradient-to-br from-brand-50 via-white to-cyan-50 py-20 dark:from-slate-950 dark:via-slate-950 dark:to-brand-950">
        <div className="container-app grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >
            <span className="badge bg-brand-100 text-brand-700">
              Verified internships. Smarter hiring.
            </span>

            <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight sm:text-6xl">
              Launch your career with opportunities that{' '}
              <span className="text-brand-600">
                actually fit.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              Discover curated internships, receive skill-based recommendations, manage applications, and grow with premium career support.
            </p>

            <form
              onSubmit={handleSearch}
              className="mt-8 flex flex-col gap-3 rounded-3xl border bg-white p-3 shadow-soft sm:flex-row dark:bg-slate-900"
            >
              <div className="flex flex-1 items-center gap-3 px-3">
                <Search className="text-slate-400" />

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  className="w-full bg-transparent py-3 outline-none"
                  placeholder="Role, skill, company, or location"
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
              >
                Search internships
                <ArrowRight size={17} />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <ShieldCheck
                  size={17}
                  className="text-emerald-600"
                />
                Moderated listings
              </span>

              <span className="flex items-center gap-2">
                <Sparkles
                  size={17}
                  className="text-amber-500"
                />
                Personalized matches
              </span>

              <span className="flex items-center gap-2">
                <Users
                  size={17}
                  className="text-brand-600"
                />
                Student-first experience
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="relative"
          >
            <div className="card relative overflow-hidden p-8">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-200 blur-3xl dark:bg-brand-900" />

              <p className="text-sm font-bold text-brand-600">
                Today on InternNext
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <StatCard
                  label="Active internships"
                  value={
                    loading
                      ? '...'
                      : String(
                          internships.length
                        )
                  }
                  icon={BadgeCheck}
                />

                <StatCard
                  label="Hiring companies"
                  value={
                    loading
                      ? '...'
                      : String(companyCount)
                  }
                  icon={Building2}
                />

                <StatCard
                  label="Verified listings"
                  value={
                    loading
                      ? '...'
                      : String(
                          internships.length
                        )
                  }
                  icon={ShieldCheck}
                />

                <StatCard
                  label="Career categories"
                  value={
                    loading
                      ? '...'
                      : String(
                          categories.length
                        )
                  }
                  icon={Sparkles}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Section
        eyebrow="Explore"
        title="Popular career categories"
        description="Browse fast-growing fields and find opportunities aligned with your skills."
      >
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({
              length: 10,
            }).map((_, index) => (
              <div
                key={index}
                className="card h-16 animate-pulse bg-slate-100 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map(
              (category) => (
                <Link
                  to={`/internships?category=${encodeURIComponent(
                    category
                  )}`}
                  className="card p-4 font-bold transition hover:-translate-y-1 hover:border-brand-300 hover:text-brand-600"
                  key={category}
                >
                  {category}
                </Link>
              )
            )}
          </div>
        ) : (
          <p className="text-slate-500">
            Categories will appear when approved internships are published.
          </p>
        )}
      </Section>

      <Section
        eyebrow="Featured opportunities"
        title="Internships worth applying for"
        className="bg-white dark:bg-slate-900/30"
      >
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <div
                key={index}
                className="card h-72 animate-pulse bg-slate-100 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : error ? (
          <div className="card text-center">
            <p className="font-bold">
              Unable to load internships
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {error}
            </p>
          </div>
        ) : featuredInternships.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {featuredInternships.map(
              (internship) => (
                <InternshipCard
                  item={internship}
                  key={internship.id}
                />
              )
            )}
          </div>
        ) : (
          <div className="card text-center">
            <p className="font-bold">
              No internships available yet
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Approved opportunities will appear here.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/internships"
            className="btn-primary"
          >
            Browse all internships
          </Link>
        </div>
      </Section>

      <Section
        eyebrow="Why InternNext"
        title="One platform for students and employers"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[
            [
              'For students',
              'Search, save, apply, track, and prepare for interviews from one dashboard.',
            ],
            [
              'For employers',
              'Post roles, manage candidates, schedule interviews, and measure listing performance.',
            ],
            [
              'For institutions',
              'Support campus hiring and provide students with structured career opportunities.',
            ],
          ].map(
            ([title, description]) => (
              <div
                className="card"
                key={title}
              >
                <h3 className="text-xl font-black">
                  {title}
                </h3>

                <p className="mt-3 text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              </div>
            )
          )}
        </div>
      </Section>

      <Section
        eyebrow="Success stories"
        title="Trusted by ambitious people"
      >
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map(
            ([name, role, text]) => (
              <blockquote
                className="card"
                key={name}
              >
                <p className="text-lg">
                  "{text}"
                </p>

                <footer className="mt-5">
                  <b>{name}</b>

                  <p className="text-sm text-slate-500">
                    {role}
                  </p>
                </footer>
              </blockquote>
            )
          )}
        </div>
      </Section>

      <Section
        eyebrow="Help"
        title="Frequently asked questions"
      >
        <Accordion items={faqs} />
      </Section>

      <section className="py-16">
        <div className="container-app">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-black">
                  Build your next career move today.
                </h2>

                <p className="mt-3 text-slate-300">
                  Create a profile, receive tailored recommendations, and start applying.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link
                  to="/signup/student"
                  className="btn bg-white text-slate-950"
                >
                  Create account
                </Link>

                <Link
                  to="/signup/employer"
                  className="btn border border-white/20 text-white"
                >
                  Hire interns
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
export function About(){return <Section eyebrow="About InternNext" title="We make early-career hiring more transparent"><div className="grid gap-8 lg:grid-cols-2"><div className="card"><h3 className="text-2xl font-black">Our mission</h3><p className="mt-4 text-slate-600 dark:text-slate-300">InternNext connects ambitious students with credible companies through transparent listings, skill-based discovery, and structured hiring workflows.</p></div><div className="card"><h3 className="text-2xl font-black">Our vision</h3><p className="mt-4 text-slate-600 dark:text-slate-300">A future where every student can access meaningful work experience and every growing company can discover emerging talent efficiently.</p></div></div></Section>}
export function Services(){return <Section eyebrow="Services" title="Career and hiring solutions that create outcomes"><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{['Internship marketplace','ATS resume review','Mock interview support','Career mentorship','Featured employer listings','Campus hiring solutions'].map(x=><div className="card" key={x}><h3 className="text-xl font-black">{x}</h3><p className="mt-3 text-slate-500">Structured service delivery, clear tracking, and professional support designed for measurable progress.</p></div>)}</div></Section>}
export function Contact(){
  const {
    supportEmail,
  } = usePlatformSettings()
  const [
    loading,
    setLoading,
  ] = useState(false)
  const [
    form,
    setForm,
  ] = useState({
    fullName: '',
    email: '',
    phone: '',
    category: 'student_support',
    subject: '',
    message: '',
  })

  function change(event) {
    const {
      name,
      value,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)

    try {
      await createSupportTicket(form)
      setForm({
        fullName: '',
        email: '',
        phone: '',
        category: 'student_support',
        subject: '',
        message: '',
      })
      toast.success(
        'Your inquiry has been submitted.'
      )
    } catch (error) {
      toast.error(
        error?.message ||
          'Unable to submit your inquiry.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section
      eyebrow="Contact"
      title="Talk to our team"
      description="Choose the right inquiry type and our support team will respond with the next steps."
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <form
          onSubmit={submit}
          className="card space-y-4 lg:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-bold">
                Full name
              </span>
              <input
                required
                className="input"
                name="fullName"
                value={form.fullName}
                onChange={change}
                autoComplete="name"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold">
                Email address
              </span>
              <input
                required
                type="email"
                className="input"
                name="email"
                value={form.email}
                onChange={change}
                autoComplete="email"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold">
                Phone number{' '}
                <span className="font-normal text-slate-500">
                  (optional)
                </span>
              </span>
              <input
                type="tel"
                className="input"
                name="phone"
                value={form.phone}
                onChange={change}
                autoComplete="tel"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold">
                Inquiry type
              </span>
              <select
                className="input"
                name="category"
                value={form.category}
                onChange={change}
              >
                <option value="student_support">
                  Student support
                </option>
                <option value="employer_inquiry">
                  Employer inquiry
                </option>
                <option value="payment_support">
                  Payment support
                </option>
                <option value="partnership">
                  Partnership
                </option>
                <option value="general">
                  General inquiry
                </option>
              </select>
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-bold">
              Subject
            </span>
            <input
              required
              className="input"
              name="subject"
              value={form.subject}
              onChange={change}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">
              How can we help?
            </span>
            <textarea
              required
              className="input min-h-36"
              name="message"
              value={form.message}
              onChange={change}
            />
          </label>
          <p className="text-sm leading-6 text-slate-500">
            Submitting this form creates a
            persistent support request for the
            InternNext administration team.
          </p>
          <button
            disabled={loading}
            className="btn-primary"
          >
            {loading
              ? 'Submitting...'
              : 'Submit inquiry'}
          </button>
        </form>

        <aside className="space-y-4">
          {supportEmail && (
            <div className="card">
              <Mail aria-hidden="true" />
              <h3 className="mt-3 font-bold">
                Email support
              </h3>
              <a
                className="mt-1 block break-all text-sm text-brand-600 hover:underline"
                href={`mailto:${supportEmail}`}
              >
                {supportEmail}
              </a>
            </div>
          )}
          <div className="border-y py-6 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <h3 className="font-bold text-slate-950 dark:text-white">
              Before sharing information
            </h3>
            <p className="mt-2">
              Never send passwords, OTPs, card
              details, private keys, or
              unnecessary identity documents
              in a support request.
            </p>
          </div>
        </aside>
      </div>
    </Section>
  )
}
export function NotFound(){return <div className="container-app grid min-h-[70vh] place-items-center text-center"><div><p className="text-8xl font-black text-brand-600">404</p><h1 className="mt-4 text-3xl font-black">This page took a career break.</h1><p className="mt-3 text-slate-500">Return home or continue searching for internships.</p><div className="mt-6 flex justify-center gap-3"><Link className="btn-primary" to="/">Back home</Link><Link className="btn-secondary" to="/internships">Search internships</Link></div></div></div>}

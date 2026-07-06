import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  Bookmark,
  CheckCircle2,
  Search,
  Share2,
  SlidersHorizontal,
} from 'lucide-react'

import toast from 'react-hot-toast'

import InternshipCard from '../components/InternshipCard'

import {
  EmptyState,
  Section,
} from '../components/UI'

import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

import {
  applyToInternship,
  getMyApplicationForInternship,
} from '../lib/applicationsApi'

import {
  getPublicInternshipById,
  getPublicInternships,
} from '../lib/internshipsApi'

function getSearchParams(search) {
  return new URLSearchParams(search)
}

function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

function normalizeWorkMode(value) {
  const normalized = String(
    value || ''
  ).toLowerCase()

  if (normalized === 'onsite') {
    return 'Onsite'
  }

  if (normalized === 'hybrid') {
    return 'Hybrid'
  }

  if (normalized === 'remote') {
    return 'Remote'
  }

  return value || 'Not specified'
}

function prepareInternship(record) {
  const company = normalizeRelation(
    record?.companies
  )

  const companyName =
    company?.name ||
    'Company not available'

  return {
    ...record,
    companies: company,
    company: companyName,

    logo:
      companyName
        .slice(0, 2)
        .toUpperCase() || 'IN',

    mode: normalizeWorkMode(
      record?.work_mode
    ),

    duration: record?.duration_months
      ? `${record.duration_months} months`
      : 'Not specified',

    stipend: Number(
      record?.stipend_min || 0
    ),

    skills: Array.isArray(
      record?.skills_required
    )
      ? record.skills_required
      : [],

    responsibilities: Array.isArray(
      record?.responsibilities
    )
      ? record.responsibilities
      : record?.responsibilities || [],

    eligibility: Array.isArray(
      record?.eligibility
    )
      ? record.eligibility
      : record?.eligibility || [],

    perks: Array.isArray(record?.perks)
      ? record.perks
      : record?.perks || [],

    screening: Array.isArray(
      record?.screening_steps
    )
      ? record.screening_steps
      : record?.screening_steps || [],

    posted: record?.published_at
      ? new Date(
          record.published_at
        ).toLocaleDateString()
      : 'Recently',
  }
}

export function Internships() {
  const location = useLocation()

  const searchParams = getSearchParams(
    location.search
  )

  const initialQuery =
    searchParams.get('q') || ''

  const initialCategory =
    searchParams.get('category') || ''

  const [internships, setInternships] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [query, setQuery] =
    useState(initialQuery)

  const [category, setCategory] =
    useState(initialCategory)

  const [mode, setMode] =
    useState('')

  const [sort, setSort] =
    useState('latest')

  const [limit, setLimit] =
    useState(9)

  useEffect(() => {
    let active = true

    async function loadInternships() {
      try {
        setLoading(true)
        setError('')

        const records =
          await getPublicInternships()

        if (!active) {
          return
        }

        setInternships(
          records.map(prepareInternship)
        )
      } catch (loadError) {
        console.error(
          'Unable to load internships:',
          loadError
        )

        if (active) {
          setError(
            loadError?.message ||
              'Unable to load internships.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadInternships()

    return () => {
      active = false
    }
  }, [])

  const categories = useMemo(() => {
    return [
      ...new Set(
        internships
          .map((item) => item.category)
          .filter(Boolean)
      ),
    ].sort()
  }, [internships])

  const filtered = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLowerCase()

    let rows = internships.filter(
      (item) => {
        const searchableText = [
          item.title,
          item.company,
          item.category,
          item.location,
          item.mode,
          ...(item.skills || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        const matchesQuery =
          !normalizedQuery ||
          searchableText.includes(
            normalizedQuery
          )

        const matchesCategory =
          !category ||
          item.category === category

        const matchesMode =
          !mode ||
          item.mode.toLowerCase() ===
            mode.toLowerCase()

        return (
          matchesQuery &&
          matchesCategory &&
          matchesMode
        )
      }
    )

    if (sort === 'stipend') {
      rows = [...rows].sort(
        (first, second) =>
          Number(second.stipend || 0) -
          Number(first.stipend || 0)
      )
    }

    if (sort === 'featured') {
      rows = [...rows].sort(
        (first, second) =>
          Number(second.featured) -
          Number(first.featured)
      )
    }

    if (sort === 'latest') {
      rows = [...rows].sort(
        (first, second) =>
          new Date(
            second.published_at || 0
          ) -
          new Date(
            first.published_at || 0
          )
      )
    }

    return rows
  }, [
    internships,
    query,
    category,
    mode,
    sort,
  ])

  function clearFilters() {
    setQuery('')
    setCategory('')
    setMode('')
    setSort('latest')
    setLimit(9)
  }

  if (loading) {
    return (
      <Section
        eyebrow="Opportunity marketplace"
        title="Find your next internship"
      >
        <div className="grid gap-5 xl:grid-cols-2">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="card h-72 animate-pulse bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      </Section>
    )
  }

  if (error) {
    return (
      <Section
        eyebrow="Opportunity marketplace"
        title="Find your next internship"
      >
        <EmptyState
          title="Unable to load internships"
          text={error}
        />

        <div className="mt-5 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              window.location.reload()
            }
          >
            Try again
          </button>
        </div>
      </Section>
    )
  }

  return (
    <Section
      eyebrow="Opportunity marketplace"
      title="Find your next internship"
    >
      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search
            className="absolute left-4 top-3.5 text-slate-400"
            size={20}
          />

          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(9)
            }}
            className="input pl-12"
            placeholder="Search role, skill, company, or location"
          />
        </div>

        <select
          className="input"
          value={sort}
          onChange={(event) =>
            setSort(event.target.value)
          }
        >
          <option value="latest">
            Latest
          </option>
          <option value="stipend">
            Highest stipend
          </option>
          <option value="featured">
            Featured first
          </option>
        </select>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="card h-fit space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-2 font-black">
            <SlidersHorizontal size={18} />
            Filters
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              Category
            </label>

            <select
              className="input"
              value={category}
              onChange={(event) => {
                setCategory(
                  event.target.value
                )
                setLimit(9)
              }}
            >
              <option value="">
                All categories
              </option>

              {categories.map(
                (categoryName) => (
                  <option
                    key={categoryName}
                    value={categoryName}
                  >
                    {categoryName}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              Work mode
            </label>

            <select
              className="input"
              value={mode}
              onChange={(event) => {
                setMode(event.target.value)
                setLimit(9)
              }}
            >
              <option value="">
                All modes
              </option>
              <option value="Remote">
                Remote
              </option>
              <option value="Hybrid">
                Hybrid
              </option>
              <option value="Onsite">
                Onsite
              </option>
            </select>
          </div>

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              <b className="text-slate-900 dark:text-white">
                {filtered.length}
              </b>{' '}
              internships found
            </p>
          </div>

          {filtered.length > 0 ? (
            <>
              <div className="grid gap-5 xl:grid-cols-2">
                {filtered
                  .slice(0, limit)
                  .map((item) => (
                    <InternshipCard
                      key={item.id}
                      item={item}
                    />
                  ))}
              </div>

              {limit < filtered.length && (
                <div className="mt-8 text-center">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setLimit(
                        (current) =>
                          current + 9
                      )
                    }
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No internships found"
              text="No approved internships match your filters."
            />
          )}
        </div>
      </div>
    </Section>
  )
}

export function InternshipDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const app = useApp()

  const {
    user,
    profile,
  } = useAuth()

  const [item, setItem] =
    useState(null)

  const [similar, setSimilar] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [application, setApplication] =
    useState(null)

  const [applicationLoading, setApplicationLoading] =
    useState(false)

  const [applying, setApplying] =
    useState(false)

  const saved = Array.isArray(app?.saved)
    ? app.saved
    : []

  useEffect(() => {
    let active = true

    async function loadInternship() {
      if (!id) {
        setItem(null)
        setSimilar([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const [record, allRecords] =
          await Promise.all([
            getPublicInternshipById(id),
            getPublicInternships(),
          ])

        if (!active) {
          return
        }

        if (!record) {
          setItem(null)
          setSimilar([])
          return
        }

        const prepared =
          prepareInternship(record)

        setItem(prepared)

        setSimilar(
          allRecords
            .filter(
              (candidate) =>
                String(candidate.id) !==
                  String(record.id) &&
                candidate.category ===
                  record.category
            )
            .slice(0, 3)
            .map(prepareInternship)
        )
      } catch (loadError) {
        console.error(
          'Unable to load internship:',
          loadError
        )

        if (active) {
          setItem(null)
          setSimilar([])
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

    void loadInternship()

    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    let active = true

    async function loadApplication() {
      if (
        !user ||
        profile?.role !== 'student' ||
        !id
      ) {
        if (active) {
          setApplication(null)
          setApplicationLoading(false)
        }

        return
      }

      try {
        setApplicationLoading(true)

        const existingApplication =
          await getMyApplicationForInternship(
            id
          )

        if (active) {
          setApplication(
            existingApplication
          )
        }
      } catch (loadError) {
        console.error(
          'Unable to check application:',
          loadError
        )

        if (active) {
          setApplication(null)
        }
      } finally {
        if (active) {
          setApplicationLoading(false)
        }
      }
    }

    void loadApplication()

    return () => {
      active = false
    }
  }, [id, user?.id, profile?.role])

  async function handleApply() {
    if (!item?.id) {
      toast.error(
        'Internship details are not available.'
      )
      return
    }

    if (!user) {
      toast.error(
        'Sign in as a student to apply.'
      )

      navigate('/login/student', {
        state: {
          from: `/internships/${item.id}`,
        },
      })

      return
    }

    if (profile?.role !== 'student') {
      toast.error(
        'Only student accounts can apply for internships.'
      )
      return
    }

    if (!profile.onboarding_completed) {
      toast.error(
        'Complete student onboarding before applying.'
      )
      navigate('/onboarding/student')
      return
    }

    if (application) {
      toast.error(
        'You already applied for this internship.'
      )
      return
    }

    try {
      setApplying(true)

      const createdApplication =
        await applyToInternship({
          internshipId: item.id,
          resumePath: null,
          coverLetter: '',
          screeningAnswers: {},
        })

      setApplication(
        createdApplication
      )

      toast.success(
        'Application submitted successfully.'
      )
    } catch (applyError) {
      console.error(
        'Application submission failed:',
        applyError
      )

      toast.error(
        applyError?.message ||
          'Unable to submit your application.'
      )
    } finally {
      setApplying(false)
    }
  }

  async function handleSave() {
    if (
      typeof app?.toggleSave !==
      'function'
    ) {
      return
    }

    await app.toggleSave(item.id)
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(
        window.location.href
      )

      toast.success('Link copied')
    } catch {
      toast.error(
        'Unable to copy the link.'
      )
    }
  }

  function formatStipend() {
    if (
      item.compensation_type ===
      'unpaid'
    ) {
      return 'Unpaid'
    }

    const minimum = Number(
      item.stipend_min || 0
    )

    const maximum = Number(
      item.stipend_max || 0
    )

    if (!minimum && !maximum) {
      return 'Not disclosed'
    }

    if (
      maximum &&
      maximum !== minimum
    ) {
      return `₹${minimum.toLocaleString()}–₹${maximum.toLocaleString()}`
    }

    return `₹${(
      minimum || maximum
    ).toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="container-app py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="card h-72 animate-pulse bg-slate-100 dark:bg-slate-900" />
            <div className="card h-52 animate-pulse bg-slate-100 dark:bg-slate-900" />
            <div className="card h-52 animate-pulse bg-slate-100 dark:bg-slate-900" />
          </div>

          <div className="card h-64 animate-pulse bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Unable to load internship"
          text={error}
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              window.location.reload()
            }
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Internship not found"
          text="This internship may be unavailable, expired, or awaiting approval."
        />

        <div className="mt-6 text-center">
          <Link
            to="/internships"
            className="btn-primary"
          >
            Browse internships
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-app py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="badge bg-brand-50 text-brand-700">
                  {item.category ||
                    'Internship'}
                </span>

                <h1 className="mt-4 text-3xl font-black">
                  {item.title}
                </h1>

                <p className="mt-2 text-lg text-slate-500">
                  {item.company} ·{' '}
                  {item.location} ·{' '}
                  {item.mode}
                </p>
              </div>

              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-xl font-black text-brand-700">
                {item.logo}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                [
                  'Stipend',
                  formatStipend(),
                ],
                [
                  'Duration',
                  item.duration,
                ],
                [
                  'Openings',
                  item.openings || 1,
                ],
                [
                  'Deadline',
                  item.deadline
                    ? new Date(
                        `${item.deadline}T00:00:00`
                      ).toLocaleDateString()
                    : 'Not specified',
                ],
              ].map(
                ([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-500">
                      {label}
                    </p>

                    <p className="mt-1 font-bold">
                      {value}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          <DetailSection
            title="About the role"
            content={item.description}
          />

          <DetailSection
            title="Responsibilities"
            content={
              item.responsibilities
            }
          />

          <DetailSection
            title="Eligibility"
            content={item.eligibility}
          />

          <DetailSection
            title="Required skills"
            content={item.skills}
          />

          <DetailSection
            title="Preferred skills"
            content={
              item.preferred_skills
            }
          />

          <DetailSection
            title="Perks"
            content={item.perks}
          />

          <DetailSection
            title="Screening process"
            content={item.screening}
          />

          {item.companies && (
            <section className="card">
              <h2 className="text-xl font-black">
                About {item.company}
              </h2>

              <p className="mt-4 text-slate-600 dark:text-slate-300">
                {item.companies
                  .description ||
                  'Company information is not available.'}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <p>
                  <b>Industry:</b>{' '}
                  {item.companies
                    .industry ||
                    'Not specified'}
                </p>

                <p>
                  <b>Company size:</b>{' '}
                  {item.companies
                    .company_size ||
                    'Not specified'}
                </p>

                <p>
                  <b>Headquarters:</b>{' '}
                  {item.companies
                    .headquarters ||
                    'Not specified'}
                </p>

                {item.companies.website && (
                  <a
                    href={
                      item.companies
                        .website
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand-600 hover:underline"
                  >
                    Visit company website
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="card">
            <button
              type="button"
              onClick={handleApply}
              disabled={
                applying ||
                applicationLoading ||
                Boolean(application)
              }
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {applicationLoading
                ? 'Checking application…'
                : applying
                  ? 'Submitting application…'
                  : application
                    ? formatApplicationStatus(
                        application.status
                      )
                    : 'Apply now'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="btn-secondary mt-3 w-full"
            >
              <Bookmark size={18} />

              {saved.includes(
                String(item.id)
              )
                ? 'Saved'
                : 'Save internship'}
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="btn-secondary mt-3 w-full"
            >
              <Share2 size={18} />
              Share
            </button>

            <p className="mt-5 text-center text-xs text-slate-500">
              Applications are tracked in your dashboard.
            </p>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-black">
            Similar internships
          </h2>

          <div className="grid gap-5 lg:grid-cols-3">
            {similar.map(
              (internship) => (
                <InternshipCard
                  item={internship}
                  key={internship.id}
                />
              )
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function formatApplicationStatus(status) {
  const labels = {
    applied: 'Application submitted',
    under_review: 'Under review',
    shortlisted: 'Shortlisted',
    interview_scheduled:
      'Interview scheduled',
    selected: 'Selected',
    rejected: 'Not selected',
    withdrawn: 'Application withdrawn',
  }

  return (
    labels[status] ||
    'Application submitted'
  )
}

function DetailSection({
  title,
  content,
}) {
  const hasArrayContent =
    Array.isArray(content)

  const isEmpty =
    content == null ||
    content === '' ||
    (hasArrayContent &&
      content.length === 0)

  if (isEmpty) {
    return null
  }

  return (
    <section className="card">
      <h2 className="text-xl font-black">
        {title}
      </h2>

      {hasArrayContent ? (
        <ul className="mt-4 space-y-2">
          {content.map(
            (value, index) => (
              <li
                className="flex gap-2 text-slate-600 dark:text-slate-300"
                key={`${value}-${index}`}
              >
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-emerald-600"
                  size={18}
                />

                {value}
              </li>
            )
          )}
        </ul>
      ) : (
        <p className="mt-4 whitespace-pre-line text-slate-600 dark:text-slate-300">
          {content}
        </p>
      )}
    </section>
  )
}

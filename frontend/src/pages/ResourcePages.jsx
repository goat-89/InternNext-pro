import {
  BookOpen,
  Search,
  ShieldCheck,
} from 'lucide-react'
import {
  useMemo,
  useState,
} from 'react'
import {
  Link,
} from 'react-router-dom'

const helpArticles = [
  {
    category: 'Students',
    title: 'Create and secure a student account',
    summary:
      'Use email OTP, password, phone OTP, or Google where configured. Employer accounts are rejected from student access.',
  },
  {
    category: 'Students',
    title: 'Apply with the correct resume',
    summary:
      'Complete your profile, upload a PDF resume, review the listing deadline, and submit truthful application information.',
  },
  {
    category: 'Students',
    title: 'Withdraw an application',
    summary:
      'Open your applications and withdraw an eligible application while platform withdrawal is enabled. Withdrawn records may then be removable.',
  },
  {
    category: 'Employers',
    title: 'Complete company verification',
    summary:
      'Provide accurate company information and wait for approval where required before publishing approved opportunities.',
  },
  {
    category: 'Employers',
    title: 'Review applicants safely',
    summary:
      'Employers can access applications and resumes only for their own internships. Internal notes must remain private.',
  },
  {
    category: 'Billing',
    title: 'Understand payment and plan status',
    summary:
      'Razorpay payments activate plans only after server-side verification. Billing history and entitlement usage appear in the relevant dashboard.',
  },
  {
    category: 'Security',
    title: 'Recognize suspicious opportunities',
    summary:
      'Do not pay application or placement fees, share OTPs, or provide banking credentials. Report suspicious requests through Contact.',
  },
  {
    category: 'Account',
    title: 'Request account deletion',
    summary:
      'Students and employers can start deletion from settings. Some payment, audit, security, or legal records may require limited retention.',
  },
]

const guides = [
  {
    id: 'resume',
    title:
      'Build an internship-ready resume',
    summary:
      'Make evidence, relevance, and readability do the heavy lifting.',
    points: [
      'Lead with contact details, education, and a short role-relevant summary.',
      'Describe projects with the problem, your contribution, tools, and measurable result.',
      'Mirror truthful skills from the opportunity without copying claims you cannot support.',
      'Use a simple PDF layout and verify links, dates, spelling, and filename before uploading.',
    ],
  },
  {
    id: 'applications',
    title:
      'Submit stronger applications',
    summary:
      'A focused application is easier for an employer to evaluate.',
    points: [
      'Read responsibilities and eligibility before applying.',
      'Choose the most relevant resume and answer screening questions directly.',
      'Use a short cover note to connect two or three concrete experiences to the role.',
      'Track deadlines and avoid duplicate or inaccurate submissions.',
    ],
  },
  {
    id: 'portfolio',
    title:
      'Present portfolio projects clearly',
    summary:
      'A small, understandable project can be more useful than a large unexplained one.',
    points: [
      'Explain the user problem, constraints, and why you chose the approach.',
      'Link a working demo or repository only when it is safe and accessible.',
      'Document setup, your individual contribution, tradeoffs, and next improvements.',
      'Remove secrets, private datasets, and copied work.',
    ],
  },
  {
    id: 'interviews',
    title:
      'Prepare for internship interviews',
    summary:
      'Practice concise evidence and verify every interview detail.',
    points: [
      'Review the listing, company, resume, and likely fundamentals.',
      'Prepare examples using situation, action, reasoning, and result.',
      'Confirm the interviewer, meeting link or location, time zone, and expected format.',
      'Never share OTPs, payment credentials, or remote-device access during an interview.',
    ],
  },
  {
    id: 'employer-listings',
    title:
      'Write a credible internship listing',
    summary:
      'Clear expectations improve trust and application quality.',
    points: [
      'State real responsibilities, mentorship, duration, work mode, location, openings, and compensation.',
      'Separate required skills from skills that can be learned during the internship.',
      'Describe the review process and realistic response timeline.',
      'Never request candidate fees or disguise full-time work as an unpaid internship.',
    ],
  },
  {
    id: 'candidate-review',
    title:
      'Review candidates consistently',
    summary:
      'Use role-related evidence and preserve candidate privacy.',
    points: [
      'Define evaluation criteria before reviewing applicants.',
      'Record concise job-related notes and keep them internal.',
      'Use structured interviews and comparable questions where practical.',
      'Limit resume access to authorized hiring personnel and delete exports when no longer needed.',
    ],
  },
]

export function HelpCenter() {
  const [query, setQuery] =
    useState('')

  const filteredArticles = useMemo(() => {
    const normalized = query
      .trim()
      .toLowerCase()

    if (!normalized) {
      return helpArticles
    }

    return helpArticles.filter(
      (article) =>
        article.title
          .toLowerCase()
          .includes(normalized) ||
        article.summary
          .toLowerCase()
          .includes(normalized) ||
        article.category
          .toLowerCase()
          .includes(normalized)
    )
  }, [query])

  return (
    <div className="container-app py-12 sm:py-16">
      <header className="max-w-3xl">
        <p className="text-sm font-bold uppercase text-brand-600">
          Help center
        </p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Find answers for common workflows
        </h1>
        <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">
          Search account, application,
          employer, billing, and safety
          guidance.
        </p>
      </header>

      <label className="relative mt-8 block max-w-2xl">
        <span className="sr-only">
          Search help articles
        </span>
        <Search
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={19}
        />
        <input
          type="search"
          className="input pl-11"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Search help articles"
        />
      </label>

      <p className="mt-4 text-sm text-slate-500">
        {filteredArticles.length}{' '}
        {filteredArticles.length === 1
          ? 'article'
          : 'articles'}
      </p>

      {filteredArticles.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredArticles.map(
            (article) => (
              <article
                className="card"
                key={article.title}
              >
                <span className="text-xs font-bold uppercase text-brand-600">
                  {article.category}
                </span>
                <h2 className="mt-2 text-lg font-black">
                  {article.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {article.summary}
                </p>
              </article>
            )
          )}
        </div>
      ) : (
        <div className="mt-8 border-y py-10 text-center dark:border-slate-800">
          <p className="font-bold">
            No matching help articles
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Try another term or submit a
            support request.
          </p>
        </div>
      )}

      <div className="mt-10 border-t pt-8 dark:border-slate-800">
        <Link
          className="btn-primary"
          to="/contact"
        >
          Contact support
        </Link>
      </div>
    </div>
  )
}

export function Resources() {
  return (
    <div className="container-app py-12 sm:py-16">
      <header className="max-w-3xl">
        <p className="text-sm font-bold uppercase text-brand-600">
          Resources
        </p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Practical career and hiring guides
        </h1>
        <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">
          Straightforward guidance for
          students preparing applications
          and employers running responsible
          hiring workflows.
        </p>
      </header>

      <nav
        className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        aria-label="Resource guides"
      >
        {guides.map((guide) => (
          <a
            className="card block"
            href={`#${guide.id}`}
            key={guide.id}
          >
            <BookOpen
              className="text-brand-600"
              size={20}
            />
            <h2 className="mt-3 text-lg font-black">
              {guide.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {guide.summary}
            </p>
          </a>
        ))}
      </nav>

      <div className="mt-14 space-y-14">
        {guides.map((guide) => (
          <article
            id={guide.id}
            key={guide.id}
            className="scroll-mt-24 border-t pt-10 dark:border-slate-800"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck
                className="mt-1 shrink-0 text-brand-600"
                size={21}
              />
              <div>
                <h2 className="text-2xl font-black">
                  {guide.title}
                </h2>
                <p className="mt-2 text-slate-500">
                  {guide.summary}
                </p>
              </div>
            </div>

            <ol className="mt-6 grid gap-3 md:grid-cols-2">
              {guide.points.map(
                (point, index) => (
                  <li
                    key={point}
                    className="flex gap-3 border-b py-3 text-sm leading-6 dark:border-slate-800"
                  >
                    <span className="font-black text-brand-600">
                      {index + 1}.
                    </span>
                    <span>{point}</span>
                  </li>
                )
              )}
            </ol>
          </article>
        ))}
      </div>
    </div>
  )
}

import {
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import {
  Link,
} from 'react-router-dom'

import {
  legalDocuments,
  legalLinks,
  legalReviewStatus,
} from '../content/legalContent'

const reviewSources = [
  [
    'Digital Personal Data Protection Act and Rules',
    'https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa',
  ],
  [
    'Information Technology Rules',
    'https://www.meity.gov.in/documents/act-and-policies/information-technology-intermediary-guidelines-and-digital-media-ethics-code-rules-2021-it-rules-2021-IjM5QjMtQWa',
  ],
  [
    'Consumer Protection framework',
    'https://consumeraffairs.nic.in/acts-and-rules/consumer-protection/consumer-protection',
  ],
]

export default function LegalDocument({
  documentKey,
}) {
  const document =
    legalDocuments[documentKey]

  if (!document) {
    return null
  }

  return (
    <div className="border-b bg-white dark:bg-slate-950">
      <header className="border-b bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="container-app">
          <p className="text-sm font-bold uppercase text-brand-600">
            Legal and trust
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black sm:text-4xl">
            {document.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {document.summary}
          </p>

          <dl className="mt-6 grid max-w-2xl gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-bold">
                Version
              </dt>
              <dd className="text-slate-500">
                {legalReviewStatus.version}
              </dd>
            </div>
            <div>
              <dt className="font-bold">
                Effective date
              </dt>
              <dd className="text-slate-500">
                {
                  legalReviewStatus.effectiveDate
                }
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="container-app py-10">
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 shrink-0"
              size={19}
            />
            <p>
              {legalReviewStatus.notice}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside>
            <h2 className="text-sm font-black uppercase text-slate-500">
              Legal documents
            </h2>
            <nav
              className="mt-3 space-y-1"
              aria-label="Legal documents"
            >
              {legalLinks.map(
                ([label, path]) => (
                  <Link
                    key={path}
                    to={path}
                    className="block py-1.5 text-sm font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-300"
                  >
                    {label}
                  </Link>
                )
              )}
            </nav>
          </aside>

          <article className="min-w-0">
            <div className="space-y-10">
              {document.sections.map(
                (section) => (
                  <section
                    key={section.title}
                    className="border-b border-slate-200 pb-10 last:border-0 dark:border-slate-800"
                  >
                    <h2 className="text-xl font-black">
                      {section.title}
                    </h2>

                    {section.paragraphs?.map(
                      (paragraph) => (
                        <p
                          key={paragraph}
                          className="mt-4 leading-7 text-slate-600 dark:text-slate-300"
                        >
                          {paragraph}
                        </p>
                      )
                    )}

                    {section.bullets && (
                      <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-slate-600 dark:text-slate-300">
                        {section.bullets.map(
                          (item) => (
                            <li key={item}>
                              {item}
                            </li>
                          )
                        )}
                      </ul>
                    )}
                  </section>
                )
              )}
            </div>

            <section className="mt-12 border-t pt-8 dark:border-slate-800">
              <h2 className="text-lg font-black">
                Review references
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Official sources for counsel
                and compliance review. They do
                not replace professional advice.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {reviewSources.map(
                  ([label, href]) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-brand-600"
                    >
                      {label}
                      <ExternalLink
                        size={15}
                      />
                    </a>
                  )
                )}
              </div>
            </section>
          </article>
        </div>
      </div>
    </div>
  )
}

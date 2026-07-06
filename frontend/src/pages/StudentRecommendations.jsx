import {
  AlertCircle,
  Sparkles,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Link } from 'react-router-dom'

import InternshipCard from '../components/InternshipCard'

import {
  DashboardShell,
} from '../components/Layout'

import {
  EmptyState,
  Skeleton,
} from '../components/UI'

import {
  studentNav,
} from '../lib/dashboardNav'

import {
  getPublicInternships,
} from '../lib/internshipsApi'

import {
  getStudentProfileSettings,
} from '../lib/studentProfileApi'

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function normalizeList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(normalizeText)
    .filter(Boolean)
}

function includesAnyText(haystack, needles) {
  const normalizedHaystack =
    normalizeText(haystack)

  return needles.some((needle) =>
    normalizedHaystack.includes(needle)
  )
}

function getMatchScore(internship, profile) {
  const studentSkills =
    normalizeList(profile.skills)

  const categories =
    normalizeList(
      profile.preferredCategories
    )

  const locations =
    normalizeList(
      profile.preferredLocations
    )

  const workModes =
    normalizeList(
      profile.preferredWorkModes
    )

  const requiredSkills =
    normalizeList(
      internship.skills_required
    )

  const preferredSkills =
    normalizeList(
      internship.preferred_skills
    )

  const internshipSkills = [
    ...new Set([
      ...requiredSkills,
      ...preferredSkills,
    ]),
  ]

  let score = 0
  const reasons = []

  const skillMatches =
    internshipSkills.filter((skill) =>
      studentSkills.includes(skill)
    )

  if (skillMatches.length > 0) {
    score += Math.min(
      skillMatches.length * 18,
      54
    )

    reasons.push(
      `${skillMatches.length} skill match${
        skillMatches.length === 1
          ? ''
          : 'es'
      }`
    )
  }

  if (
    categories.includes(
      normalizeText(internship.category)
    )
  ) {
    score += 22
    reasons.push('preferred category')
  }

  if (
    workModes.includes(
      normalizeText(internship.work_mode)
    )
  ) {
    score += 14
    reasons.push('preferred work mode')
  }

  if (
    locations.length > 0 &&
    includesAnyText(
      internship.location,
      locations
    )
  ) {
    score += 10
    reasons.push('preferred location')
  }

  if (internship.featured) {
    score += 4
  }

  return {
    score,
    reasons,
  }
}

function enrichRecommendations(
  internships,
  profile
) {
  return internships
    .map((internship) => {
      const match =
        getMatchScore(
          internship,
          profile
        )

      return {
        ...internship,
        recommendationScore:
          match.score,
        recommendationReasons:
          match.reasons,
      }
    })
    .filter(
      (internship) =>
        internship.recommendationScore > 0
    )
    .sort((left, right) => {
      if (
        right.recommendationScore !==
        left.recommendationScore
      ) {
        return (
          right.recommendationScore -
          left.recommendationScore
        )
      }

      return new Date(
        right.published_at ||
          right.created_at ||
          0
      ).getTime() -
        new Date(
          left.published_at ||
            left.created_at ||
            0
        ).getTime()
    })
}

export default function StudentRecommendations() {
  const [
    profile,
    setProfile,
  ] = useState(null)

  const [
    internships,
    setInternships,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    let active = true

    async function loadRecommendations() {
      try {
        setLoading(true)
        setError('')

        const [
          profileResult,
          internshipRows,
        ] = await Promise.all([
          getStudentProfileSettings(),
          getPublicInternships({
            limit: 150,
          }),
        ])

        if (!active) {
          return
        }

        setProfile(profileResult)
        setInternships(internshipRows)
      } catch (loadError) {
        console.error(
          'Unable to load recommendations:',
          loadError
        )

        if (active) {
          setError(
            loadError?.message ||
              'Unable to load recommendations.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadRecommendations()

    return () => {
      active = false
    }
  }, [])

  const recommendations = useMemo(
    () =>
      profile
        ? enrichRecommendations(
            internships,
            profile
          )
        : [],
    [
      internships,
      profile,
    ]
  )

  const hasPreferenceData =
    normalizeList(profile?.skills).length > 0 ||
    normalizeList(
      profile?.preferredCategories
    ).length > 0 ||
    normalizeList(
      profile?.preferredLocations
    ).length > 0 ||
    normalizeList(
      profile?.preferredWorkModes
    ).length > 0

  return (
    <DashboardShell
      title="Recommended internships"
      navItems={studentNav}
    >
      <section className="mb-6 rounded-3xl border bg-white p-6 shadow-sm dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-brand-600">
              <Sparkles className="h-4 w-4" />
              Personalized matches
            </div>

            <h1 className="mt-3 text-2xl font-black">
              Internships matched to your profile
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Matches are ranked from your skills,
              preferred categories, locations, and work
              modes.
            </p>
          </div>

          <Link
            to="/student/settings"
            className="btn-secondary"
          >
            Update preferences
          </Link>
        </div>
      </section>

      {loading && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      )}

      {!loading && error && (
        <EmptyState
          title="Unable to load recommendations"
          text={error}
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                window.location.reload()
              }
            >
              Try again
            </button>
          }
        />
      )}

      {!loading &&
        !error &&
        !hasPreferenceData && (
          <EmptyState
            title="Complete your preferences"
            text="Add skills, categories, locations, and work modes to generate better internship recommendations."
            action={
              <Link
                to="/student/settings"
                className="btn-primary"
              >
                Update profile
              </Link>
            }
          />
        )}

      {!loading &&
        !error &&
        hasPreferenceData &&
        recommendations.length === 0 && (
          <EmptyState
            title="No strong matches yet"
            text="No approved internships currently match your profile. Browse all internships or broaden your preferences."
            action={
              <Link
                to="/internships"
                className="btn-primary"
              >
                Browse internships
              </Link>
            }
          />
        )}

      {!loading &&
        !error &&
        recommendations.length > 0 && (
          <div className="grid gap-5 xl:grid-cols-2">
            {recommendations.map(
              (internship) => (
                <div
                  key={internship.id}
                  className="space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="badge bg-brand-50 text-brand-700">
                      {
                        internship.recommendationScore
                      }
                      % match
                    </span>

                    {internship
                      .recommendationReasons
                      .slice(0, 3)
                      .map((reason) => (
                        <span
                          key={reason}
                          className="badge bg-slate-100 dark:bg-slate-800"
                        >
                          {reason}
                        </span>
                      ))}
                  </div>

                  <InternshipCard
                    item={internship}
                  />
                </div>
              )
            )}
          </div>
        )}

      {!loading &&
        !error &&
        recommendations.length > 0 &&
        internships.length >
          recommendations.length && (
          <section className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <p>
                Showing the internships with profile
                matches first. You can still browse all
                approved listings from the internships
                page.
              </p>
            </div>
          </section>
        )}
    </DashboardShell>
  )
}

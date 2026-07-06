import { supabase } from './supabase'
import { getPublicInternships } from './internshipsApi'

function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value
    : []
}

function prepareInternship(record) {
  const company =
    normalizeRelation(record.companies)

  const companyName =
    company?.name ||
    'Company not available'

  const workMode =
    String(record.work_mode || '')
      .toLowerCase()

  return {
    ...record,

    companies: company,

    company: companyName,

    logo:
      companyName
        .slice(0, 2)
        .toUpperCase() || 'IN',

    mode:
      workMode === 'remote'
        ? 'Remote'
        : workMode === 'hybrid'
          ? 'Hybrid'
          : workMode === 'onsite'
            ? 'Onsite'
            : 'Not specified',

    duration: record.duration_months
      ? `${record.duration_months} months`
      : 'Not specified',

    stipend: Number(
      record.stipend_min || 0
    ),

    skills: normalizeArray(
      record.skills_required
    ),

    posted: record.published_at
      ? new Date(
          record.published_at
        ).toLocaleDateString()
      : 'Recently',
  }
}

function calculateProfileStrength(
  studentProfile
) {
  if (!studentProfile) {
    return 0
  }

  const checks = [
    Boolean(studentProfile.college),
    Boolean(studentProfile.degree),
    Boolean(studentProfile.bio),

    normalizeArray(
      studentProfile.skills
    ).length > 0,

    normalizeArray(
      studentProfile.preferred_categories
    ).length > 0,

    normalizeArray(
      studentProfile.preferred_locations
    ).length > 0,

    normalizeArray(
      studentProfile.preferred_work_modes
    ).length > 0,

    Boolean(
      studentProfile.portfolio_url
    ),

    Boolean(
      studentProfile.linkedin_url
    ),

    Boolean(
      studentProfile.primary_resume_path
    ),
  ]

  const completed =
    checks.filter(Boolean).length

  return Math.round(
    (completed / checks.length) * 100
  )
}

function calculateRecommendationScore(
  internship,
  studentProfile
) {
  let score = 0

  const categories =
    normalizeArray(
      studentProfile
        ?.preferred_categories
    )
      .map((value) =>
        String(value).toLowerCase()
      )

  const locations =
    normalizeArray(
      studentProfile
        ?.preferred_locations
    )
      .map((value) =>
        String(value).toLowerCase()
      )

  const workModes =
    normalizeArray(
      studentProfile
        ?.preferred_work_modes
    )
      .map((value) =>
        String(value).toLowerCase()
      )

  const studentSkills =
    normalizeArray(
      studentProfile?.skills
    )
      .map((value) =>
        String(value).toLowerCase()
      )

  if (
    categories.includes(
      String(
        internship.category || ''
      ).toLowerCase()
    )
  ) {
    score += 4
  }

  if (
    locations.includes(
      String(
        internship.location || ''
      ).toLowerCase()
    )
  ) {
    score += 3
  }

  if (
    workModes.includes(
      String(
        internship.work_mode || ''
      ).toLowerCase()
    )
  ) {
    score += 2
  }

  const requiredSkills =
    normalizeArray(
      internship.skills_required
    )
      .map((value) =>
        String(value).toLowerCase()
      )

  const matchingSkills =
    requiredSkills.filter(
      (skill) =>
        studentSkills.includes(skill)
    )

  score += matchingSkills.length

  if (internship.featured) {
    score += 1
  }

  return score
}

export async function getStudentDashboardData() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'You must sign in as a student.'
    )
  }

  const [
    applicationsResult,
    savedResult,
    studentProfileResult,
    publicInternships,
  ] = await Promise.all([
    supabase
      .from('applications')
      .select(`
        id,
        internship_id,
        status,
        created_at,
        internships (
          id,
          title,
          location,
          work_mode,
          companies (
            id,
            name
          )
        )
      `)
      .eq('student_id', user.id)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('saved_internships')
      .select(
        'internship_id',
        {
          count: 'exact',
          head: true,
        }
      )
      .eq('student_id', user.id),

    supabase
      .from('student_profiles')
      .select(`
        college,
        degree,
        bio,
        skills,
        preferred_categories,
        preferred_locations,
        preferred_work_modes,
        portfolio_url,
        linkedin_url,
        primary_resume_path
      `)
      .eq('user_id', user.id)
      .maybeSingle(),

    getPublicInternships(),
  ])

  if (applicationsResult.error) {
    throw applicationsResult.error
  }

  if (savedResult.error) {
    throw savedResult.error
  }

  if (studentProfileResult.error) {
    throw studentProfileResult.error
  }

  const applications =
    applicationsResult.data ?? []

  const studentProfile =
    studentProfileResult.data

  const appliedInternshipIds =
    new Set(
      applications.map(
        (application) =>
          String(
            application.internship_id
          )
      )
    )

  const recommendations =
    publicInternships
      .filter(
        (internship) =>
          !appliedInternshipIds.has(
            String(internship.id)
          )
      )
      .map((internship) => ({
        internship:
          prepareInternship(
            internship
          ),

        score:
          calculateRecommendationScore(
            internship,
            studentProfile
          ),
      }))
      .sort(
        (first, second) =>
          second.score - first.score
      )
      .slice(0, 3)
      .map(
        (record) =>
          record.internship
      )

  const interviewCount =
    applications.filter(
      (application) =>
        application.status ===
        'interview_scheduled'
    ).length

  const selectedCount =
    applications.filter(
      (application) =>
        application.status ===
        'selected'
    ).length

  return {
    stats: {
      applications:
        applications.length,

      saved:
        savedResult.count ?? 0,

      interviews:
        interviewCount,

      selected:
        selectedCount,
    },

    recentApplications:
      applications.slice(0, 5),

    recommendations,

    profileStrength:
      calculateProfileStrength(
        studentProfile
      ),

    studentProfile,
  }
}
import {
  supabase,
} from './supabase'

function cleanText(value) {
  return String(
    value ?? ''
  ).trim()
}

function cleanArray(value) {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .map(cleanText)
          .filter(Boolean)
      ),
    ]
  }

  return [
    ...new Set(
      cleanText(value)
        .split(',')
        .map(cleanText)
        .filter(Boolean)
    ),
  ]
}

function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

async function requireStudent() {
  const {
    data: {
      user,
    },
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

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      phone,
      avatar_path,
      role,
      account_status,
      onboarding_completed
    `)
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (
    !profile ||
    profile.role !== 'student'
  ) {
    throw new Error(
      'Student access is required.'
    )
  }

  if (
    profile.account_status ===
    'suspended'
  ) {
    throw new Error(
      'This student account is suspended.'
    )
  }

  return {
    user,
    profile,
  }
}

export async function getStudentProfileSettings() {
  const {
    user,
    profile,
  } = await requireStudent()

  const {
    data: studentProfileData,
    error,
  } = await supabase
    .from('student_profiles')
    .select(`
      user_id,
      college,
      university,
      degree,
      specialization,
      passing_year,
      bio,
      skills,
      preferred_categories,
      preferred_locations,
      preferred_work_modes,
      available_immediately,
      portfolio_url,
      github_url,
      linkedin_url,
      primary_resume_path,
      created_at,
      updated_at
    `)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw error
  }

  const studentProfile =
    normalizeRelation(
      studentProfileData
    ) || {}

  return {
    id: profile.id,
    email: profile.email || '',
    fullName:
      profile.full_name || '',
    phone:
      profile.phone || '',
    avatarPath:
      profile.avatar_path || null,

    college:
      studentProfile.college || '',
    university:
      studentProfile.university || '',
    degree:
      studentProfile.degree || '',
    specialization:
      studentProfile.specialization ||
      '',

    passingYear:
      studentProfile.passing_year ||
      '',

    bio:
      studentProfile.bio || '',

    skills:
      Array.isArray(
        studentProfile.skills
      )
        ? studentProfile.skills
        : [],

    preferredCategories:
      Array.isArray(
        studentProfile
          .preferred_categories
      )
        ? studentProfile
            .preferred_categories
        : [],

    preferredLocations:
      Array.isArray(
        studentProfile
          .preferred_locations
      )
        ? studentProfile
            .preferred_locations
        : [],

    preferredWorkModes:
      Array.isArray(
        studentProfile
          .preferred_work_modes
      )
        ? studentProfile
            .preferred_work_modes
        : [],

    availableImmediately:
      Boolean(
        studentProfile
          .available_immediately
      ),

    portfolioUrl:
      studentProfile.portfolio_url ||
      '',

    githubUrl:
      studentProfile.github_url ||
      '',

    linkedinUrl:
      studentProfile.linkedin_url ||
      '',

    resumePath:
      studentProfile
        .primary_resume_path ||
      null,
  }
}

export async function updateStudentProfileSettings(
  values
) {
  await requireStudent()

  const fullName =
    cleanText(values.fullName)

  if (fullName.length < 2) {
    throw new Error(
      'Enter a valid full name.'
    )
  }

  const phone =
    cleanText(values.phone)

  if (
    phone &&
    phone.length < 7
  ) {
    throw new Error(
      'Enter a valid phone number.'
    )
  }

  const passingYear =
    cleanText(values.passingYear)

  if (passingYear) {
    const numericYear =
      Number(passingYear)

    if (
      !Number.isInteger(
        numericYear
      ) ||
      numericYear < 1980 ||
      numericYear > 2100
    ) {
      throw new Error(
        'Passing year must be between 1980 and 2100.'
      )
    }
  }

  const payload = {
    full_name: fullName,
    phone,

    college:
      cleanText(values.college),

    university:
      cleanText(values.university),

    degree:
      cleanText(values.degree),

    specialization:
      cleanText(
        values.specialization
      ),

    passing_year:
      passingYear,

    bio:
      cleanText(values.bio),

    skills:
      cleanArray(values.skills),

    preferred_categories:
      cleanArray(
        values.preferredCategories
      ),

    preferred_locations:
      cleanArray(
        values.preferredLocations
      ),

    preferred_work_modes:
      cleanArray(
        values.preferredWorkModes
      ),

    available_immediately:
      Boolean(
        values.availableImmediately
      ),

    portfolio_url:
      cleanText(
        values.portfolioUrl
      ),

    github_url:
      cleanText(
        values.githubUrl
      ),

    linkedin_url:
      cleanText(
        values.linkedinUrl
      ),
  }

  const {
    error,
  } = await supabase.rpc(
    'update_student_profile',
    {
      profile_data: payload,
    }
  )

  if (error) {
    throw error
  }

  return getStudentProfileSettings()
}
import { supabase } from './supabase'

const appUrl =
  import.meta.env.VITE_APP_URL ||
  window.location.origin

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function getSafeRelativePath(path) {
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//')
  ) {
    return ''
  }

  return path
}

function getAuthRedirectUrl(
  nextPath = '',
  roleIntent = ''
) {
  const safePath =
    getSafeRelativePath(nextPath)
  const safeRoleIntent =
    ['student', 'employer', 'admin'].includes(
      roleIntent
    )
      ? roleIntent
      : ''

  const url = new URL(
    `${appUrl}/auth/callback`
  )

  if (safePath) {
    url.searchParams.set('next', safePath)
  }

  if (safeRoleIntent) {
    url.searchParams.set(
      'role_intent',
      safeRoleIntent
    )
  }

  return url.toString()
}

export async function registerStudent(values) {
  const { data, error } =
    await supabase.auth.signUp({
      email: normalizeEmail(values.email),
      password: values.password,

      options: {
        emailRedirectTo:
          `${appUrl}/auth/callback`,

        data: {
          role: 'student',
          full_name: values.fullName.trim(),
          phone: values.phone.trim(),
        },
      },
    })

  if (error) throw error

  return data
}

export async function registerEmployer(values) {
  const { data, error } =
    await supabase.auth.signUp({
      email: normalizeEmail(values.email),
      password: values.password,

      options: {
        emailRedirectTo:
          `${appUrl}/auth/callback`,

        data: {
          role: 'employer',
          full_name: values.contactPerson.trim(),
          phone: values.phone.trim(),
          company_name: values.companyName.trim(),
        },
      },
    })

  if (error) throw error

  return data
}

export async function loginWithPassword(
  email,
  password
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    })

  if (error) throw error

  return data
}

export async function resendVerification(email) {
  const { data, error } =
    await supabase.auth.resend({
      type: 'signup',
      email: normalizeEmail(email),

      options: {
        emailRedirectTo:
          `${appUrl}/auth/callback`,
      },
    })

  if (error) throw error

  return data
}

export async function requestPasswordReset(email) {
  const { data, error } =
    await supabase.auth.resetPasswordForEmail(
      normalizeEmail(email),
      {
        redirectTo:
          `${appUrl}/reset-password`,
      }
    )

  if (error) throw error

  return data
}

export async function updatePassword(password) {
  const { data, error } =
    await supabase.auth.updateUser({
      password,
    })

  if (error) throw error

  return data
}

export async function logoutCurrentSession() {
  const { error } =
    await supabase.auth.signOut({
      scope: 'local',
    })

  if (error) throw error
}

export async function loginWithGoogle() {
  const { data, error } =
    await supabase.auth.signInWithOAuth({
      provider: 'google',

      options: {
        redirectTo:
          getAuthRedirectUrl(),
      },
    })

  if (error) throw error

  return data
}

export async function loginWithGoogleForStudent(
  nextPath = ''
) {
  const { data, error } =
    await supabase.auth.signInWithOAuth({
      provider: 'google',

      options: {
        redirectTo:
          getAuthRedirectUrl(
            nextPath,
            'student'
          ),
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

  if (error) throw error

  return data
}

export async function sendStudentEmailOtp({
  email,
  mode = 'login',
}) {
  const normalizedEmail =
    normalizeEmail(email)

  const shouldCreateUser =
    mode === 'signup'

  const { data, error } =
    await supabase.auth.signInWithOtp({
      email: normalizedEmail,

      options: {
        emailRedirectTo:
          getAuthRedirectUrl(
            '',
            'student'
          ),
        shouldCreateUser,
        data: shouldCreateUser
          ? {
              role: 'student',
            }
          : undefined,
      },
    })

  if (error) throw error

  return data
}

export async function verifyStudentEmailOtp({
  email,
  token,
}) {
  const { data, error } =
    await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token,
      type: 'email',
    })

  if (error) throw error

  return data
}

export async function sendStudentPhoneOtp({
  phone,
  mode = 'login',
  channel = 'sms',
}) {
  const shouldCreateUser =
    mode === 'signup'

  const options = {
    shouldCreateUser,
    data: shouldCreateUser
      ? {
          role: 'student',
        }
      : undefined,
  }

  if (channel === 'whatsapp') {
    options.channel = 'whatsapp'
  }

  const { data, error } =
    await supabase.auth.signInWithOtp({
      phone,
      options,
    })

  if (error) throw error

  return data
}

export async function verifyStudentPhoneOtp({
  phone,
  token,
}) {
  const { data, error } =
    await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })

  if (error) throw error

  return data
}

export async function fetchCurrentProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      phone,
      avatar_path,
      role,
      account_status,
      email_verified,
      onboarding_completed,
      created_at,
      updated_at
    `)
    .eq('id', userId)
    .single()

  if (error) throw error

  return data
}

export async function completeStudentOnboarding(
  values
) {
  const payload = {
    full_name: values.fullName,
    phone: values.phone,
    college: values.college,
    university: values.university,
    degree: values.degree,
    specialization: values.specialization,
    passing_year: values.passingYear,
    bio: values.bio,
    skills: values.skills,
    preferred_categories:
      values.preferredCategories,
    preferred_locations:
      values.preferredLocations,
    preferred_work_modes:
      values.preferredWorkModes,
    available_immediately:
      values.availableImmediately,
    portfolio_url: values.portfolioUrl,
    github_url: values.githubUrl,
    linkedin_url: values.linkedinUrl,
  }

  const { error } = await supabase.rpc(
    'complete_student_onboarding',
    {
      profile_data: payload,
    }
  )

  if (error) throw error
}

export async function completeEmployerOnboarding(
  values
) {
  const payload = {
    full_name: values.fullName,
    phone: values.phone,
    designation: values.designation,
    department: values.department,
    linkedin_url: values.linkedinUrl,

    company_name: values.companyName,
    legal_name: values.legalName,
    description: values.description,
    industry: values.industry,
    company_type: values.companyType,
    company_size: values.companySize,
    founded_year: values.foundedYear,
    website: values.website,
    business_email: values.businessEmail,
    company_phone: values.companyPhone,
    headquarters: values.headquarters,
    gst_number: values.gstNumber,
    registration_number:
      values.registrationNumber,
  }

  const { data, error } = await supabase.rpc(
    'complete_employer_onboarding',
    {
      profile_data: payload,
    }
  )

  if (error) throw error

  return data
}

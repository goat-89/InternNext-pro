import { supabase } from './supabase'

const allowedAccountStatuses = [
  'active',
  'suspended',
]

async function requireAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'You must sign in as an administrator.'
    )
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      full_name
    `)
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile || profile.role !== 'admin') {
    throw new Error(
      'Administrator access is required.'
    )
  }

  return {
    user,
    profile,
  }
}

export async function getAdminStudents() {
  await requireAdmin()

  const {
    data: profiles,
    error: profilesError,
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
      email_verified,
      onboarding_completed,
      created_at,
      updated_at
    `)
    .eq('role', 'student')
    .order('created_at', {
      ascending: false,
    })

  if (profilesError) {
    throw profilesError
  }

  const studentProfiles =
    profiles ?? []

  if (studentProfiles.length === 0) {
    return []
  }

  const studentIds =
    studentProfiles.map(
      (profile) => profile.id
    )

  const {
    data: details,
    error: detailsError,
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
    .in('user_id', studentIds)

  if (detailsError) {
    throw detailsError
  }

  const detailsByUserId = new Map(
    (details ?? []).map(
      (record) => [
        record.user_id,
        record,
      ]
    )
  )

  return studentProfiles.map(
    (profile) => ({
      ...profile,

      student_profile:
        detailsByUserId.get(
          profile.id
        ) || null,
    })
  )
}

export async function updateStudentAccountStatus(
  studentId,
  accountStatus
) {
  if (!studentId) {
    throw new Error(
      'Student ID is required.'
    )
  }

  if (
    !allowedAccountStatuses.includes(
      accountStatus
    )
  ) {
    throw new Error(
      'Invalid account status.'
    )
  }

  await requireAdmin()

  const { data, error } = await supabase
    .rpc(
      'admin_update_student_account_status',
      {
        p_student_id: studentId,
        p_account_status: accountStatus,
      }
    )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Student not found or access denied.'
    )
  }

  return data
}   

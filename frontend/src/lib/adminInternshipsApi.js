import { supabase } from './supabase'

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

export async function getAdminInternships(
  {
    status = 'all',
  } = {}
) {
  await requireAdmin()

  let query = supabase
    .from('internships')
    .select(`
      id,
      employer_id,
      company_id,
      title,
      department,
      category,
      location,
      work_mode,
      experience_level,
      duration_months,
      compensation_type,
      stipend_min,
      stipend_max,
      currency,
      stipend_period,
      openings,
      skills_required,
      preferred_skills,
      description,
      responsibilities,
      eligibility,
      perks,
      screening_steps,
      start_date,
      deadline,
      status,
      rejection_reason,
      featured,
      published_at,
      created_at,
      updated_at,
      companies (
        id,
        name,
        industry,
        status,
        logo_path
      )
    `)
    .order('created_at', {
      ascending: false,
    })

  if (status !== 'all') {
    query = query.eq(
      'status',
      status
    )
  }

  const { data, error } =
    await query

  if (error) {
    throw error
  }

  return data ?? []
}

export async function approveInternship(
  internshipId
) {
  if (!internshipId) {
    throw new Error(
      'Internship ID is required.'
    )
  }

  await requireAdmin()

  const { data, error } = await supabase
    .rpc('admin_approve_internship', {
      p_internship_id: internshipId,
    })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Only pending internships can be approved.'
    )
  }

  return data
}

export async function rejectInternship(
  internshipId,
  rejectionReason
) {
  if (!internshipId) {
    throw new Error(
      'Internship ID is required.'
    )
  }

  const reason = String(
    rejectionReason ?? ''
  ).trim()

  if (!reason) {
    throw new Error(
      'A rejection reason is required.'
    )
  }

  await requireAdmin()

  const { data, error } = await supabase
    .rpc('admin_reject_internship', {
      p_internship_id: internshipId,
      p_rejection_reason: reason,
    })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Only pending internships can be rejected.'
    )
  }

  return data
}

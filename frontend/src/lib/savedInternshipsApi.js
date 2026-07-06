import { supabase } from './supabase'

async function getCurrentStudentId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'You must sign in as a student.'
    )
  }

  return user.id
}

export async function getSavedInternshipIds() {
  const studentId =
    await getCurrentStudentId()

  const { data, error } = await supabase
    .from('saved_internships')
    .select('internship_id')
    .eq('student_id', studentId)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map((record) =>
    String(record.internship_id)
  )
}

export async function getSavedInternships() {
  const studentId =
    await getCurrentStudentId()

  const { data, error } = await supabase
    .from('saved_internships')
    .select(`
      internship_id,
      created_at,
      internships (
        id,
        title,
        category,
        location,
        work_mode,
        duration_months,
        compensation_type,
        stipend_min,
        stipend_max,
        currency,
        stipend_period,
        openings,
        skills_required,
        deadline,
        featured,
        published_at,
        status,
        companies (
          id,
          name,
          slug,
          logo_path
        )
      )
    `)
    .eq('student_id', studentId)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return (data ?? [])
    .map((record) => ({
      savedAt: record.created_at,
      ...record.internships,
    }))
    .filter((internship) => internship?.id)
}

export async function saveInternship(
  internshipId
) {
  if (!internshipId) {
    throw new Error(
      'Internship ID is required.'
    )
  }

  const studentId =
    await getCurrentStudentId()

  const { error } = await supabase
    .from('saved_internships')
    .upsert(
      {
        student_id: studentId,
        internship_id: internshipId,
      },
      {
        onConflict:
          'student_id,internship_id',
        ignoreDuplicates: true,
      }
    )

  if (error) {
    throw error
  }

  return true
}

export async function removeSavedInternship(
  internshipId
) {
  if (!internshipId) {
    throw new Error(
      'Internship ID is required.'
    )
  }

  const studentId =
    await getCurrentStudentId()

  const { error } = await supabase
    .from('saved_internships')
    .delete()
    .eq('student_id', studentId)
    .eq('internship_id', internshipId)

  if (error) {
    throw error
  }

  return true
}

export async function unsaveInternship(
  internshipId
) {
  return removeSavedInternship(
    internshipId
  )
}

export async function checkInternshipSaved(
  internshipId
) {
  if (!internshipId) {
    return false
  }

  const studentId =
    await getCurrentStudentId()

  const { data, error } = await supabase
    .from('saved_internships')
    .select('internship_id')
    .eq('student_id', studentId)
    .eq('internship_id', internshipId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

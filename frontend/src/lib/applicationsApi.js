import { supabase } from './supabase'

import {
  getPublicPlatformSettings,
} from './platformSettingsApi';

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

async function getPrimaryResumePath(studentId) {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('primary_resume_path')
    .eq('user_id', studentId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.primary_resume_path || null
}

export async function applyToInternship({
  internshipId,
  resumePath = null,
  coverLetter = '',
  screeningAnswers = {},
}) {
  if (!internshipId) {
    throw new Error(
      'Internship ID is required.'
    )
  }

  const studentId =
    await getCurrentStudentId()

  const applicationResumePath =
    resumePath ||
    (await getPrimaryResumePath(studentId))

  const { data, error } = await supabase
    .from('applications')
    .insert({
      internship_id: internshipId,
      student_id: studentId,
      resume_path: applicationResumePath,
      cover_letter:
        coverLetter.trim() || null,
      screening_answers:
        screeningAnswers,
      status: 'applied',
    })
    .select(`
      id,
      internship_id,
      student_id,
      status,
      interview_at,
      interview_mode,
      interview_location,
      meeting_link,
      interview_notes,
      created_at
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'You already applied for this internship.'
      )
    }

    throw error
  }

  return data
}

export async function getMyApplications() {
  const studentId =
    await getCurrentStudentId()

  const { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      internship_id,
      student_id,
      resume_path,
      cover_letter,
      screening_answers,
      status,
      interview_at,
      interview_mode,
      interview_location,
      meeting_link,
      interview_notes,
      rejection_reason,
      created_at,
      updated_at,
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
        deadline,
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

  return data ?? []
}

export async function getMyApplicationForInternship(
  internshipId
) {
  if (!internshipId) {
    return null
  }

  const studentId =
    await getCurrentStudentId()

  const { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      internship_id,
      status,
      created_at
    `)
    .eq('student_id', studentId)
    .eq('internship_id', internshipId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function withdrawApplication(
applicationId
) {
if (!applicationId) {
throw new Error(
'Application ID is required.'
);
}

const settings =
await getPublicPlatformSettings();

if (
!settings
.application_withdrawal_enabled
) {
throw new Error(
'Application withdrawal is currently disabled.'
);
}

const studentId =
await getCurrentStudentId();

const {
data,
error,
} = await supabase
.from('applications')
.update({
status: 'withdrawn',


  updated_at:
    new Date().toISOString(),
})
.eq(
  'id',
  applicationId
)
.eq(
  'student_id',
  studentId
)
.in(
  'status',
  [
    'applied',
    'under_review',
    'shortlisted',
  ]
)
.select(`
  id,
  internship_id,
  status,
  updated_at
`)
.maybeSingle();


if (error) {
if (
error.message?.includes(
'Application withdrawal is currently disabled'
)
) {
throw new Error(
'Application withdrawal is currently disabled.'
);
}


throw error;


}

if (!data) {
throw new Error(
'This application cannot be withdrawn.'
);
}

return data;
}


export async function deleteWithdrawnApplication(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      'Application ID is required.'
    )
  }

  const studentId =
    await getCurrentStudentId()

  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', applicationId)
    .eq('student_id', studentId)
    .eq('status', 'withdrawn')

  if (error) {
    throw error
  }

  return true
}

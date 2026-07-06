import { supabase } from './supabase'

const employerApplicationStatuses = [
  'applied',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'selected',
  'rejected',
]

const RESUME_BUCKET = 'student-resumes'

function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

async function getCurrentEmployerId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'You must sign in as an employer.'
    )
  }

  return user.id
}

export async function getEmployerApplicants() {
  const employerId =
    await getCurrentEmployerId()

  const {
    data: applications,
    error: applicationsError,
  } = await supabase
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
      created_at,
      updated_at,
      internships!inner (
        id,
        title,
        employer_id,
        company_id,
        location,
        work_mode
      )
    `)
    .eq(
      'internships.employer_id',
      employerId
    )
    .order('created_at', {
      ascending: false,
    })

  if (applicationsError) {
    throw applicationsError
  }

  const records = applications ?? []

  if (records.length === 0) {
    return []
  }

  const studentIds = [
    ...new Set(
      records
        .map(
          (application) =>
            application.student_id
        )
        .filter(Boolean)
    ),
  ]

  const [
    profilesResult,
    studentProfilesResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select(`
        id,
        full_name
      `)
      .in('id', studentIds),

    supabase
      .from('student_profiles')
      .select(`
        user_id,
        college,
        degree,
        bio,
        skills,
        primary_resume_path,
        linkedin_url,
        portfolio_url
      `)
      .in('user_id', studentIds),
  ])

  if (profilesResult.error) {
    throw profilesResult.error
  }

  if (studentProfilesResult.error) {
    throw studentProfilesResult.error
  }

  const profilesById = new Map(
    (profilesResult.data ?? []).map(
      (profile) => [
        profile.id,
        profile,
      ]
    )
  )

  const studentProfilesById =
    new Map(
      (
        studentProfilesResult.data ??
        []
      ).map((profile) => [
        profile.user_id,
        profile,
      ])
    )

  return records.map(
    (application) => {
      const profile =
        profilesById.get(
          application.student_id
        ) || {}

      const studentProfile =
        studentProfilesById.get(
          application.student_id
        ) || {}

      return {
        ...application,

        internship:
          normalizeRelation(
            application.internships
          ),

        student: {
          id:
            application.student_id,

          full_name:
            profile.full_name ||
            'Applicant',

          college:
            studentProfile.college ||
            null,

          degree:
            studentProfile.degree ||
            null,

          bio:
            studentProfile.bio ||
            null,

          skills:
            Array.isArray(
              studentProfile.skills
            )
              ? studentProfile.skills
              : [],

          resume_path:
            application.resume_path ||
            studentProfile
              .primary_resume_path ||
            null,

          linkedin_url:
            studentProfile
              .linkedin_url ||
            null,

          portfolio_url:
            studentProfile
              .portfolio_url ||
            null,
        },
      }
    }
  )
}

export async function updateEmployerApplicationStatus(
  applicationId,
  status
) {
  if (!applicationId) {
    throw new Error(
      'Application ID is required.'
    )
  }

  if (
    !employerApplicationStatuses.includes(
      status
    )
  ) {
    throw new Error(
      'Invalid application status.'
    )
  }

  const employerId =
    await getCurrentEmployerId()

  const {
    data: ownedApplication,
    error: ownershipError,
  } = await supabase
    .from('applications')
    .select(`
      id,
      status,
      internships!inner (
        employer_id
      )
    `)
    .eq('id', applicationId)
    .eq(
      'internships.employer_id',
      employerId
    )
    .maybeSingle()

  if (ownershipError) {
    throw ownershipError
  }

  if (!ownedApplication) {
    throw new Error(
      'Application not found or access denied.'
    )
  }

  if (
    ownedApplication.status ===
    'withdrawn'
  ) {
    throw new Error(
      'A withdrawn application cannot be updated.'
    )
  }

  const { data, error } = await supabase
    .from('applications')
    .update({
      status,
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select(`
      id,
      internship_id,
      student_id,
      status,
      updated_at
    `)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function createApplicantResumeSignedUrl(
  applicationId,
  expiresIn = 600
) {
  if (!applicationId) {
    throw new Error(
      'Application ID is required.'
    )
  }

  const employerId =
    await getCurrentEmployerId()

  const { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      resume_path,
      internships!inner (
        employer_id
      )
    `)
    .eq('id', applicationId)
    .eq(
      'internships.employer_id',
      employerId
    )
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Application not found or access denied.'
    )
  }

  if (!data.resume_path) {
    throw new Error(
      'No resume is attached to this application.'
    )
  }

  const safeExpiry =
    Number.isFinite(Number(expiresIn))
      ? Math.min(
          Math.max(Number(expiresIn), 60),
          3600
        )
      : 600

  const response = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(
      data.resume_path,
      safeExpiry
    )

  if (response.error) {
    throw response.error
  }

  return response.data?.signedUrl || null
}
function normalizeInterviewRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

function cleanInterviewText(value) {
  if (typeof value !== 'string') {
    return null
  }

  const cleaned = value.trim()

  return cleaned || null
}

async function getInterviewEmployerId() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'You must sign in as an employer.'
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
      account_status
    `)
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (
    !profile ||
    profile.role !== 'employer'
  ) {
    throw new Error(
      'Employer access is required.'
    )
  }

  if (
    profile.account_status ===
    'suspended'
  ) {
    throw new Error(
      'This employer account is suspended.'
    )
  }

  return user.id
}

async function getOwnedInterviewApplication(
  applicationId,
  employerId
) {
  const {
    data,
    error,
  } = await supabase
    .from('applications')
    .select(`
      id,
      student_id,
      internship_id,
      status,
      interview_at,
      interview_mode,
      interview_location,
      meeting_link,
      interview_notes,
      internships!inner (
        id,
        title,
        employer_id
      )
    `)
    .eq('id', applicationId)
    .eq(
      'internships.employer_id',
      employerId
    )
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Application not found or access denied.'
    )
  }

  return data
}

export async function scheduleApplicantInterview(
  applicationId,
  values
) {
  if (!applicationId) {
    throw new Error(
      'Application ID is required.'
    )
  }

  const employerId =
    await getInterviewEmployerId()

  const application =
    await getOwnedInterviewApplication(
      applicationId,
      employerId
    )

  const editableStatuses = [
    'applied',
    'under_review',
    'shortlisted',
    'interview_scheduled',
  ]

  if (
    !editableStatuses.includes(
      application.status
    )
  ) {
    throw new Error(
      `An interview cannot be scheduled while the application status is ${application.status}.`
    )
  }

  const interviewAt =
    new Date(values.interviewAt)

  if (
    !values.interviewAt ||
    Number.isNaN(
      interviewAt.getTime()
    )
  ) {
    throw new Error(
      'A valid interview date and time is required.'
    )
  }

  if (interviewAt <= new Date()) {
    throw new Error(
      'The interview must be scheduled in the future.'
    )
  }

  const interviewMode =
    cleanInterviewText(
      values.interviewMode
    )

  const allowedModes = [
    'video',
    'phone',
    'onsite',
  ]

  if (
    !allowedModes.includes(
      interviewMode
    )
  ) {
    throw new Error(
      'Select a valid interview mode.'
    )
  }

  const meetingLink =
    cleanInterviewText(
      values.meetingLink
    )

  const interviewLocation =
    cleanInterviewText(
      values.interviewLocation
    )

  const interviewNotes =
    cleanInterviewText(
      values.interviewNotes
    )

  if (
    interviewMode === 'video' &&
    !meetingLink
  ) {
    throw new Error(
      'A meeting link is required for a video interview.'
    )
  }

  if (
    interviewMode === 'onsite' &&
    !interviewLocation
  ) {
    throw new Error(
      'An interview location is required for an onsite interview.'
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from('applications')
    .update({
      status:
        'interview_scheduled',

      interview_at:
        interviewAt.toISOString(),

      interview_mode:
        interviewMode,

      interview_location:
        interviewLocation,

      meeting_link:
        meetingLink,

      interview_notes:
        interviewNotes,

      updated_at:
        new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq(
      'internship_id',
      application.internship_id
    )
    .select(`
      id,
      student_id,
      internship_id,
      status,
      interview_at,
      interview_mode,
      interview_location,
      meeting_link,
      interview_notes,
      updated_at
    `)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Interview could not be scheduled.'
    )
  }

  return {
    ...data,

    internship:
      normalizeInterviewRelation(
        application.internships
      ),
  }
}

export async function cancelApplicantInterview(
  applicationId
) {
  if (!applicationId) {
    throw new Error(
      'Application ID is required.'
    )
  }

  const employerId =
    await getInterviewEmployerId()

  const application =
    await getOwnedInterviewApplication(
      applicationId,
      employerId
    )

  if (
    application.status !==
    'interview_scheduled'
  ) {
    throw new Error(
      'This application does not have a scheduled interview.'
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from('applications')
    .update({
      status: 'shortlisted',

      interview_at: null,
      interview_mode: null,
      interview_location: null,
      meeting_link: null,
      interview_notes: null,

      updated_at:
        new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq(
      'internship_id',
      application.internship_id
    )
    .select(`
      id,
      status,
      interview_at,
      interview_mode,
      interview_location,
      meeting_link,
      interview_notes,
      updated_at
    `)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Interview could not be cancelled.'
    )
  }

  return data
}

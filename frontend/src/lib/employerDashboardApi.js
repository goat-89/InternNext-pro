import { supabase } from './supabase'

async function requireEmployer() {
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
      full_name,
      email,
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

  return {
    user,
    profile,
  }
}

function createApplicationStatusCounts() {
  return {
    applied: 0,
    under_review: 0,
    shortlisted: 0,
    interview_scheduled: 0,
    selected: 0,
    rejected: 0,
    withdrawn: 0,
  }
}

function countApplicationStatuses(
  applications
) {
  const counts =
    createApplicationStatusCounts()

  applications.forEach(
    (application) => {
      if (
        Object.prototype.hasOwnProperty.call(
          counts,
          application.status
        )
      ) {
        counts[
          application.status
        ] += 1
      }
    }
  )

  return counts
}

export async function getEmployerDashboardData() {
  const {
    user,
    profile,
  } = await requireEmployer()

  const {
    data: company,
    error: companyError,
  } = await supabase
    .from('companies')
    .select(`
      id,
      name,
      industry,
      status,
      rejection_reason,
      verified_at,
      created_at
    `)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (companyError) {
    throw companyError
  }

  const {
    data: internshipsData,
    error: internshipsError,
  } = await supabase
    .from('internships')
    .select(`
      id,
      title,
      category,
      location,
      work_mode,
      openings,
      deadline,
      status,
      rejection_reason,
      created_at,
      updated_at,
      published_at
    `)
    .eq('employer_id', user.id)
    .order('created_at', {
      ascending: false,
    })

  if (internshipsError) {
    throw internshipsError
  }

  const internships =
    internshipsData ?? []

  const internshipIds =
    internships.map(
      (internship) =>
        internship.id
    )

  let applications = []

  if (internshipIds.length > 0) {
    const {
      data: applicationsData,
      error: applicationsError,
    } = await supabase
      .from('applications')
      .select(`
        id,
        internship_id,
        status,
        created_at,
        updated_at
      `)
      .in(
        'internship_id',
        internshipIds
      )
      .order('created_at', {
        ascending: false,
      })

    if (applicationsError) {
      throw applicationsError
    }

    applications =
      applicationsData ?? []
  }

  const applicationStatusCounts =
    countApplicationStatuses(
      applications
    )

  const applicationCountsByInternship =
    new Map()

  applications.forEach(
    (application) => {
      const currentCount =
        applicationCountsByInternship.get(
          application.internship_id
        ) ?? 0

      applicationCountsByInternship.set(
        application.internship_id,
        currentCount + 1
      )
    }
  )

  const internshipsById = new Map(
    internships.map(
      (internship) => [
        internship.id,
        internship,
      ]
    )
  )

  const approvedInternships =
    internships.filter(
      (internship) =>
        internship.status ===
        'approved'
    ).length

  const pendingInternships =
    internships.filter(
      (internship) =>
        internship.status ===
        'pending'
    ).length

  const draftInternships =
    internships.filter(
      (internship) =>
        internship.status ===
        'draft'
    ).length

  const pausedInternships =
    internships.filter(
      (internship) =>
        internship.status ===
        'paused'
    ).length

  const closedInternships =
    internships.filter(
      (internship) =>
        internship.status ===
        'closed'
    ).length

  const rejectedInternships =
    internships.filter(
      (internship) =>
        internship.status ===
        'rejected'
    ).length

  const shortlistedOrFurther =
    applicationStatusCounts.shortlisted +
    applicationStatusCounts
      .interview_scheduled +
    applicationStatusCounts.selected

  const totalOpenings =
    internships.reduce(
      (total, internship) => {
        return (
          total +
          Number(
            internship.openings ?? 0
          )
        )
      },
      0
    )

  const recentInternships =
    internships
      .slice(0, 5)
      .map((internship) => ({
        ...internship,

        applicationCount:
          applicationCountsByInternship.get(
            internship.id
          ) ?? 0,
      }))

  const recentApplications =
    applications
      .slice(0, 8)
      .map((application) => {
        const internship =
          internshipsById.get(
            application.internship_id
          )

        return {
          id: application.id,

          internshipId:
            application.internship_id,

          internshipTitle:
            internship?.title ??
            'Internship',

          status:
            application.status,

          createdAt:
            application.created_at,

          updatedAt:
            application.updated_at,
        }
      })

  return {
    employer: {
      id: profile.id,

      fullName:
        profile.full_name,

      email:
        profile.email,
    },

    company:
      company ?? null,

    stats: {
      totalInternships:
        internships.length,

      approvedInternships,
      pendingInternships,
      draftInternships,
      pausedInternships,
      closedInternships,
      rejectedInternships,

      totalApplications:
        applications.length,

      applied:
        applicationStatusCounts.applied,

      underReview:
        applicationStatusCounts
          .under_review,

      shortlisted:
        applicationStatusCounts
          .shortlisted,

      shortlistedOrFurther,

      interviews:
        applicationStatusCounts
          .interview_scheduled,

      selectedCandidates:
        applicationStatusCounts
          .selected,

      rejectedApplications:
        applicationStatusCounts
          .rejected,

      withdrawnApplications:
        applicationStatusCounts
          .withdrawn,

      totalOpenings,
    },

    applicationStatusCounts,

    recentInternships,

    recentApplications,
  }
}
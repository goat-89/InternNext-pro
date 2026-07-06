import { supabase } from './supabase'

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

function cleanText(value) {
  return String(value ?? '').trim()
}

function cleanArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(item))
      .filter(Boolean)
  }

  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function optionalNumber(value) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : null
}

async function getEmployerCompanyByOwnerId(
  employerId
) {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      id,
      owner_id,
      name,
      slug,
      legal_name,
      description,
      industry,
      company_type,
      company_size,
      founded_year,
      website,
      business_email,
      phone,
      headquarters,
      logo_path,
      cover_path,
      status,
      rejection_reason,
      verified_at,
      created_at,
      updated_at
    `)
    .eq('owner_id', employerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function getEmployerCompany() {
  const employerId =
    await getCurrentEmployerId()

  return getEmployerCompanyByOwnerId(
    employerId
  )
}

export async function getEmployerInternships() {
  const employerId =
    await getCurrentEmployerId()

  const { data, error } = await supabase
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
      featured,
      featured_until,
      rejection_reason,
      published_at,
      created_at,
      updated_at,
      companies (
        id,
        name,
        status,
        logo_path
      )
    `)
    .eq('employer_id', employerId)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getEmployerDashboardData() {
  const employerId =
    await getCurrentEmployerId()

  const [
    companyResult,
    internshipsResult,
    applicationsResult,
  ] = await Promise.all([
    supabase
      .from('companies')
      .select(`
        id,
        name,
        status,
        rejection_reason,
        logo_path
      `)
      .eq('owner_id', employerId)
      .maybeSingle(),

    supabase
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
        featured,
        created_at,
        published_at
      `)
      .eq('employer_id', employerId)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        internships!inner (
          id,
          title,
          employer_id
        )
      `)
      .eq(
        'internships.employer_id',
        employerId
      )
      .order('created_at', {
        ascending: false,
      }),
  ])

  if (companyResult.error) {
    throw companyResult.error
  }

  if (internshipsResult.error) {
    throw internshipsResult.error
  }

  if (applicationsResult.error) {
    throw applicationsResult.error
  }

  const internships =
    internshipsResult.data ?? []

  const applications =
    applicationsResult.data ?? []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return {
    company: companyResult.data,

    internships,

    recentInternships:
      internships.slice(0, 5),

    recentApplications:
      applications.slice(0, 5),

    stats: {
      totalInternships:
        internships.length,

      activeInternships:
        internships.filter(
          (internship) => {
            if (
              internship.status !==
              'approved'
            ) {
              return false
            }

            if (!internship.deadline) {
              return false
            }

            const deadline =
              new Date(
                `${internship.deadline}T23:59:59`
              )

            return deadline >= today
          }
        ).length,

      pendingInternships:
        internships.filter(
          (internship) =>
            internship.status ===
            'pending'
        ).length,

      totalApplications:
        applications.length,

      shortlisted:
        applications.filter(
          (application) =>
            application.status ===
            'shortlisted'
        ).length,

      selected:
        applications.filter(
          (application) =>
            application.status ===
            'selected'
        ).length,
    },
  }
}

export async function createEmployerInternship(
  values,
  {
    submitForReview = false,
  } = {}
) {
  const employerId =
    await getCurrentEmployerId()

  const company =
    await getEmployerCompanyByOwnerId(
      employerId
    )

  if (!company) {
    throw new Error(
      'Complete employer onboarding before posting an internship.'
    )
  }

  if (
    submitForReview &&
    company.status !== 'approved'
  ) {
    throw new Error(
      'Your company must be approved before submitting an internship for review.'
    )
  }
  if (submitForReview) {
await assertEmployerCanSubmitForReview();
}


  const title = cleanText(values.title)

  const category = cleanText(
    values.category
  )

  const location = cleanText(
    values.location
  )

  const description = cleanText(
    values.description
  )

  const deadline = cleanText(
    values.deadline
  )

  if (!title) {
    throw new Error(
      'Internship title is required.'
    )
  }

  if (!category) {
    throw new Error(
      'Category is required.'
    )
  }

  if (!location) {
    throw new Error(
      'Location is required.'
    )
  }

  if (!description) {
    throw new Error(
      'Description is required.'
    )
  }

  if (!deadline) {
    throw new Error(
      'Application deadline is required.'
    )
  }

  const deadlineDate = new Date(
    `${deadline}T23:59:59`
  )

  if (
    Number.isNaN(
      deadlineDate.getTime()
    ) ||
    deadlineDate < new Date()
  ) {
    throw new Error(
      'Application deadline must be in the future.'
    )
  }

  const compensationType =
    values.compensationType || 'paid'

  const stipendMin =
    compensationType === 'unpaid'
      ? null
      : optionalNumber(
          values.stipendMin
        )

  const stipendMax =
    compensationType === 'unpaid'
      ? null
      : optionalNumber(
          values.stipendMax
        )

  if (
    stipendMin !== null &&
    stipendMax !== null &&
    stipendMax < stipendMin
  ) {
    throw new Error(
      'Maximum stipend cannot be lower than minimum stipend.'
    )
  }

  const payload = {
    employer_id: employerId,
    company_id: company.id,

    title,

    department:
      cleanText(values.department) ||
      null,

    category,
    location,

    work_mode:
      cleanText(values.workMode) ||
      'onsite',

    experience_level:
      cleanText(
        values.experienceLevel
      ) || 'beginner',

    duration_months:
      optionalNumber(
        values.durationMonths
      ),

    compensation_type:
      compensationType,

    stipend_min: stipendMin,
    stipend_max: stipendMax,

    currency:
      cleanText(values.currency) ||
      'INR',

    stipend_period:
      cleanText(
        values.stipendPeriod
      ) || 'monthly',

    openings:
      optionalNumber(values.openings) ||
      1,

    skills_required:
      cleanArray(
        values.skillsRequired
      ),

    preferred_skills:
      cleanArray(
        values.preferredSkills
      ),

    description,

    responsibilities:
      cleanArray(
        values.responsibilities
      ),

    eligibility:
      cleanArray(
        values.eligibility
      ),

    perks:
      cleanArray(values.perks),

    screening_steps:
      cleanArray(
        values.screeningSteps
      ),

    start_date:
      cleanText(values.startDate) ||
      null,

    deadline,

    status: submitForReview
      ? 'pending'
      : 'draft',

    featured: false,
    featured_until: null,
    rejection_reason: null,
    published_at: null,
  }

  const { data, error } = await supabase
    .from('internships')
    .insert(payload)
    .select(`
      id,
      title,
      company_id,
      employer_id,
      status,
      deadline,
      created_at
    `)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function submitInternshipForReview(
  internshipId
) {
  if (!internshipId) {
    throw new Error(
      'Internship ID is required.'
    )
  }

  const employerId =
    await getCurrentEmployerId()

  const company =
    await getEmployerCompanyByOwnerId(
      employerId
    )

  if (!company) {
    throw new Error(
      'Company profile not found.'
    )
  }

  if (company.status !== 'approved') {
    throw new Error(
      'Your company must be approved before submitting an internship.'
    )
  }
  await assertEmployerCanSubmitForReview();


  const { data, error } = await supabase
    .from('internships')
    .update({
      status: 'pending',
      rejection_reason: null,
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', internshipId)
    .eq('employer_id', employerId)
    .in('status', [
      'draft',
      'rejected',
    ])
    .select(`
      id,
      title,
      status,
      updated_at
    `)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Only draft or rejected internships can be submitted.'
    )
  }

  return data
}

export async function getEmployerInternshipById(
  internshipId
) {
  if (!internshipId) {
    throw new Error(
      'Internship ID is required.'
    )
  }

  const employerId =
    await getCurrentEmployerId()

  const { data, error } = await supabase
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
      created_at,
      updated_at,
      companies (
        id,
        name,
        status
      )
    `)
    .eq('id', internshipId)
    .eq('employer_id', employerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Internship not found or access denied.'
    )
  }

  return data
}

export async function updateEmployerInternship(
  internshipId,
  values,
  {
    submitForReview = false,
  } = {}
) {
  if (!internshipId) {
    throw new Error(
      'Internship ID is required.'
    )
  }

  const employerId =
    await getCurrentEmployerId()

  const company =
    await getEmployerCompanyByOwnerId(
      employerId
    )

  if (!company) {
    throw new Error(
      'Company profile not found.'
    )
  }

  if (
    submitForReview &&
    company.status !== 'approved'
  ) {
    throw new Error(
      'Your company must be approved before submitting an internship.'
    )
  }

  const existing =
    await getEmployerInternshipById(
      internshipId
    )

  if (
    ![
      'draft',
      'rejected',
    ].includes(existing.status)
  ) {
    throw new Error(
      'Only draft or rejected internships can be edited.'
    )
  }

  const title =
    cleanText(values.title)

  const category =
    cleanText(values.category)

  const location =
    cleanText(values.location)

  const description =
    cleanText(values.description)

  const deadline =
    cleanText(values.deadline)

  if (!title) {
    throw new Error(
      'Internship title is required.'
    )
  }

  if (!category) {
    throw new Error(
      'Category is required.'
    )
  }

  if (!location) {
    throw new Error(
      'Location is required.'
    )
  }

  if (!description) {
    throw new Error(
      'Description is required.'
    )
  }

  if (!deadline) {
    throw new Error(
      'Application deadline is required.'
    )
  }

  const deadlineDate = new Date(
    `${deadline}T23:59:59`
  )

  if (
    Number.isNaN(
      deadlineDate.getTime()
    ) ||
    deadlineDate < new Date()
  ) {
    throw new Error(
      'Application deadline must be in the future.'
    )
  }

  const compensationType =
    cleanText(
      values.compensationType
    ) || 'paid'

  const stipendMin =
    compensationType === 'unpaid'
      ? null
      : optionalNumber(
          values.stipendMin
        )

  const stipendMax =
    compensationType === 'unpaid'
      ? null
      : optionalNumber(
          values.stipendMax
        )

  if (
    stipendMin !== null &&
    stipendMax !== null &&
    stipendMax < stipendMin
  ) {
    throw new Error(
      'Maximum stipend cannot be lower than minimum stipend.'
    )
  }

  const payload = {
    title,

    department:
      cleanText(values.department) ||
      null,

    category,
    location,

    work_mode:
      cleanText(values.workMode) ||
      'onsite',

    experience_level:
      cleanText(
        values.experienceLevel
      ) || 'beginner',

    duration_months:
      optionalNumber(
        values.durationMonths
      ),

    compensation_type:
      compensationType,

    stipend_min: stipendMin,
    stipend_max: stipendMax,

    currency:
      cleanText(values.currency) ||
      'INR',

    stipend_period:
      cleanText(
        values.stipendPeriod
      ) || 'monthly',

    openings:
      optionalNumber(values.openings) ||
      1,

    skills_required:
      cleanArray(
        values.skillsRequired
      ),

    preferred_skills:
      cleanArray(
        values.preferredSkills
      ),

    description,

    responsibilities:
      cleanArray(
        values.responsibilities
      ),

    eligibility:
      cleanArray(
        values.eligibility
      ),

    perks:
      cleanArray(values.perks),

    screening_steps:
      cleanArray(
        values.screeningSteps
      ),

    start_date:
      cleanText(values.startDate) ||
      null,

    deadline,

    status: submitForReview
      ? 'pending'
      : 'draft',

    rejection_reason: null,

    updated_at:
      new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('internships')
    .update(payload)
    .eq('id', internshipId)
    .eq('employer_id', employerId)
    .in('status', [
      'draft',
      'rejected',
    ])
    .select(`
      id,
      title,
      status,
      deadline,
      updated_at
    `)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Internship could not be updated.'
    )
  }

  return data
}

const lifecycleTransitions = {
  approved: {
    pause: 'paused',
    close: 'closed',
  },

  paused: {
    resume: 'pending',
    close: 'closed',
  },
}

export async function updateEmployerInternshipLifecycle(
  internshipId,
  action
) {
  if (!internshipId) {
    throw new Error(
      'Internship ID is required.'
    )
  }

  if (
    ![
      'pause',
      'resume',
      'close',
    ].includes(action)
  ) {
    throw new Error(
      'Invalid internship action.'
    )
  }

  const employerId =
    await getCurrentEmployerId()

  const internship =
    await getEmployerInternshipById(
      internshipId
    )

  const nextStatus =
    lifecycleTransitions[
      internship.status
    ]?.[action]

  if (!nextStatus) {
    throw new Error(
      `This internship cannot be ${action}d while its status is ${internship.status}.`
    )
  }

  if (action === 'resume') {
    const company =
      await getEmployerCompanyByOwnerId(
        employerId
      )

    if (
      !company ||
      company.status !== 'approved'
    ) {
      throw new Error(
        'Your company must be approved before resubmitting this internship.'
      )
    }
  }

  const payload = {
    status: nextStatus,
    updated_at:
      new Date().toISOString(),
  }

  if (nextStatus === 'pending') {
    payload.rejection_reason = null
  }

  const { data, error } = await supabase
    .from('internships')
    .update(payload)
    .eq('id', internshipId)
    .eq('employer_id', employerId)
    .eq('status', internship.status)
    .select(`
      id,
      title,
      status,
      updated_at
    `)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Internship status could not be updated.'
    )
  }

  return data
}

function normalizeAnalyticsRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || {}
  }

  return value || {}
}

function calculatePercentage(value, total) {
  if (!total) {
    return 0
  }

  return Number(
    ((value / total) * 100).toFixed(1)
  )
}

function buildApplicationTrend(
  applications
) {
  const now = new Date()

  const months = Array.from(
    { length: 6 },
    (_, index) => {
      const date = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() -
            (5 - index),
          1
        )
      )

      const key = [
        date.getUTCFullYear(),
        String(
          date.getUTCMonth() + 1
        ).padStart(2, '0'),
      ].join('-')

      return {
        key,
        month:
          date.toLocaleDateString(
            undefined,
            {
              month: 'short',
              year: '2-digit',
              timeZone: 'UTC',
            }
          ),

        applications: 0,
      }
    }
  )

  const monthsByKey = new Map(
    months.map((month) => [
      month.key,
      month,
    ])
  )

  applications.forEach(
    (application) => {
      if (!application.created_at) {
        return
      }

      const date = new Date(
        application.created_at
      )

      if (
        Number.isNaN(date.getTime())
      ) {
        return
      }

      const key = [
        date.getUTCFullYear(),
        String(
          date.getUTCMonth() + 1
        ).padStart(2, '0'),
      ].join('-')

      const month =
        monthsByKey.get(key)

      if (month) {
        month.applications += 1
      }
    }
  )

  return months.map(
    ({ key, ...month }) => month
  )
}

export async function getEmployerAnalyticsData() {
  const employerId =
    await getCurrentEmployerId()

  const [
    internshipsResult,
    applicationsResult,
  ] = await Promise.all([
    supabase
      .from('internships')
      .select(`
        id,
        title,
        status,
        openings,
        deadline,
        created_at,
        published_at
      `)
      .eq('employer_id', employerId)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('applications')
      .select(`
        id,
        internship_id,
        status,
        created_at,
        updated_at,
        internships!inner (
          id,
          title,
          employer_id,
          status
        )
      `)
      .eq(
        'internships.employer_id',
        employerId
      )
      .order('created_at', {
        ascending: false,
      }),
  ])

  if (internshipsResult.error) {
    throw internshipsResult.error
  }

  if (applicationsResult.error) {
    throw applicationsResult.error
  }

  const internships =
    internshipsResult.data ?? []

  const applications =
    applicationsResult.data ?? []

  const statusBreakdown = {
    applied: 0,
    under_review: 0,
    shortlisted: 0,
    interview_scheduled: 0,
    selected: 0,
    rejected: 0,
    withdrawn: 0,
  }

  applications.forEach(
    (application) => {
      if (
        Object.prototype.hasOwnProperty.call(
          statusBreakdown,
          application.status
        )
      ) {
        statusBreakdown[
          application.status
        ] += 1
      }
    }
  )

  const applicationsByInternship =
    new Map()

  applications.forEach(
    (application) => {
      const internship =
        normalizeAnalyticsRelation(
          application.internships
        )

      const internshipId =
        application.internship_id ||
        internship.id

      if (!internshipId) {
        return
      }

      const current =
        applicationsByInternship.get(
          internshipId
        ) || {
          total: 0,
          applied: 0,
          under_review: 0,
          shortlisted: 0,
          interview_scheduled: 0,
          selected: 0,
          rejected: 0,
          withdrawn: 0,
        }

      current.total += 1

      if (
        Object.prototype.hasOwnProperty.call(
          current,
          application.status
        )
      ) {
        current[
          application.status
        ] += 1
      }

      applicationsByInternship.set(
        internshipId,
        current
      )
    }
  )

  const listingPerformance =
    internships
      .map((internship) => {
        const applicationStats =
          applicationsByInternship.get(
            internship.id
          ) || {
            total: 0,
            applied: 0,
            under_review: 0,
            shortlisted: 0,
            interview_scheduled: 0,
            selected: 0,
            rejected: 0,
            withdrawn: 0,
          }

        return {
          id: internship.id,
          title: internship.title,
          status: internship.status,

          openings:
            internship.openings ?? 1,

          deadline:
            internship.deadline,

          totalApplications:
            applicationStats.total,

          applied:
            applicationStats.applied,

          underReview:
            applicationStats
              .under_review,

          shortlisted:
            applicationStats
              .shortlisted,

          interviews:
            applicationStats
              .interview_scheduled,

          selected:
            applicationStats.selected,

          rejected:
            applicationStats.rejected,

          withdrawn:
            applicationStats.withdrawn,

          selectionRate:
            calculatePercentage(
              applicationStats.selected,
              applicationStats.total
            ),

          shortlistRate:
            calculatePercentage(
              applicationStats.shortlisted +
                applicationStats
                  .interview_scheduled +
                applicationStats.selected,
              applicationStats.total
            ),
        }
      })
      .sort(
        (first, second) =>
          second.totalApplications -
          first.totalApplications
      )

  const today = new Date()

  const activeInternships =
    internships.filter(
      (internship) => {
        if (
          internship.status !==
          'approved'
        ) {
          return false
        }

        if (!internship.deadline) {
          return true
        }

        const deadline = new Date(
          `${internship.deadline}T23:59:59`
        )

        return (
          !Number.isNaN(
            deadline.getTime()
          ) && deadline >= today
        )
      }
    ).length

  const shortlistedOrFurther =
    statusBreakdown.shortlisted +
    statusBreakdown
      .interview_scheduled +
    statusBreakdown.selected

  return {
    stats: {
      totalInternships:
        internships.length,

      activeInternships,

      totalApplications:
        applications.length,

      shortlistedOrFurther,

      interviews:
        statusBreakdown
          .interview_scheduled,

      selected:
        statusBreakdown.selected,

      rejected:
        statusBreakdown.rejected,

      withdrawn:
        statusBreakdown.withdrawn,

      shortlistRate:
        calculatePercentage(
          shortlistedOrFurther,
          applications.length
        ),

      selectionRate:
        calculatePercentage(
          statusBreakdown.selected,
          applications.length
        ),

      totalOpenings:
        internships.reduce(
          (total, internship) =>
            total +
            Number(
              internship.openings ?? 0
            ),
          0
        ),
    },

    statusBreakdown,

    monthlyApplications:
      buildApplicationTrend(
        applications
      ),

    listingPerformance,

    recentApplications:
      applications
        .slice(0, 10)
        .map((application) => {
          const internship =
            normalizeAnalyticsRelation(
              application.internships
            )

          return {
            id: application.id,

            internshipId:
              application.internship_id ||
              internship.id,

            internshipTitle:
              internship.title ||
              'Internship',

            status:
              application.status,

            createdAt:
              application.created_at,
          }
        }),
  }
}
export async function getEmployerInternshipLimitStatus() {
const {
data,
error,
} = await supabase.rpc(
'get_employer_internship_limit_status'
);

if (error) {
const message = [
error.message,
error.details,
error.hint,
]
.filter(Boolean)
.join(' ');


throw new Error(
  message ||
    'Unable to load the employer internship limit.'
);


}

return {
employerId:
data?.employer_id ??
null,


detectedRole:
  data?.detected_role ??
  null,

hasEmployerProfile:
  Boolean(
    data?.has_employer_profile
  ),

ownsCompany:
  Boolean(
    data?.owns_company
  ),

activeCount:
  Number(
    data?.active_count ?? 0
  ),

maximumActive:
  Number(
    data?.maximum_active ?? 25
  ),

remaining:
  data?.remaining === null
    ? null
    : Number(
        data?.remaining ?? 0
      ),

limitReached:
  Boolean(
    data?.limit_reached
  ),

monthlyPostsUsed:
  Number(
    data?.monthly_posts_used ?? 0
  ),

monthlyPostsLimit:
  data?.monthly_posts_limit ===
  null
    ? null
    : Number(
        data?.monthly_posts_limit ??
          0
      ),

monthlyPostsRemaining:
  data?.monthly_posts_remaining ===
  null
    ? null
    : Number(
        data?.monthly_posts_remaining ??
          0
      ),

monthlyPostsLimitReached:
  Boolean(
    data?.monthly_posts_limit_reached
  ),

subscription:
  data?.subscription ?? null,

entitlements:
  data?.entitlements ?? {},


};
}
async function assertEmployerCanSubmitForReview() {
const limitStatus =
await getEmployerInternshipLimitStatus();

if (limitStatus.limitReached) {
throw new Error(
'You have reached the maximum number of active internships. Close an active internship or contact support before submitting another one.'
);
}

if (limitStatus.monthlyPostsLimitReached) {
throw new Error(
'You have reached your monthly internship posting limit for the current plan. Upgrade your plan or wait for the next billing period.'
);
}

return limitStatus;
}

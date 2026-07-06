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

function getCount(result) {
  if (result.error) {
    throw result.error
  }

  return result.count ?? 0
}

export async function getAdminDashboardData() {
  await requireAdmin()

  const [
    studentsResult,
    activeStudentsResult,
    suspendedStudentsResult,

    employersResult,

    companiesResult,
    pendingCompaniesResult,
    approvedCompaniesResult,

    internshipsResult,
    pendingInternshipsResult,
    approvedInternshipsResult,

    applicationsResult,
    selectedApplicationsResult,

    recentCompaniesResult,
    recentInternshipsResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('role', 'student'),

    supabase
      .from('profiles')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('role', 'student')
      .eq('account_status', 'active'),

    supabase
      .from('profiles')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('role', 'student')
      .eq(
        'account_status',
        'suspended'
      ),

    supabase
      .from('profiles')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('role', 'employer'),

    supabase
      .from('companies')
      .select('id', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('companies')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'pending'),

    supabase
      .from('companies')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'approved'),

    supabase
      .from('internships')
      .select('id', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('internships')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'pending'),

    supabase
      .from('internships')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'approved'),

    supabase
      .from('applications')
      .select('id', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('applications')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'selected'),

    supabase
      .from('companies')
      .select(`
        id,
        name,
        industry,
        status,
        created_at
      `)
      .eq('status', 'pending')
      .order('created_at', {
        ascending: false,
      })
      .limit(5),

    supabase
      .from('internships')
      .select(`
        id,
        title,
        status,
        created_at,
        companies (
          id,
          name
        )
      `)
      .eq('status', 'pending')
      .order('created_at', {
        ascending: false,
      })
      .limit(5),
  ])

  if (recentCompaniesResult.error) {
    throw recentCompaniesResult.error
  }

  if (recentInternshipsResult.error) {
    throw recentInternshipsResult.error
  }

  return {
    stats: {
      students:
        getCount(studentsResult),

      activeStudents:
        getCount(
          activeStudentsResult
        ),

      suspendedStudents:
        getCount(
          suspendedStudentsResult
        ),

      employers:
        getCount(employersResult),

      companies:
        getCount(companiesResult),

      pendingCompanies:
        getCount(
          pendingCompaniesResult
        ),

      approvedCompanies:
        getCount(
          approvedCompaniesResult
        ),

      internships:
        getCount(internshipsResult),

      pendingInternships:
        getCount(
          pendingInternshipsResult
        ),

      approvedInternships:
        getCount(
          approvedInternshipsResult
        ),

      applications:
        getCount(
          applicationsResult
        ),

      selectedCandidates:
        getCount(
          selectedApplicationsResult
        ),
    },

    recentPendingCompanies:
      recentCompaniesResult.data ?? [],

    recentPendingInternships:
      recentInternshipsResult.data ?? [],
  }
}
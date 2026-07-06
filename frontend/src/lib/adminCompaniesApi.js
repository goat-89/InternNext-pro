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

export async function getAdminCompanies(
  {
    status = 'all',
  } = {}
) {
  await requireAdmin()

  let query = supabase
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

export async function approveCompany(
  companyId
) {
  if (!companyId) {
    throw new Error(
      'Company ID is required.'
    )
  }

  await requireAdmin()

  const { data, error } = await supabase
    .rpc('admin_approve_company', {
      p_company_id: companyId,
    })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Only pending companies can be approved.'
    )
  }

  return data
}

export async function rejectCompany(
  companyId,
  rejectionReason
) {
  if (!companyId) {
    throw new Error(
      'Company ID is required.'
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
    .rpc('admin_reject_company', {
      p_company_id: companyId,
      p_rejection_reason: reason,
    })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Only pending companies can be rejected.'
    )
  }

  return data
}

export async function returnCompanyToPending(
  companyId
) {
  if (!companyId) {
    throw new Error(
      'Company ID is required.'
    )
  }

  await requireAdmin()

  const { data, error } = await supabase
    .rpc(
      'admin_return_company_to_pending',
      {
        p_company_id: companyId,
      }
    )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'The company could not be returned to pending review.'
    )
  }

  return data
}

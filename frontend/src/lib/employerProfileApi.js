import { supabase } from './supabase'

function cleanText(value) {
  return String(value ?? '').trim()
}

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
      email,
      full_name,
      phone,
      avatar_path,
      role,
      account_status,
      onboarding_completed
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

export async function getEmployerProfileSettings() {
  const {
    user,
    profile,
  } = await requireEmployer()

  const [
    employerProfileResult,
    companyResult,
  ] = await Promise.all([
    supabase
      .from('employer_profiles')
      .select(`
        user_id,
        designation,
        department,
        linkedin_url,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .maybeSingle(),

    supabase
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
        gst_number,
        registration_number,
        logo_path,
        cover_path,
        status,
        rejection_reason,
        verified_at,
        created_at,
        updated_at
      `)
      .eq('owner_id', user.id)
      .maybeSingle(),
  ])

  if (employerProfileResult.error) {
    throw employerProfileResult.error
  }

  if (companyResult.error) {
    throw companyResult.error
  }

  const employerProfile =
    employerProfileResult.data || {}

  const company =
    companyResult.data

  if (!company) {
    throw new Error(
      'Complete employer onboarding before editing company settings.'
    )
  }

  return {
    profileId: profile.id,
    email: profile.email || '',
    fullName:
      profile.full_name || '',
    phone: profile.phone || '',
    avatarPath:
      profile.avatar_path || null,

    designation:
      employerProfile.designation ||
      '',

    department:
      employerProfile.department ||
      '',

    linkedinUrl:
      employerProfile.linkedin_url ||
      '',

    companyId: company.id,
    companyName:
      company.name || '',

    companySlug:
      company.slug || '',

    legalName:
      company.legal_name || '',

    description:
      company.description || '',

    industry:
      company.industry || '',

    companyType:
      company.company_type || '',

    companySize:
      company.company_size || '',

    foundedYear:
      company.founded_year || '',

    website:
      company.website || '',

    businessEmail:
      company.business_email || '',

    companyPhone:
      company.phone || '',

    headquarters:
      company.headquarters || '',

    gstNumber:
      company.gst_number || '',

    registrationNumber:
      company.registration_number ||
      '',

    logoPath:
      company.logo_path || null,

    coverPath:
      company.cover_path || null,

    companyStatus:
      company.status,

    rejectionReason:
      company.rejection_reason || '',

    verifiedAt:
      company.verified_at || null,
  }
}

export async function updateEmployerProfileSettings(
  values
) {
  await requireEmployer()

  const fullName =
    cleanText(values.fullName)

  const companyName =
    cleanText(values.companyName)

  const description =
    cleanText(values.description)

  const businessEmail =
    cleanText(
      values.businessEmail
    ).toLowerCase()

  if (fullName.length < 2) {
    throw new Error(
      'Enter a valid contact person name.'
    )
  }

  if (companyName.length < 2) {
    throw new Error(
      'Enter a valid company name.'
    )
  }

  if (description.length < 20) {
    throw new Error(
      'Company description must contain at least 20 characters.'
    )
  }

  if (
    !businessEmail ||
    !businessEmail.includes('@')
  ) {
    throw new Error(
      'Enter a valid business email.'
    )
  }

  const payload = {
    full_name: fullName,

    phone:
      cleanText(values.phone),

    designation:
      cleanText(values.designation),

    department:
      cleanText(values.department),

    linkedin_url:
      cleanText(values.linkedinUrl),

    company_name: companyName,

    legal_name:
      cleanText(values.legalName),

    description,

    industry:
      cleanText(values.industry),

    company_type:
      cleanText(values.companyType),

    company_size:
      cleanText(values.companySize),

    founded_year:
      cleanText(values.foundedYear),

    website:
      cleanText(values.website),

    business_email:
      businessEmail,

    company_phone:
      cleanText(values.companyPhone),

    headquarters:
      cleanText(values.headquarters),

    gst_number:
      cleanText(values.gstNumber),

    registration_number:
      cleanText(
        values.registrationNumber
      ),
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'update_employer_company_profile',
    {
      profile_data: payload,
    }
  )

  if (error) {
    throw error
  }

  return {
    result: data,

    settings:
      await getEmployerProfileSettings(),
  }
}
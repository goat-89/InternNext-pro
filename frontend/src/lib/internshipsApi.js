import { supabase } from './supabase'

const publicInternshipSelect = `
  id,
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
  published_at,
  created_at,
  companies (
    id,
    name,
    slug,
    description,
    industry,
    company_size,
    website,
    headquarters,
    logo_path
  )
`

function getTodayDate() {
  const now = new Date()
  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60000
  )

  return localDate
    .toISOString()
    .slice(0, 10)
}

export async function getPublicInternships({
  query = '',
  category = '',
  mode = '',
  featured = false,
  limit = 100,
} = {}) {
  let request = supabase
    .from('internships')
    .select(publicInternshipSelect)
    .eq('status', 'approved')
    .gte('deadline', getTodayDate())
    .order('featured', {
      ascending: false,
    })
    .order('published_at', {
      ascending: false,
    })
    .limit(limit)

  if (category) {
    request = request.eq(
      'category',
      category
    )
  }

  if (mode) {
    request = request.eq(
      'work_mode',
      mode
    )
  }

  if (featured) {
    request = request.eq(
      'featured',
      true
    )
  }

  const normalizedQuery = query.trim()

  if (normalizedQuery) {
    request = request.or(
      `title.ilike.%${normalizedQuery}%,location.ilike.%${normalizedQuery}%,category.ilike.%${normalizedQuery}%`
    )
  }

  const { data, error } = await request

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getPublicInternshipById(
  internshipId
) {
  if (!internshipId) {
    return null
  }

  const { data, error } = await supabase
    .from('internships')
    .select(publicInternshipSelect)
    .eq('id', internshipId)
    .eq('status', 'approved')
    .gte('deadline', getTodayDate())
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

import { supabase } from './supabase'

export async function requireUser(expectedRole) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('You must sign in to continue.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,full_name,phone,role,account_status,onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new Error('Profile not found.')
  if (profile.account_status === 'suspended') throw new Error('This account is suspended.')
  if (expectedRole && profile.role !== expectedRole) throw new Error(`${expectedRole} access is required.`)
  return { user, profile }
}

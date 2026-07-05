export function getOnboardingRoute(role) {
  switch (role) {
    case 'student':
      return '/onboarding/student'

    case 'employer':
      return '/onboarding/employer'

    case 'admin':
      return '/admin/dashboard'

    default:
      return '/login'
  }
}

export function getDashboardRoute(role) {
  switch (role) {
    case 'student':
      return '/student/dashboard'

    case 'employer':
      return '/employer/dashboard'

    case 'admin':
      return '/admin/dashboard'

    default:
      return '/'
  }
}

export function getPostAuthRoute(profile) {
  if (!profile) {
    return '/login'
  }

  if (profile.account_status === 'suspended') {
    return '/account-suspended'
  }

  if (profile.account_status === 'deleted') {
    return '/account-deleted'
  }

  if (
    !profile.onboarding_completed &&
    profile.role !== 'admin'
  ) {
    return getOnboardingRoute(profile.role)
  }

  return getDashboardRoute(profile.role)
}

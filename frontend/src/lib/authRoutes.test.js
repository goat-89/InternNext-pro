import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  getDashboardRoute,
  getOnboardingRoute,
  getPostAuthRoute,
} from './authRoutes'

describe('auth route helpers', () => {
  it('returns onboarding routes by role', () => {
    expect(
      getOnboardingRoute('student')
    ).toBe('/onboarding/student')
    expect(
      getOnboardingRoute('employer')
    ).toBe('/onboarding/employer')
    expect(
      getOnboardingRoute('admin')
    ).toBe('/admin/dashboard')
    expect(
      getOnboardingRoute('unknown')
    ).toBe('/login')
  })

  it('returns dashboard routes by role', () => {
    expect(
      getDashboardRoute('student')
    ).toBe('/student/dashboard')
    expect(
      getDashboardRoute('employer')
    ).toBe('/employer/dashboard')
    expect(
      getDashboardRoute('admin')
    ).toBe('/admin/dashboard')
    expect(
      getDashboardRoute('unknown')
    ).toBe('/')
  })

  it('routes missing and suspended profiles safely', () => {
    expect(getPostAuthRoute(null)).toBe(
      '/login'
    )
    expect(
      getPostAuthRoute({
        role: 'student',
        account_status: 'suspended',
        onboarding_completed: true,
      })
    ).toBe('/account-suspended')
  })

  it('routes deleted profiles to the deleted account page', () => {
    expect(
      getPostAuthRoute({
        role: 'student',
        account_status: 'deleted',
        onboarding_completed: false,
      })
    ).toBe('/account-deleted')

    expect(
      getPostAuthRoute({
        role: 'employer',
        account_status: 'deleted',
        onboarding_completed: true,
      })
    ).toBe('/account-deleted')
  })

  it('routes incomplete non-admin profiles to onboarding', () => {
    expect(
      getPostAuthRoute({
        role: 'student',
        account_status: 'active',
        onboarding_completed: false,
      })
    ).toBe('/onboarding/student')
    expect(
      getPostAuthRoute({
        role: 'employer',
        account_status: 'active',
        onboarding_completed: false,
      })
    ).toBe('/onboarding/employer')
  })

  it('routes completed profiles to dashboards', () => {
    expect(
      getPostAuthRoute({
        role: 'student',
        account_status: 'active',
        onboarding_completed: true,
      })
    ).toBe('/student/dashboard')
    expect(
      getPostAuthRoute({
        role: 'admin',
        account_status: 'active',
        onboarding_completed: false,
      })
    ).toBe('/admin/dashboard')
  })
})

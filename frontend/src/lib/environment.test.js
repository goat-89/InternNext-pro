import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  validateEnvironment,
} from './environment'

function validEnvironment(overrides = {}) {
  return {
    appUrl: 'https://app.example.com',
    isProduction: true,
    supabaseKey: 'publishable-test-key',
    supabaseUrl:
      'https://project.example.supabase.co',
    ...overrides,
  }
}

describe('validateEnvironment', () => {
  it('accepts valid production configuration', () => {
    expect(
      validateEnvironment(validEnvironment())
    ).toBe(true)
  })

  it('reports missing public variables by name only', () => {
    expect(() =>
      validateEnvironment(
        validEnvironment({
          appUrl: '',
          supabaseKey: '',
          supabaseUrl: '',
        })
      )
    ).toThrow(
      'VITE_SUPABASE_URL'
    )
  })

  it('requires the application URL in production', () => {
    expect(() =>
      validateEnvironment(
        validEnvironment({
          appUrl: undefined,
        })
      )
    ).toThrow('VITE_APP_URL')
  })

  it('rejects insecure production URLs', () => {
    expect(() =>
      validateEnvironment(
        validEnvironment({
          appUrl: 'http://app.example.com',
        })
      )
    ).toThrow(
      'Invalid environment variables: VITE_APP_URL'
    )
  })

  it('allows localhost HTTP during development', () => {
    expect(
      validateEnvironment(
        validEnvironment({
          appUrl: 'http://localhost:5173',
          isProduction: false,
          supabaseUrl:
            'http://127.0.0.1:54321',
        })
      )
    ).toBe(true)
  })
})

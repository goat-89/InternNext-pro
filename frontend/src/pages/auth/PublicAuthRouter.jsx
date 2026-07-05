import {
  Navigate,
  useSearchParams,
} from 'react-router-dom'

import LoginPage from './LoginPage'
import StudentPasswordlessAuth from './StudentPasswordlessAuth'

const validRoles = new Set(['student', 'employer'])
const validModes = new Set(['login', 'signup'])

function getSafeParam(
  searchParams,
  key,
  validValues,
  fallback
) {
  const value =
    searchParams.get(key)?.toLowerCase() || ''

  return validValues.has(value)
    ? value
    : fallback
}

export default function PublicAuthRouter() {
  const [searchParams] = useSearchParams()

  const role = getSafeParam(
    searchParams,
    'role',
    validRoles,
    'student'
  )

  const mode = getSafeParam(
    searchParams,
    'mode',
    validModes,
    'login'
  )

  if (role === 'employer') {
    if (mode === 'signup') {
      const query = new URLSearchParams()

      const invite =
        searchParams.get('invite') || ''

      if (invite.trim()) {
        query.set('invite', invite.trim())
      }

      return (
        <Navigate
          to={`/signup/employer${
            query.toString()
              ? `?${query.toString()}`
              : ''
          }`}
          replace
        />
      )
    }

    return (
      <LoginPage expectedRole="employer" />
    )
  }

  return (
    <StudentPasswordlessAuth
      initialMode={mode}
    />
  )
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

import {
  fetchCurrentProfile,
  loginWithPassword,
  logoutCurrentSession,
  registerEmployer,
  registerStudent,
} from '../lib/authApi'

const AuthContext = createContext(null)

function sleep(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

async function loadProfileWithRetry(userId) {
  let finalError = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetchCurrentProfile(userId)
    } catch (error) {
      finalError = error

      if (attempt < 2) {
        await sleep(250 * (attempt + 1))
      }
    }
  }

  throw finalError
}

function getRoleMismatchMessage(expectedRole) {
  if (expectedRole === 'student') {
    return 'Employer accounts cannot use Student login. Please use Employer login.'
  }

  if (expectedRole === 'employer') {
    return 'Student accounts cannot use Employer login. Please use Student login.'
  }

  return 'This account cannot use this sign-in area. Choose the correct Student or Employer access.'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [loading, setLoading] = useState(true)
  const [authEvent, setAuthEvent] = useState(null)
  const [error, setError] = useState(null)

  const hydrationIdRef = useRef(0)

  const hydrateSession = useCallback(
    async (nextSession) => {
      const hydrationId =
        hydrationIdRef.current + 1

      hydrationIdRef.current = hydrationId

      setSession(nextSession)

      if (!nextSession) {
        setUser(null)
        setProfile(null)
        setError(null)
        setLoading(false)
        return null
      }

      try {
        setLoading(true)
        setError(null)

        /*
         * getUser performs a request to Auth and verifies
         * the current session instead of trusting only the
         * locally stored session value.
         */
        const {
          data: { user: verifiedUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!verifiedUser) {
          throw new Error(
            'Authenticated user could not be loaded.'
          )
        }

        const nextProfile =
          await loadProfileWithRetry(
            verifiedUser.id
          )

        if (
          hydrationId !== hydrationIdRef.current
        ) {
          return null
        }

        setUser(verifiedUser)
        setProfile(nextProfile)

        return nextProfile
      } catch (nextError) {
        console.error(
          'Auth hydration failed:',
          nextError
        )

        if (
          hydrationId === hydrationIdRef.current
        ) {
          setError(nextError)
          setUser(null)
          setProfile(null)
        }

        return null
      } finally {
        if (
          hydrationId === hydrationIdRef.current
        ) {
          setLoading(false)
        }
      }
    },
    []
  )

  const refreshProfile = useCallback(
    async () => {
      if (!user?.id) return null

      const nextProfile =
        await loadProfileWithRetry(user.id)

      setProfile(nextProfile)

      return nextProfile
    },
    [user?.id]
  )

  const signIn = useCallback(
    async ({
      email,
      password,
      expectedRole,
    }) => {
      const data = await loginWithPassword(
        email,
        password
      )

      const nextProfile =
        await hydrateSession(data.session)

      if (!nextProfile) {
        throw new Error(
          'Your profile could not be loaded.'
        )
      }

      if (
        expectedRole &&
        nextProfile.role !== expectedRole
      ) {
        await logoutCurrentSession()
        await hydrateSession(null)

        throw new Error(
          getRoleMismatchMessage(expectedRole)
        )
      }

      return nextProfile
    },
    [hydrateSession]
  )

  const signUpStudent = useCallback(
    async (values) => {
      return registerStudent(values)
    },
    []
  )

  const signUpEmployer = useCallback(
    async (values) => {
      return registerEmployer(values)
    },
    []
  )

  const signOut = useCallback(async () => {
    await logoutCurrentSession()

    setSession(null)
    setUser(null)
    setProfile(null)
    setAuthEvent('SIGNED_OUT')
  }, [])

  useEffect(() => {
    let active = true

    async function initializeAuth() {
      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (active) {
          await hydrateSession(initialSession)
        }
      } catch (initializationError) {
        console.error(
          'Auth initialization failed:',
          initializationError
        )

        if (active) {
          setError(initializationError)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setAuthEvent(event)

        /*
         * Keep the callback synchronous and perform
         * profile hydration immediately afterward.
         */
        window.setTimeout(() => {
          if (active) {
            void hydrateSession(nextSession)
          }
        }, 0)
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [hydrateSession])

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      error,
      authEvent,

      isAuthenticated: Boolean(user),
      role: profile?.role || null,

      signIn,
      signUpStudent,
      signUpEmployer,
      signOut,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      loading,
      error,
      authEvent,
      signIn,
      signUpStudent,
      signUpEmployer,
      signOut,
      refreshProfile,
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.'
    )
  }

  return context
}

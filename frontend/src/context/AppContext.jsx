import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import toast from 'react-hot-toast'

import { useAuth } from './AuthContext'

import {
  getSavedInternshipIds,
  removeSavedInternship,
  saveInternship,
} from '../lib/savedInternshipsApi'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const {
    user,
    profile,
    loading: authLoading,
  } = useAuth()

  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return (
      window.localStorage.getItem('theme') ===
      'dark'
    )
  })

  const [saved, setSaved] = useState([])
  const [savedLoading, setSavedLoading] =
    useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      dark
    )

    window.localStorage.setItem(
      'theme',
      dark ? 'dark' : 'light'
    )
  }, [dark])

  const loadSaved = useCallback(async () => {
    if (
      authLoading ||
      !user ||
      profile?.role !== 'student'
    ) {
      setSaved([])
      setSavedLoading(authLoading)
      return []
    }

    try {
      setSavedLoading(true)

      const ids =
        await getSavedInternshipIds()

      const normalizedIds = ids.map((id) =>
        String(id)
      )

      setSaved(normalizedIds)

      return normalizedIds
    } catch (error) {
      console.error(
        'Unable to load saved internships:',
        error
      )

      setSaved([])

      return []
    } finally {
      setSavedLoading(false)
    }
  }, [
    authLoading,
    user?.id,
    profile?.role,
  ])

  useEffect(() => {
    void loadSaved()
  }, [loadSaved])

  const toggleSave = useCallback(
    async (internshipId) => {
      if (!internshipId) {
        return false
      }

      if (!user) {
        toast.error(
          'Sign in as a student to save internships.'
        )
        return false
      }

      if (profile?.role !== 'student') {
        toast.error(
          'Only student accounts can save internships.'
        )
        return false
      }

      const id = String(internshipId)
      const wasSaved = saved.includes(id)

      setSaved((current) =>
        wasSaved
          ? current.filter(
              (savedId) => savedId !== id
            )
          : [...current, id]
      )

      try {
        if (wasSaved) {
          await removeSavedInternship(id)
        } else {
          await saveInternship(id)
        }

        return !wasSaved
      } catch (error) {
        setSaved((current) =>
          wasSaved
            ? current.includes(id)
              ? current
              : [...current, id]
            : current.filter(
                (savedId) => savedId !== id
              )
        )

        console.error(
          'Unable to update saved internship:',
          error
        )

        toast.error(
          error?.message ||
            'Unable to update saved internships.'
        )

        return wasSaved
      }
    },
    [user, profile?.role, saved]
  )

  const value = useMemo(
    () => ({
      dark,
      setDark,
      saved,
      savedLoading,
      toggleSave,
      reloadSaved: loadSaved,
    }),
    [
      dark,
      saved,
      savedLoading,
      toggleSave,
      loadSaved,
    ]
  )

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error(
      'useApp must be used inside AppProvider.'
    )
  }

  return context
}

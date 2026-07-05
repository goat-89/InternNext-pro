import {
  Navigate,
  Outlet,
} from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { getPostAuthRoute } from '../../lib/authRoutes'
import AuthLoadingScreen from './AuthLoadingScreen'

export default function GuestRoute() {
  const {
    user,
    profile,
    loading,
  } = useAuth()

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (user && profile) {
    return (
      <Navigate
        to={getPostAuthRoute(profile)}
        replace
      />
    )
  }

  return <Outlet />
}
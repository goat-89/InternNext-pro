import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { useAuth } from '../context/AuthContext'

export default function LogoutButton({
  className = 'btn-secondary',
  showIcon = true,
  children = 'Logout',
}) {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    try {
      setLoading(true)

      await signOut()

      toast.success('Signed out successfully.')

      navigate('/', {
        replace: true,
      })
    } catch (error) {
      console.error('Logout failed:', error)

      toast.error(
        error?.message ||
          'Unable to sign out. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {showIcon && <LogOut size={17} />}

      <span>
        {loading ? 'Signing out…' : children}
      </span>
    </button>
  )
}
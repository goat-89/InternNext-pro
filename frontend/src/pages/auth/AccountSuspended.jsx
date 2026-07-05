import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'

export default function AccountSuspended() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const [signingOut, setSigningOut] =
    useState(false)

  async function handleSignOut() {
    try {
      setSigningOut(true)
      await signOut()
      navigate('/login', {
        replace: true,
      })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="card p-8">
        <h1 className="text-2xl font-black">
          Account suspended
        </h1>

        <p className="mt-3 text-slate-500">
          This account has been temporarily
          restricted. Contact InternNext
          support for assistance.
        </p>

        <button
          type="button"
          disabled={signingOut}
          onClick={handleSignOut}
          className="btn-primary mt-6 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut
            ? 'Signing out…'
            : 'Sign out'}
        </button>
      </div>
    </main>
  )
}
'app/update-password/page.tsx'
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    // Check if user arrived via proper Supabase recovery trigger (hash or query token)
    const hash = window.location.hash
    const query = window.location.search

    const hasRecoveryToken = 
      hash.includes('type=recovery') || 
      query.includes('type=recovery') || 
      hash.includes('token_hash=') || 
      query.includes('token_hash=')

    if (hasRecoveryToken) {
      setIsAuthorized(true)
    } else {
      // If someone typed the URL manually without a token, redirect them away immediately
      setError('Unauthorized access. Please use the secure link sent to your email.')
      setTimeout(() => {
        router.push('/')
      }, 3000)
    }
  }, [router])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setMessage('Password updated successfully! Redirecting to login...')
      setTimeout(() => {
        supabase.auth.signOut()
        router.push('/')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 text-slate-900">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-200 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">Set New Password</h1>
          <p className="text-xs text-slate-500 mt-1">Please enter your new secure password below.</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-xs font-semibold text-green-600">
            {message}
          </div>
        )}

        {isAuthorized ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-600 outline-none text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-600 outline-none text-slate-900 bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-500 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-slate-500">Validating recovery link...</p>
          </div>
        )}
      </div>
    </div>
  )
}
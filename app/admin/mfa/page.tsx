'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminReturnPath } from '@/lib/admin-navigation'
import { supabase } from '@/lib/supabase'


export default function AdminMfaPage() {
  const router = useRouter()

  const [returnTo, setReturnTo] = useState('/admin')
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [existingFactorId, setExistingFactorId] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [verified, setVerified] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const destination = getAdminReturnPath(new URLSearchParams(window.location.search).get('next'))
      setReturnTo(destination)
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.replace('/')
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
const accessToken = sessionData.session?.access_token

if (!accessToken) {
  setLoading(false)
  return
}

const response = await fetch('/api/admin/access', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  cache: 'no-store',
})

if (!response.ok) {
  setLoading(false)
  return
}

const access = await response.json()

if (access.authorized !== true) {
  setLoading(false)
  return
}

setAuthorized(true)

      // This is an enrollment page, not an admin authorization check.
      // Admin access must still be enforced separately on the server.
      const { data: factors, error: factorError } =
        await supabase.auth.mfa.listFactors()

      if (factorError) {
        setMessage(factorError.message)
    } else if (factors?.totp && factors.totp.length > 0) {
        const existingFactor = factors.totp[0]
      
        if (existingFactor) {
          setExistingFactorId(existingFactor.id)
        }
        const { data: aal } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

        if (aal?.currentLevel === 'aal2') {
          setVerified(true)
          setMessage('MFA is active for this session.')
          router.replace(destination === '/admin' ? getAdminReturnPath(access.landingPath) : destination)
        } else {
          setMessage(
            'Authenticator is enrolled. MFA verification is required at login.'
          )
        }
      }

      setLoading(false)
    }

    void checkSession()
  }, [router])

  async function enroll() {
    setMessage('')
    setLoading(true)

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'CVeate Admin',
    })

    if (error) {
      setMessage(error.message)
    } else if (data?.type === 'totp') {
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
    }

    setLoading(false)
  }

  async function verify() {
    const activeFactorId = existingFactorId || factorId

if (!activeFactorId || !/^\d{6}$/.test(code)) {
      setMessage('Enter the six-digit code from your authenticator app.')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: activeFactorId,
        code,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()


      if (!aalError && aal?.currentLevel === 'aal2') {
        setVerified(true)
        setMessage('MFA verified successfully. Redirecting...')
      
        // Return to the protected page that requested verification.
        let destination = returnTo
        if (destination === '/admin') {
          const { data: current } = await supabase.auth.getSession()
          if (current.session) {
            const accessResponse = await fetch('/api/admin/access', { headers: { Authorization: `Bearer ${current.session.access_token}` }, cache: 'no-store' })
            if (accessResponse.ok) { const access = await accessResponse.json(); destination = getAdminReturnPath(access.landingPath) }
          }
        }
        router.replace(destination)
        return
      } else {
        setMessage('Verification completed. Please check your MFA session.')
      }

    setLoading(false)
  }

  if (loading && !authorized) {
    return <main className="p-8">Checking access...</main>
  }
  
  if (!authorized) {
    return null
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">
        CVeate Admin Security
      </h1>

      <p className="mt-3 text-sm text-slate-600">
        Protect your administrator account with an authenticator app.
      </p>

      {verified ? (
        <div className="mt-6 rounded-lg bg-green-50 p-4 text-green-800">
          MFA is active for this session.
        </div>
      ) : existingFactorId ? (
        <div className="mt-6 space-y-5">
          <p className="text-sm text-slate-600">
            Enter the six-digit code from your authenticator app
            to verify your administrator session.
          </p>
      
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, ''))
            }
            placeholder="000000"
            aria-label="Authenticator code"
            className="w-full rounded-lg border p-3"
          />
      
          <button
            type="button"
            onClick={verify}
            disabled={loading || code.length !== 6}
            className="rounded-lg bg-indigo-600 px-5 py-3 text-white disabled:opacity-50"
          >
            Verify MFA
          </button>
        </div>
      ) : !qrCode ? (
        <button
          type="button"
          onClick={enroll}
          disabled={loading}
          className="mt-6 rounded-lg bg-indigo-600 px-5 py-3 text-white disabled:opacity-50"
        >
          Set up authenticator
        </button>
      ) : (
        <div className="mt-6 space-y-5">
          <p className="text-sm">
            Scan this QR code using Google Authenticator
            or Microsoft Authenticator.
          </p>

          <img
            src={qrCode}
            alt="Authenticator enrollment QR code"
            className="h-48 w-48"
          />

          <div>
            <label
              htmlFor="totp-code"
              className="mb-2 block text-sm font-medium"
            >
              Six-digit authentication code
            </label>

            <input
              id="totp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={e =>
                setCode(e.target.value.replace(/\D/g, ''))
              }
              className="w-full rounded-lg border p-3"
              placeholder="000000"
            />
          </div>

          <button
            type="button"
            onClick={verify}
            disabled={loading || code.length !== 6}
            className="rounded-lg bg-indigo-600 px-5 py-3 text-white disabled:opacity-50"
          >
            Verify authenticator
          </button>
        </div>
      )}

      {message && (
        <p role="status" className="mt-5 text-sm">
          {message}
        </p>
      )}
    </main>
  )
}
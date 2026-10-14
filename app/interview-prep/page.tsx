'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function InterviewPrepPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accessStatus, setAccessStatus] = useState<'allowed' | 'upgrade_required' | 'device_limit_exceeded'>('allowed')
  const [user, setUser] = useState<any>(null)

  // Step 2 logic placed inside useEffect on page load
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/ats-checker') // or redirect to login
        return
      }

      setUser(session.user)

      // Fetch user profile to check plan_name
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!profile) {
        setAccessStatus('upgrade_required')
        setLoading(false)
        return
      }

      // 1. Check if user holds an active paid pass (Daily Pass or Monthly)
      const hasPaidPass = profile.plan_name === 'Daily Pass' || profile.plan_name === 'Monthly'
      if (!hasPaidPass) {
        setAccessStatus('upgrade_required')
        setLoading(false)
        return
      }

      // 2. 3-Device Security Check
      const deviceTokenKey = 'cveat_device_token'
      let deviceToken = localStorage.getItem(deviceTokenKey)
      if (!deviceToken) {
        deviceToken = crypto.randomUUID()
        localStorage.setItem(deviceTokenKey, deviceToken)
      }

      const { data: devices } = await supabase
        .from('user_devices')
        .select('id, device_token')
        .eq('user_id', session.user.id)

      const existingDevice = devices?.find(d => d.device_token === deviceToken)

      if (!existingDevice) {
        if (devices && devices.length >= 3) {
          setAccessStatus('device_limit_exceeded')
          setLoading(false)
          return
        } else {
          await supabase.from('user_devices').insert({
            user_id: session.user.id,
            device_token: deviceToken,
            last_active_at: new Date().toISOString()
          })
        }
      } else {
        await supabase.from('user_devices')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', existingDevice.id)
      }

      setAccessStatus('allowed')
      setLoading(false)
    }

    checkAccess()
  }, [router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Verifying secure access...</div>
  }

  // Handle restricted access UI states
  if (accessStatus === 'upgrade_required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900">Pass Required for Interview Prep</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Interview preparation is an exclusive benefit included with our Daily and Monthly Passes. Upgrade your plan to unlock full access.
          </p>
          <Link href="/pricing">
            <button className="w-full mt-2 rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer">
              View Pricing Plans
            </button>
          </Link>
        </div>
      </div>
    )
  }

  if (accessStatus === 'device_limit_exceeded') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900">Device Limit Reached</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            You have reached the maximum active device limit (3 devices) allowed for this account. Please log out from another device to continue.
          </p>
          <Link href="/">
            <button className="w-full mt-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
              Return Home
            </button>
          </Link>
        </div>
      </div>
    )
  }

  // Main Interview Prep Workspace (User has valid pass & device slot)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-black text-indigo-600">AI Mock Interview Workspace</h1>
        <p className="text-sm text-slate-600">Welcome! Your pass is active and your device is securely connected.</p>
        {/* Your interview practice components go here */}
      </div>
    </div>
  )
}
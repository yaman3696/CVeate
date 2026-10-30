'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'

export default function ProfileCompletionPrompt({ user }: { user: { id: string; last_sign_in_at?: string } | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => { const refresh = () => setRevision(n => n + 1); window.addEventListener('cveat-profile-updated', refresh); return () => window.removeEventListener('cveat-profile-updated', refresh) }, [])
  const [promptKey, setPromptKey] = useState<string | null>(null)
  useEffect(() => {
    setPromptKey(null)
    if (!user || pathname === '/profile' || pathname.startsWith('/admin')) return
    const key = `cveat-profile-reminder:${user.id}:${user.last_sign_in_at || 'session'}`
    try { if (sessionStorage.getItem(key)) return } catch {}
    let cancelled = false
    void (async () => {
      const session = await supabase.auth.getSession()
      const status = await fetch('/api/auth/signup-status', {headers:{Authorization:`Bearer ${session.data.session?.access_token || ''}`}}).then(r=>r.ok?r.json():null).catch(()=>null)
      if (!status?.ready || cancelled) return
      const { data, error } = await supabase.from('profiles').select('full_name,contact_number,phone,profession,target_job_title').eq('id', user.id).maybeSingle()
      if (cancelled || error) return
      const filled = (value: unknown) => (typeof value === 'string' && value.trim().length > 0) || (typeof value === 'number' && Number.isFinite(value) && value > 0)
      if (!data || !filled(data.full_name) || !(filled(data.contact_number) || filled(data.phone)) || !(filled(data.profession) || filled(data.target_job_title))) setPromptKey(key)
    })()
    return () => { cancelled = true }
  }, [user?.id, user?.last_sign_in_at, pathname, revision])
  useEffect(() => {
    if (!promptKey || !dialog.current) return
    const element = dialog.current
    element.showModal()
    return () => { element.close() }
  }, [promptKey])
  function dismiss() {
    if (promptKey) { try { sessionStorage.setItem(promptKey, 'dismissed') } catch {} }
    setPromptKey(null)
  }
  if (!promptKey) return null
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); dismiss() }} aria-labelledby="profile-reminder-title" aria-describedby="profile-reminder-description" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-[#1B263B] dark:text-slate-100">
    <div aria-hidden="true" className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0116 0v2"/></svg></div>
    <h2 id="profile-reminder-title" className="text-xl font-bold">Complete your profile</h2>
    <p id="profile-reminder-description" className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Add your name, contact number, and target role to complete your basic profile. You can add other details whenever you’re ready.</p>
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      <button type="button" autoFocus onClick={dismiss} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-600 dark:hover:bg-slate-700 cursor-pointer">Skip for now</button>
      <button type="button" onClick={() => { dismiss(); router.push('/profile?complete=1') }} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 cursor-pointer">Complete profile</button>
    </div>
  </dialog>
}

'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { employeeEmail } from '@/lib/employee-domain'
import { getAdminMfaHref, getAdminReturnPath } from '@/lib/admin-navigation'
export default function EmployeeLoginClient(){
 const router=useRouter(),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function submit(e:React.FormEvent){e.preventDefault();if(busy)return
  const address=employeeEmail(email);if(!address){setError('Use your invited @cveat.in employee address.');return}
  setBusy(true);setError('')
  try{
   const signed=await supabase.auth.signInWithPassword({email:address,password});if(signed.error||!signed.data.session)throw new Error('Unable to sign in. Check your company email and password.')
   const response=await fetch('/api/admin/access',{headers:{Authorization:`Bearer ${signed.data.session.access_token}`},cache:'no-store'}),access=await response.json()
   if(!response.ok||!access.authorized){await supabase.auth.signOut();throw new Error('Employee admin access is not active. Contact the owner.')}
   if(!access.permissionsReady)throw new Error('Permissions are temporarily unavailable. Try again shortly.')
   router.replace(access.mfaVerified?getAdminReturnPath(access.landingPath):getAdminMfaHref(access.landingPath||'/admin'))
  }catch(e){setError(e instanceof Error?e.message:'Unable to sign in.')}finally{setBusy(false)}
 }
 return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl bg-white p-7 shadow-xl dark:bg-[#1B263B]"><h1 className="text-2xl font-extrabold">Employee sign-in</h1><p className="text-sm text-slate-500 dark:text-slate-400">For invited @cveat.in staff. The owner can continue using the website’s existing sign-in.</p>{error&&<p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}<label className="block text-xs font-bold">Company email<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-700 dark:bg-[#111C30]"/></label><label className="block text-xs font-bold">Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-700 dark:bg-[#111C30]"/></label><button disabled={busy} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Signing in…':'Sign in & verify MFA'}</button><p className="text-xs text-slate-500 dark:text-slate-400">Forgot your password? Use the website’s Sign In → Forgot password option, or contact the owner.</p><Link href="/" className="inline-block text-xs font-bold text-indigo-600 dark:text-indigo-300">Back to CVeat</Link></form></main>
}

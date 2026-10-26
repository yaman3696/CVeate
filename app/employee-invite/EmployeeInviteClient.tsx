'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAdminMfaHref } from '@/lib/admin-navigation'
import { employeeEmail } from '@/lib/employee-domain'
export default function EmployeeInviteClient(){
 const router=useRouter(), pending=useRef<Promise<{email:string|null;error:string} >|null>(null)
 const [email,setEmail]=useState<string|null>(null),[error,setError]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[checking,setChecking]=useState(true)
 useEffect(()=>{
  let active=true
  if(!pending.current){
   const params=new URLSearchParams(window.location.search), token=params.get('token_hash'),type=params.get('type')
   window.history.replaceState(null,'','/employee-invite')
   pending.current=(async()=>{
    if(!token||!['invite','magiclink'].includes(type||''))return {email:null,error:'Use the one-time employee invitation sent to your company mailbox.'}
    const verified=await supabase.auth.verifyOtp({token_hash:token,type:type as 'invite'|'magiclink'})
    const recipient=employeeEmail(verified.data.user?.email)
    if(verified.error||!recipient)return {email:null,error:'This invitation is invalid or expired. Ask the owner to resend it.'}
    return {email:recipient,error:''}
   })()
  }
  void pending.current.then(result=>{if(active){setEmail(result.email);setError(result.error);setChecking(false)}}).catch(()=>{if(active){setError('Unable to verify invitation. Ask the owner to resend it.');setChecking(false)}})
  return()=>{active=false}
 },[])
 async function submit(e:React.FormEvent){e.preventDefault();if(busy||!email)return
  if(password.length<12||password!==confirm){setError('Use at least 12 characters and matching passwords.');return}
  setBusy(true);setError('')
  try{
   const {data:{user},error:identityError}=await supabase.auth.getUser()
   if(identityError||employeeEmail(user?.email)!==email)throw new Error('The signed-in account changed. Open your employee invitation again.')
   const updated=await supabase.auth.updateUser({password});if(updated.error)throw new Error(updated.error.message)
   const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sign in using your employee invitation.')
   const response=await fetch('/api/admin/employees/accept',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}}),result=await response.json()
   if(!response.ok)throw new Error(result.error||'Invitation could not be accepted.')
   router.replace(getAdminMfaHref(result.next || '/admin'))
  }catch(e){setError(e instanceof Error?e.message:'Unable to accept invitation.')}finally{setBusy(false)}
 }
 return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100"><div className="w-full max-w-md space-y-5 rounded-3xl bg-white p-7 shadow-xl dark:bg-[#1B263B]"><h1 className="text-2xl font-extrabold">Welcome to the CVeat team</h1><p className="text-sm text-slate-500 dark:text-slate-400">Set your own password, then verify your authenticator. Access is limited to the permissions assigned by the owner.</p>{checking&&<p role="status">Verifying invitation…</p>}{error&&<p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}{email&&<form className="space-y-4" onSubmit={submit}><p className="break-all text-sm font-bold">{email}</p><label className="block text-xs font-bold">Password (at least 12 characters)<input required minLength={12} autoComplete="new-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-700 dark:bg-[#111C30]"/></label><label className="block text-xs font-bold">Confirm password<input required minLength={12} autoComplete="new-password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-700 dark:bg-[#111C30]"/></label><button disabled={busy} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Activating…':'Continue to MFA'}</button></form>}</div></main>
}

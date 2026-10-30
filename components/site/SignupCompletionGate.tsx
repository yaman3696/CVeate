 'use client'
import {useEffect,useRef,useState} from 'react'
import {supabase} from '@/utils/supabaseClient'
import {mobileError,validSignupMobile} from '@/lib/signup-policy'
export default function SignupCompletionGate({user}:{user:{id:string}|null}) {
 const dialog=useRef<HTMLDialogElement>(null)
 const [state,setState]=useState<{ready:boolean;needsMobile?:boolean;needsEmail?:boolean}|null>(null)
 const [mobile,setMobile]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function headers(){const {data}=await supabase.auth.getSession();return {'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token||''}`}}
 async function refresh(){try{const response=await fetch('/api/auth/signup-status',{headers:await headers(),cache:'no-store'});if(response.ok)setState(await response.json())}catch{}}
 useEffect(()=>{let cancelled=false;setState(null);setMobile('');setError('');if(user)void (async()=>{try{const response=await fetch('/api/auth/signup-status',{headers:await headers(),cache:'no-store'});if(response.ok&&!cancelled)setState(await response.json())}catch{}})();return()=>{cancelled=true}},[user?.id])
 useEffect(()=>{if(!state||state.ready||!dialog.current)return;const element=dialog.current;element.showModal();return()=>element.close()},[state])
 if(!user||!state||state.ready)return null
 async function submit(event:React.FormEvent){event.preventDefault();setError('');if(!validSignupMobile(mobile)){setError(mobileError);return}setBusy(true);try{
 let browserId='';try{browserId=localStorage.getItem('cveat-signup-browser')||crypto.randomUUID();localStorage.setItem('cveat-signup-browser',browserId)}catch{browserId=crypto.randomUUID()}
 const response=await fetch('/api/auth/signup-status',{method:'POST',headers:await headers(),body:JSON.stringify({mobile,browserId})});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not complete signup.');setState(data);window.dispatchEvent(new Event('cveat-profile-updated'))
 }catch(e){setError(e instanceof Error?e.message:'Please try again.')}finally{setBusy(false)}}
 return <dialog ref={dialog} onCancel={e=>e.preventDefault()} aria-labelledby="signup-completion-title" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-[#1B263B] dark:text-slate-100">
 <h2 id="signup-completion-title" className="text-xl font-bold">Complete your signup</h2>
 <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{state.needsMobile?'Add your 10-digit Indian mobile number before using AI features. One mobile number can be linked to one account. No OTP is required right now.':'Please verify your email using the confirmation link before using AI features.'}</p>
 {state.needsMobile&&<form onSubmit={submit} className="mt-4 space-y-4"><label className="block text-sm font-semibold">Mobile number (+91)<input autoFocus required type="tel" inputMode="numeric" autoComplete="tel-national" minLength={10} maxLength={10} pattern="[6-9][0-9]{9}" value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g,''))} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-600"/></label>{error&&<p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}<button disabled={busy} className="min-h-11 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?'Saving…':'Complete signup'}</button></form>}
 <div className="mt-4 flex justify-between gap-4 text-sm"><button type="button" disabled={busy} onClick={()=>void supabase.auth.signOut()}>Sign out</button>{!state.needsMobile&&<button type="button" onClick={()=>void refresh()}>I have verified my email</button>}</div>
 </dialog>
}

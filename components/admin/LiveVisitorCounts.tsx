'use client'
import { useEffect,useState } from 'react'
import { supabase } from '@/lib/supabase'
type Counts={total:number;guests:number;signedIn:number;asOf:string}
export default function LiveVisitorCounts(){
 const [counts,setCounts]=useState<Counts|null>(null),[error,setError]=useState(''),[stale,setStale]=useState(false)
 useEffect(()=>{
  let active=true,running=false;const controller=new AbortController()
  const refresh=async()=>{
   if(running||document.hidden)return;running=true
   try{
    const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Sign in again to view visitors.')
    const r=await fetch('/api/admin/visitors',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store',signal:controller.signal})
    const d=await r.json();if(!r.ok)throw Error(d.error==='VISITOR_SETUP_REQUIRED'?'Apply the live-visitor Supabase setup SQL to enable this counter.':'Could not refresh visitor counts.')
    if(active){setCounts(d);setError('');setStale(false)}
   }catch(e){if(active){setStale(true);setError(e instanceof Error?e.message:'Could not refresh visitor counts.')}}finally{running=false}
  }
  void refresh();const timer=setInterval(()=>void refresh(),30000)
  const visible=()=>{if(!document.hidden)void refresh()};document.addEventListener('visibilitychange',visible)
  return()=>{active=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible)}
 },[])
 return <section aria-labelledby="live-visitors-heading" className="mt-8 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="live-visitors-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${stale?'bg-amber-500':'bg-emerald-500'}`}/>Live visitors</h2><span className="text-xs text-slate-500">Active in the last 5 minutes · refreshes every 30 seconds</span></div>
  <div aria-live="polite" aria-atomic="true" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{[['Active visitors',counts?.total],['Signed-in visitors',counts?.signedIn],['Guests',counts?.guests]].map(([name,count])=><div key={name} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{name}</p><p className="mt-2 text-3xl font-bold text-slate-900">{count??'—'}</p></div>)}</div>
  <p className="mt-3 text-xs leading-5 text-slate-500">Approximate active browsers, including guests. Multiple tabs in the same browser count once; different devices can count separately. Admin pages, development and preview deployments are excluded.{counts&&` ${stale?'Last successful update':'Updated'}: ${new Date(counts.asOf).toLocaleTimeString()}.`}</p>
  {error&&<p role="status" className="mt-3 text-sm text-amber-700">{error}{counts?' Showing the last available count.':''}</p>}
 </section>
}

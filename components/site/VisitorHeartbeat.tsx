'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
const ID = 'cveat-visitor-session', LAST = 'cveat-visitor-heartbeat'
export default function VisitorHeartbeat() {
 const pathname = usePathname()
 useEffect(() => {
  if (pathname.startsWith('/admin') || navigator.doNotTrack === '1') return
  let active=true, running=false
  const controller=new AbortController()
  async function ping() {
   if (!active || running || document.hidden) return
   running=true
   try {
    const {data:{session}}=await supabase.auth.getSession()
    if (!active) return
    const kind=session?'user':'guest', now=Date.now()
    const send=async()=>{
     let record: {id:string;expires:number}|null=null
     try {record=JSON.parse(localStorage.getItem(ID)||'null')} catch {}
     if (!record?.id || record.expires<=now) {record={id:crypto.randomUUID(),expires:now+86400000};localStorage.setItem(ID,JSON.stringify(record))}
     let last: {at:number;kind:string;id:string}|null=null
     try {last=JSON.parse(localStorage.getItem(LAST)||'null')} catch {}
     if (last?.id===record.id && last.kind===kind && now-last.at<55000) return
     const response=await fetch('/api/visitors/heartbeat',{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.access_token}`}:{})},body:JSON.stringify({visitorId:record.id}),cache:'no-store',signal:controller.signal})
     if(response.ok && active) localStorage.setItem(LAST,JSON.stringify({at:now,kind,id:record.id}))
    }
    if(navigator.locks) await navigator.locks.request('cveat-visitor-heartbeat',send)
    else await send()
   } catch { /* Analytics must never interrupt the website or use fingerprinting as a fallback. */ }
   finally {running=false}
  }
  const resume=()=>{if(!document.hidden)void ping()}
  void ping()
  const timer=window.setInterval(()=>void ping(),60000)
  document.addEventListener('visibilitychange',resume)
  window.addEventListener('focus',resume)
  const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event!=='INITIAL_SESSION')window.setTimeout(()=>void ping(),0)})
  return()=>{active=false;controller.abort();clearInterval(timer);subscription.unsubscribe();document.removeEventListener('visibilitychange',resume);window.removeEventListener('focus',resume)}
 },[pathname])
 return null
}

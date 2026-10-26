'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_SITE_SETTINGS, validateSiteSettings, type SiteSettings } from '@/lib/site-settings'
const Context=createContext<SiteSettings>(DEFAULT_SITE_SETTINGS)
export const useSiteSettings=()=>useContext(Context)
export function SiteSettingsProvider({children}:{children:React.ReactNode}){
  const [settings,setSettings]=useState(DEFAULT_SITE_SETTINGS)
  useEffect(()=>{
    const controller=new AbortController()
    const refresh=()=>{void fetch('/api/site-settings',{cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Unavailable');return r.json()}).then(value=>setSettings(validateSiteSettings(value))).catch(()=>{/* Existing design remains usable during setup/outages. */})}
    refresh()
    window.addEventListener('site-settings-published',refresh)
    const visible=()=>{if(document.visibilityState==='visible')refresh()}
    document.addEventListener('visibilitychange',visible)
    return()=>{controller.abort();window.removeEventListener('site-settings-published',refresh);document.removeEventListener('visibilitychange',visible)}
  },[])
  return <Context.Provider value={settings}>{children}</Context.Provider>
}

'use client'
import { SOCIAL_LABELS } from '@/lib/site-settings'
import { useSiteSettings } from './SiteSettingsProvider'
export function SiteSocialLinks(){
 const {social}=useSiteSettings()
 return <div className="flex flex-wrap gap-2 text-xs">{(Object.keys(SOCIAL_LABELS) as (keyof typeof SOCIAL_LABELS)[]).filter(key=>social[key]).map(key=><a key={key} href={social[key]} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 transition-colors hover:bg-slate-700">{SOCIAL_LABELS[key]}</a>)}</div>
}
export function SiteCopyright(){const {companyName}=useSiteSettings();return <>© {new Date().getFullYear()} {companyName}. All rights reserved.</>}

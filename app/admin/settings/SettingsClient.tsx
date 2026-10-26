'use client'
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAdminMfaHref } from '@/lib/admin-navigation'
import { ASSET_LABELS, DEFAULT_SITE_SETTINGS, SOCIAL_LABELS, validateSiteSettings, type AssetKind, type SiteSettings } from '@/lib/site-settings'
type Current={data:SiteSettings;version:number;updated_at:string}
type Revision={id:string;version:number;created_at:string;actor_id:string|null;restored_from:string|null}
const input='mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 dark:border-slate-600 dark:bg-[#111C30] dark:text-slate-100'
const button='rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800'
const panel='space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]'
export default function SettingsClient(){
 const router=useRouter(),busyRef=useRef(false)
 const [current,setCurrent]=useState<Current|null>(null),[draft,setDraft]=useState<SiteSettings>(DEFAULT_SITE_SETTINGS),[history,setHistory]=useState<Revision[]>([])
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[preview,setPreview]=useState(false),[restoreId,setRestoreId]=useState('')
 const dirty=!!current&&JSON.stringify(draft)!==JSON.stringify(current.data)
 async function request(path:string,options:RequestInit={}){
  const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/');throw new Error('Please sign in again.')}
  const response=await fetch(path,{...options,headers:{...options.headers,Authorization:`Bearer ${session.access_token}`},cache:'no-store'})
  const data=await response.json()
  if(response.status===403){router.replace(data.error==='MFA_REQUIRED'?getAdminMfaHref('/admin/settings'):'/admin/denied');throw new Error('Owner access and MFA are required.')}
  if(!response.ok)throw new Error(data.error||'Settings request failed.')
  return data
 }
 useEffect(()=>{
  let active=true
  async function load(){try{
   const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/');return}
   const response=await fetch('/api/admin/settings',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'}),data=await response.json()
   if(!active)return
   if(response.status===403){router.replace(data.error==='MFA_REQUIRED'?getAdminMfaHref('/admin/settings'):'/admin/denied');return}
   if(!response.ok)throw new Error(data.error||'Unable to load settings.')
   setCurrent(data.current);setDraft(data.current.data);setHistory(data.history)
  }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load settings.')}finally{if(active)setLoading(false)}}void load();return()=>{active=false}
 },[router])
 useEffect(()=>{const protect=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue=''}};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect)},[dirty])
 function edit(key:keyof SiteSettings,value:string){setDraft(old=>({...old,[key]:value}));setPreview(false);setRestoreId('');setMessage('')}
 async function upload(kind:AssetKind,file:File|undefined){
  if(!file||busyRef.current)return
  if(file.size>2*1024*1024){setError('Choose an image smaller than 2 MB.');return}
  busyRef.current=true;setBusy(true);setError('');setMessage('')
  try{const form=new FormData();form.set('kind',kind);form.set('file',file);const data=await request('/api/admin/settings/assets',{method:'POST',body:form});edit(kind,data.url);setMessage('Image uploaded to your draft. Preview and publish to apply it.')}
  catch(e){setError(e instanceof Error?e.message:'Upload failed.')}
  finally{busyRef.current=false;setBusy(false)}
 }
 async function publish(){
  if(!current||busyRef.current)return
  if(!restoreId){try{validateSiteSettings(draft)}catch(e){setError(e instanceof Error?e.message:'Check your settings.');return}}
  busyRef.current=true;setBusy(true);setError('');setMessage('')
  try{
   const result=await request('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:current.version,...(restoreId?{restoreId}:{data:draft})})})
   setCurrent(result.current);setDraft(result.current.data);setPreview(false);setRestoreId('');setMessage('Published and recorded in Audit Logs. Reload public pages to see the update. Search engines and social previews may take longer to refresh.');window.dispatchEvent(new Event('site-settings-published'))
   try{const latest=await request('/api/admin/settings');setHistory(latest.history)}catch{/* Successful publish must not be reported as failed if history refresh fails. */}
  }catch(e){setError(e instanceof Error?e.message:'Unable to publish.')}
  finally{busyRef.current=false;setBusy(false)}
 }
 async function reviewRestore(id:string){
  if(busyRef.current)return
  if(dirty&&!window.confirm('Discard the unsaved draft and preview this saved version?'))return
  busyRef.current=true;setBusy(true);setError('')
  try{const result=await request(`/api/admin/settings/history?id=${encodeURIComponent(id)}`);setDraft(result.data);setRestoreId(id);setPreview(true);setMessage('Review this earlier version below, then publish to restore it as a new version.')}
  catch(e){setError(e instanceof Error?e.message:'Unable to preview saved version.')}
  finally{busyRef.current=false;setBusy(false)}
 }
 const previewLogo=draft.logo
 return <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 md:p-8"><div className="mx-auto max-w-6xl space-y-6">
  <header><h1 className="text-3xl font-extrabold">Website settings</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Owner-only branding, company details, social links and default search appearance.</p></header>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{message}</p>}
  {loading?<p>Loading settings…</p>:!current?<p>Run the Settings setup SQL, then reload this page.</p>:<>
   <p className="text-sm text-slate-500 dark:text-slate-400">Published version {current.version} · {new Date(current.updated_at).toLocaleString('en-IN')} · {dirty?'Unpublished draft':'No unpublished changes'}</p>
   <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
    <section className={panel}><h2 className="text-xl font-bold">Branding</h2><p className="text-sm text-slate-500 dark:text-slate-400">PNG, JPG or WebP, up to 2 MB. Use transparent logos and a square PNG favicon. Images are converted to safe static PNG files. Leaving a logo empty uses the company name.</p><div className="grid gap-4 sm:grid-cols-2">{(Object.keys(ASSET_LABELS) as AssetKind[]).map(kind=><div key={kind} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><label className="block text-sm font-bold" htmlFor={`asset-${kind}`}>{ASSET_LABELS[kind]}</label>{draft[kind]&&<div className={`flex h-24 items-center justify-center rounded-lg p-3 ${kind==='darkLogo'||kind==='footerLogo'?'bg-slate-950':'bg-slate-100'}`}><img src={draft[kind]} alt={ASSET_LABELS[kind]} className="max-h-full max-w-full object-contain"/></div>}<input id={`asset-${kind}`} aria-label={`Upload ${ASSET_LABELS[kind]}`} type="file" accept="image/png,image/jpeg,image/webp" className="w-full text-xs" onChange={e=>{void upload(kind,e.target.files?.[0]);e.target.value=''}}/>{draft[kind]&&<button type="button" className={button} onClick={()=>edit(kind,'')}>Remove from draft</button>}</div>)}</div></section>
    <section className={panel}><h2 className="text-xl font-bold">Company details</h2><p className="text-sm text-slate-500 dark:text-slate-400">Used in the navigation, homepage footer and contact page. These display details do not change your email delivery account, payment identity or legal documents.</p><div className="grid gap-4 sm:grid-cols-2">{([['companyName','Company display name',80],['supportEmail','Public support email',254],['phone','Contact number',40]] as const).map(([key,label,max])=><label key={key} className="text-sm font-bold">{label}<input type={key==='supportEmail'?'email':'text'} maxLength={max} value={draft[key]} onChange={e=>edit(key,e.target.value)} className={input}/></label>)}<label className="text-sm font-bold">Business address<textarea rows={3} maxLength={500} value={draft.address} onChange={e=>edit('address',e.target.value)} className={input}/></label></div></section>
    <section className={panel}><h2 className="text-xl font-bold">Social media</h2><p className="text-sm text-slate-500 dark:text-slate-400">Full HTTPS profile links only. Empty links are hidden on the website.</p><div className="grid gap-4 sm:grid-cols-2">{(Object.keys(SOCIAL_LABELS) as (keyof typeof SOCIAL_LABELS)[]).map(key=><label key={key} className="text-sm font-bold">{SOCIAL_LABELS[key]}<input type="url" maxLength={500} value={draft.social[key]} placeholder="https://…" onChange={e=>{setDraft(old=>({...old,social:{...old.social,[key]:e.target.value}}));setPreview(false);setRestoreId('')}} className={input}/></label>)}</div></section>
    <section className={panel}><h2 className="text-xl font-bold">SEO defaults</h2><p className="text-sm text-slate-500 dark:text-slate-400">Used when a page does not define its own metadata. Article-specific titles and descriptions remain in place. Recommended sharing image: 1200 × 630 pixels.</p><label className="block text-sm font-bold">Default title<input className={input} maxLength={120} value={draft.seoTitle} onChange={e=>edit('seoTitle',e.target.value)}/></label><label className="block text-sm font-bold">Default description<textarea className={input} maxLength={320} rows={3} value={draft.seoDescription} onChange={e=>edit('seoDescription',e.target.value)}/></label></section>
    <div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={()=>{try{validateSiteSettings(draft);setPreview(true);setError('')}catch(e){setError(e instanceof Error?e.message:'Check settings.')}}}>Preview changes</button><button type="button" className={button} onClick={()=>{if(!dirty||window.confirm('Discard the unsaved draft?')){setDraft(current.data);setRestoreId('');setPreview(false);setMessage('')}}}>Discard draft</button></div>
   </fieldset>
   {preview&&<section className={panel}><h2 className="text-xl font-bold">Preview before publishing{restoreId?' — restore saved version':''}</h2><div className="grid gap-4 sm:grid-cols-2">{['light','dark'].map(mode=><div key={mode} className={`rounded-xl border p-4 ${mode==='dark'?'border-slate-700 bg-slate-950 text-white':'border-slate-200 bg-white text-slate-900'}`}><p className="mb-3 text-xs uppercase">{mode} appearance</p>{(mode==='dark'?draft.darkLogo||draft.logo:previewLogo)?<img src={(mode==='dark'?draft.darkLogo||draft.logo:previewLogo)} alt={draft.companyName} className="mb-4 h-10 max-w-48 object-contain"/>:<p className="mb-4 text-2xl font-black">{draft.companyName}</p>}<p>{draft.supportEmail}</p><p>{draft.phone}</p><p className="whitespace-pre-line">{draft.address}</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries(draft.social).filter(([,url])=>url).map(([key,url])=><a key={key} href={url} target="_blank" rel="noopener noreferrer" className="underline">{SOCIAL_LABELS[key as keyof typeof SOCIAL_LABELS]}</a>)}</div>{draft.footerLogo&&<img src={draft.footerLogo} alt="Footer logo" className="mt-4 h-9 max-w-48 object-contain"/>}</div>)}</div><div className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-900">{draft.favicon&&<img src={draft.favicon} width={24} height={24} alt="Tab icon"/>}<span>{draft.seoTitle}</span></div><div><p className="text-lg text-indigo-600 dark:text-indigo-300">{draft.seoTitle}</p><p className="text-sm">{draft.seoDescription}</p>{draft.shareImage&&<img src={draft.shareImage} alt="Sharing preview" className="mt-3 max-h-56 max-w-full rounded-lg object-contain"/>}</div><button type="button" disabled={busy||(!dirty&&!restoreId)} onClick={()=>void publish()} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{busy?'Publishing…':restoreId?'Publish restored version':'Publish to website'}</button><p className="text-xs text-slate-500 dark:text-slate-400">Publishing updates every deployment using this Supabase project, including the live website. Browser favicon caches may require a refresh.</p></section>}
   <section className={panel}><h2 className="text-xl font-bold">Saved versions</h2><p className="text-sm text-slate-500 dark:text-slate-400">The latest 25 versions are shown. Restoring creates a new version and preserves the audit history.</p><div className="space-y-2">{history.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3 text-sm dark:border-slate-700"><span>Version {row.version} · {new Date(row.created_at).toLocaleString('en-IN')}{row.version===current.version?' · Current':''}</span><button className={button} disabled={busy||row.version===current.version} onClick={()=>void reviewRestore(row.id)}>Preview restore</button></div>)}</div></section>
  </>}
 </div></main>
}

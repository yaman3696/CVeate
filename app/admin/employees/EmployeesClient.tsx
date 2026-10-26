'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAdminMfaHref } from '@/lib/admin-navigation'
import { ADMIN_PERMISSION_CATALOG, ADMIN_PERMISSIONS, type AdminPermission } from '@/lib/admin-permission-catalog'
import { employeeEmail } from '@/lib/employee-domain'

type Employee = { id: string; user_id: string; full_name: string; email: string; job_title: string; status: string; last_email_sent_at: string | null; version: number; permissions: AdminPermission[] }
const empty={name:'',email:'',jobTitle:''}
const input='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-[#111C30] dark:text-slate-100'
const button='rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50 dark:border-slate-700'
export default function EmployeesClient(){
 const router=useRouter()
 const [rows,setRows]=useState<Employee[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(1),[searchInput,setSearchInput]=useState(''),[search,setSearch]=useState('')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[refresh,setRefresh]=useState(0)
 const [form,setForm]=useState(empty),[selected,setSelected]=useState<Employee|null>(null),[permissions,setPermissions]=useState<AdminPermission[]>([]),[editing,setEditing]=useState(false),[deleteConfirm,setDeleteConfirm]=useState<Employee|null>(null),[confirmEmail,setConfirmEmail]=useState('')
 useEffect(()=>{
  const controller=new AbortController()
  async function load(){setLoading(true);setError('');try{
   const {data:{session}}=await supabase.auth.getSession();if(controller.signal.aborted)return;if(!session){router.replace('/');return}
   const result=await fetch(`/api/admin/employees?${new URLSearchParams({page:String(page),search})}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store',signal:controller.signal})
   const data=await result.json();if(controller.signal.aborted)return
   if(result.status===403){router.replace(data.error==='MFA_REQUIRED'?getAdminMfaHref('/admin/employees'):'/admin/denied');return}
   if(!result.ok)throw new Error(data.error||'Unable to load employees.')
   const lastPage=Math.max(1,Math.ceil(data.total/25));if(page>lastPage){setPage(lastPage);return}
   setRows(data.employees);setTotal(data.total)
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load employees.')}
  finally{if(!controller.signal.aborted)setLoading(false)}}void load();return()=>controller.abort()
 },[page,search,refresh,router])
 function edit(employee:Employee|null){setSelected(employee);setForm(employee?{name:employee.full_name,email:employee.email,jobTitle:employee.job_title}:empty);setPermissions(employee?[...employee.permissions]:[]);setEditing(true);setError('');setMessage('')}
 function toggle(key:AdminPermission){setPermissions(current=>current.includes(key)?key==='blog.read'?current.filter(p=>!p.startsWith('blog.')):current.filter(p=>p!==key):[...new Set([...current,key,...(key.startsWith('blog.')?['blog.read' as const]:[])])])}
 async function request(method:'POST'|'PATCH',body:Record<string,unknown>){
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sign in again.')
  const response=await fetch('/api/admin/employees',{method,headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const result=await response.json();if(result.error==='MFA_REQUIRED'){router.replace(getAdminMfaHref('/admin/employees'));throw new Error('MFA verification is required.')}
  if(!response.ok)throw new Error(result.error||'Employee action failed.')
  return result
 }
 async function save(e:React.FormEvent){e.preventDefault();if(busy)return
  if(!selected&&!employeeEmail(form.email)){setError('Employee access is available only for @cveat.in addresses.');return}
  if(!window.confirm(selected?`Update access for ${selected.email}?`:`Create an employee login and email an invitation to ${form.email.trim()}?`))return
  setBusy(true);setError('');setMessage('')
  try{const result=await request(selected?'PATCH':'POST',selected?{id:selected.id,version:selected.version,action:'permissions',permissions}:{...form,permissions});setMessage(result.warning||(selected?'Permissions saved and audited.':result.sent?'Employee created. Invitation accepted by the mail server.':'Employee saved. Check invitation delivery.'));setEditing(false);setSelected(null)}
  catch(e){setError(e instanceof Error?e.message:'Unable to save employee.')}
  finally{setBusy(false);setRefresh(n=>n+1)}
 }
 async function action(employee:Employee,kind:string){if(busy)return
  if(kind==='delete'&&!deleteConfirm){setDeleteConfirm(employee);setConfirmEmail('');return}
  if(kind!=='delete'&&!window.confirm(`${kind==='revoke'?'Remove admin access':kind==='resend'?'Resend invitation':kind==='suspend'?'Suspend admin access':'Restore admin access'} for ${employee.email}?`))return
  setBusy(true);setError('');setMessage('')
  try{const result=await request('PATCH',{id:employee.id,version:employee.version,action:kind,...(kind==='delete'?{confirmEmail}:{})});setMessage(result.warning||(kind==='delete'?'Employee login deleted. Audit history is retained.':kind==='resend'?'Invitation accepted by the mail server.':'Employee access updated and audited.'));setDeleteConfirm(null);setEditing(false)}
  catch(e){setError(e instanceof Error?e.message:'Unable to update employee.');setDeleteConfirm(null)}
  finally{setBusy(false);setRefresh(n=>n+1)}
 }
 return <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
  <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Employee access</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Owner-managed @cveat.in invitations, permissions and account access.</p></div><button className={button} disabled={busy} onClick={()=>edit(null)}>+ Invite employee</button></header>
  <p className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900 dark:bg-indigo-400/10 dark:text-indigo-200">Only your designated owner account can use a personal email or manage administrators. Employees need an existing @cveat.in mailbox, their own password and MFA. Full operational access does not include managing administrators. Revocation is checked on every protected API request.</p>
  <Link href="/admin/permissions" className="inline-block text-sm font-bold text-indigo-600 dark:text-indigo-300">View administrator permissions →</Link>
  <form className="flex flex-wrap gap-3" onSubmit={e=>{e.preventDefault();setSearch(searchInput.trim());setPage(1);setRefresh(n=>n+1)}}><label className="flex-1 text-xs font-bold">Search name or employee email<input className={input} value={searchInput} maxLength={254} disabled={busy} onChange={e=>{setSearchInput(e.target.value);if(!e.target.value.trim()){setSearch('');setPage(1)}}}/></label><button className={button} disabled={busy}>Search</button><button type="button" className={button} disabled={busy||loading} onClick={()=>{setSearch(searchInput.trim());setPage(1);setRefresh(n=>n+1)}}>Refresh</button></form>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">{message}</p>}
  {editing&&<form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]"><h2 className="text-xl font-bold">{selected?`Permissions for ${selected.email}`:'Invite an employee'}</h2><fieldset disabled={busy} className="space-y-4">
   {!selected&&<div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold">Full name<input className={input} required maxLength={100} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="text-xs font-bold">Company email<input className={input} type="email" required maxLength={254} placeholder="employee@cveat.in" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label className="text-xs font-bold">Job title (optional)<input className={input} maxLength={100} value={form.jobTitle} onChange={e=>setForm({...form,jobTitle:e.target.value})}/></label></div>}
   <div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={()=>setPermissions([...ADMIN_PERMISSIONS])}>Full operational access</button><button type="button" className={button} onClick={()=>setPermissions([])}>Clear permissions</button></div><div className="grid gap-3 sm:grid-cols-2">{ADMIN_PERMISSIONS.map(key=><label key={key} className="flex gap-2 text-sm"><input type="checkbox" checked={permissions.includes(key)} onChange={()=>toggle(key)} className="accent-indigo-600"/>{ADMIN_PERMISSION_CATALOG[key]}</label>)}</div>
   <div className="flex gap-3"><button className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">{busy?'Saving…':selected?'Save permissions':'Create & send invitation'}</button><button type="button" className={button} onClick={()=>setEditing(false)}>Cancel</button></div></fieldset></form>}
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#1B263B]"><table className="w-full text-left text-sm"><caption className="sr-only">Employee administrator accounts</caption><thead><tr>{['Employee','Status','Invitation','Actions'].map(title=><th scope="col" key={title} className="p-4">{title}</th>)}</tr></thead><tbody>{loading?<tr><td colSpan={4} className="p-6">Loading employees…</td></tr>:rows.length===0?<tr><td colSpan={4} className="p-6">No employees found.</td></tr>:rows.map(employee=><tr key={employee.id} className="border-t border-slate-100 dark:border-slate-700"><td className="p-4"><p className="font-bold">{employee.full_name}</p><p className="break-all text-xs">{employee.email}</p><p className="text-xs text-slate-500 dark:text-slate-400">{employee.job_title}</p></td><td className="p-4">{employee.status}<p className="text-xs">{employee.permissions.length} permissions</p></td><td className="p-4 text-xs">{employee.last_email_sent_at?new Date(employee.last_email_sent_at).toLocaleString('en-IN'):'No successful email delivery recorded'}</td><td className="p-4"><div className="flex flex-wrap gap-2">
   {!['deleted','deleting'].includes(employee.status)&&<><button className={button} disabled={busy} onClick={()=>edit(employee)}>Edit access</button>{['active','invited'].includes(employee.status)&&<button className={button} disabled={busy} onClick={()=>void action(employee,'suspend')}>Suspend</button>}{['suspended','revoked'].includes(employee.status)&&<button className={button} disabled={busy} onClick={()=>void action(employee,'restore')}>Restore</button>}{employee.status==='invited'&&<button className={button} disabled={busy} onClick={()=>void action(employee,'resend')}>Resend invite</button>}{employee.status!=='revoked'&&<button className={button} disabled={busy} onClick={()=>void action(employee,'revoke')}>Remove admin access</button>}</>}
   {employee.status!=='deleted'&&<button className={button+' text-red-600 dark:text-red-300'} disabled={busy} onClick={()=>{setDeleteConfirm(employee);setConfirmEmail('')}}>{employee.status==='deleting'?'Retry login deletion':'Permanently delete login'}</button>}
  </div></td></tr>)}</tbody></table></div>
  <div className="flex items-center justify-between"><button className={button} disabled={loading||busy||page<=1} onClick={()=>setPage(n=>n-1)}>Previous</button><span className="text-sm">Page {page} of {Math.max(1,Math.ceil(total/25))}</span><button className={button} disabled={loading||busy||!!error||page>=Math.ceil(total/25)} onClick={()=>setPage(n=>n+1)}>Next</button></div>
  {deleteConfirm&&<section className="space-y-3 rounded-2xl border border-red-300 bg-white p-5 dark:bg-[#1B263B]" aria-labelledby="delete-employee-title"><h2 id="delete-employee-title" className="text-xl font-bold">Permanently delete employee login</h2><p className="text-sm">This removes the login and associated account data, including saved CVs. Audit history is retained. Purchase records block this action; use Remove admin access instead.</p><label className="block text-xs font-bold">Type {deleteConfirm.email} to confirm<input className={input} disabled={busy} value={confirmEmail} onChange={e=>setConfirmEmail(e.target.value)} autoComplete="off"/></label><div className="flex gap-3"><button className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50" disabled={busy||confirmEmail!==deleteConfirm.email} onClick={()=>void action(deleteConfirm,'delete')}>{busy?'Deleting…':'Delete login permanently'}</button><button className={button} disabled={busy} onClick={()=>setDeleteConfirm(null)}>Cancel</button></div></section>}
 </div></main>
}

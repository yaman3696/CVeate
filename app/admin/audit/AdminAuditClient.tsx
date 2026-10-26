'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAdminMfaHref } from '@/lib/admin-navigation'
import ExportExcelButton from '@/components/admin/ExportExcelButton'

type Entry = { id: string; actor_id: string; action: string; resource_type: string; resource_id: string; summary: string; metadata: Record<string, string | string[] | null>; created_at: string }
type Filters = { actor: string; resource: string; action: string; from: string; to: string }
const initial: Filters = { actor: '', resource: '', action: 'all', from: '', to: '' }
const actions = { 'blog.created': 'Article created', 'blog.updated': 'Article updated', 'blog.deleted': 'Article deleted', 'permissions.updated': 'Permissions updated', 'employee.invited': 'Employee invited', 'employee.accepted': 'Invitation accepted', 'employee.suspended': 'Employee suspended', 'employee.restored': 'Employee restored', 'employee.revoked': 'Admin access removed', 'employee.email_requested': 'Invitation email requested', 'employee.email_sent': 'Invitation email accepted', 'employee.email_failed': 'Invitation email failed', 'employee.delete_requested': 'Login deletion requested', 'employee.deleted': 'Employee login deleted' }
const when = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-[#111C30] dark:text-slate-100 dark:[color-scheme:dark]'
const button = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800'

export default function AuditLogsPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<Filters>(initial)
  const [filters, setFilters] = useState<Filters>(initial)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [logs, setLogs] = useState<Entry[]>([])
  const [selected, setSelected] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [refresh, setRefresh] = useState(0)
  function apply(next: Filters) {
    setFilters({ ...next, actor: next.actor.trim(), resource: next.resource.trim() })
    setPage(1)
    setSelected(null)
    setRefresh(n => n + 1)
  }
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError(''); setSetupRequired(false); setLogs([])
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (controller.signal.aborted) return
        if (!session) { router.replace('/'); return }
        const params = new URLSearchParams({ ...filters, page: String(page) })
        const response = await fetch(`/api/admin/audit?${params}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (controller.signal.aborted) return
        if (response.status === 403) { router.replace(result.error === 'MFA_REQUIRED' ? getAdminMfaHref('/admin/audit') : result.error === 'PERMISSION_DENIED' ? '/admin/denied' : '/'); return }
        if (response.status === 503 && result.error === 'AUDIT_SETUP_REQUIRED') { setSetupRequired(true); return }
        if (!response.ok) throw new Error(result.error || 'Unable to load audit logs.')
        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize))
        if (page > lastPage) { setPage(lastPage); return }
        setLogs(result.logs); setTotal(result.total); setPageSize(result.pageSize)
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load audit logs.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [filters, page, refresh, router])
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Audit Logs</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Administrator activity · dates shown in India time</p></div><button className={button} disabled={loading} onClick={() => apply(draft)}>Refresh</button></header>
    <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 dark:border-indigo-400/25 dark:bg-indigo-400/10 dark:text-indigo-200">Coverage: successful article creation, updates, deletion and administrator permission changes and employee lifecycle actions through the admin APIs after setup. Historical actions, direct database edits and other modules are not included. Logging is best-effort; unsuccessful log writes are reported to the administrator.</p>
    <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={e => { e.preventDefault(); apply(draft) }}>
      <label className="space-y-1 text-xs font-bold">Action<select className={input} value={draft.action} onChange={e => { const next = { ...draft, action: e.target.value }; setDraft(next); apply(next) }}><option value="all">All actions</option>{Object.entries(actions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="space-y-1 text-xs font-bold">Admin user ID<input className={input} maxLength={36} value={draft.actor} placeholder="Full admin user ID" onChange={e => { const next = { ...draft, actor: e.target.value }; setDraft(next); if (!next.actor.trim()) apply(next) }} /></label>
      <label className="space-y-1 text-xs font-bold">Resource ID<input className={input} maxLength={36} value={draft.resource} placeholder="Full resource ID" onChange={e => { const next = { ...draft, resource: e.target.value }; setDraft(next); if (!next.resource.trim()) apply(next) }} /></label>
      <label className="space-y-1 text-xs font-bold">From date (India time)<input className={input} type="date" max={draft.to || undefined} value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
      <label className="space-y-1 text-xs font-bold">To date (India time)<input className={input} type="date" min={draft.from || undefined} value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
      <div className="flex gap-2"><button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Apply filters</button><button type="button" className={button} onClick={() => { setDraft(initial); apply(initial) }}>Clear all</button></div>
    </form>
    {setupRequired ? <div role="status" className="rounded-xl bg-amber-50 p-5 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100"><h2 className="font-bold">One-time database setup required</h2><p className="mt-2 text-sm">Run supabase/migrations/202610260001_admin_audit_logs.sql in your Supabase SQL Editor, then click Refresh. Events will be recorded from that point onward.</p></div> : error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}<button className="ml-3 underline" onClick={() => apply(draft)}>Retry</button></div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-sm">{loading ? 'Loading events…' : `${total.toLocaleString('en-IN')} matching events`}</p><div className="flex items-center gap-3"><span className="text-xs">Export: current page</span><ExportExcelButton disabled={loading || logs.length === 0} fileName={`CVeat_Audit_Page_${page}.xlsx`} sheets={[{ name: 'Audit Logs', headers: ['Event ID', 'Date (India time)', 'Admin ID', 'Action', 'Resource', 'Resource ID', 'Summary'], rows: logs.map(log => [log.id, when(log.created_at), log.actor_id, log.action, log.resource_type, log.resource_id, log.summary]) }]} /></div></div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#1B263B]"><table className="w-full text-left text-sm"><caption className="sr-only">Administrator activity records</caption><thead className="bg-slate-100 text-xs uppercase dark:bg-slate-800"><tr>{['Date (India time)', 'Administrator', 'Action', 'Resource', 'Details'].map(title => <th scope="col" className="px-4 py-3" key={title}>{title}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={5} className="p-6 text-center">Loading events…</td></tr> : logs.length === 0 ? <tr><td colSpan={5} className="p-6 text-center">No events match these filters. Logging starts after database setup and your next admin article change.</td></tr> : logs.map(log => <tr key={log.id} className="border-t border-slate-100 dark:border-slate-700"><td className="px-4 py-4">{when(log.created_at)}</td><td className="break-all px-4 py-4 text-xs">{log.actor_id}</td><td className="px-4 py-4">{actions[log.action as keyof typeof actions] || log.action}</td><td className="px-4 py-4"><p>{log.summary}</p><p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{log.resource_id}</p></td><td className="px-4 py-4"><button className="font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setSelected(log)} aria-label={`View audit event ${log.id}`}>View</button></td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between"><button className={button} disabled={loading || page <= 1} onClick={() => { setPage(n => n - 1); setSelected(null) }}>Previous</button><span className="text-sm">Page {page} of {pages}</span><button className={button} disabled={loading || page >= pages} onClick={() => { setPage(n => n + 1); setSelected(null) }}>Next</button></div>
    </>}
    {selected && !setupRequired && !error && <section aria-labelledby="audit-detail-title" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]"><div className="flex justify-between gap-3"><h2 id="audit-detail-title" className="text-xl font-bold">Event details</h2><button className={button} onClick={() => setSelected(null)}>Close details</button></div><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[['Event ID', selected.id], ['Admin ID', selected.actor_id], ['Action', selected.action], ['Resource ID', selected.resource_id], ...Object.entries(selected.metadata)].map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-all">{Array.isArray(value) ? value.join(', ') || '(none)' : value ?? '—'}</dd></div>)}</dl></section>}
  </div></main>
}

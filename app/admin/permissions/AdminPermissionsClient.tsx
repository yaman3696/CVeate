'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAdminMfaHref } from '@/lib/admin-navigation'
import { ADMIN_PERMISSION_CATALOG, ADMIN_PERMISSIONS, type AdminPermission } from '@/lib/admin-permission-catalog'

type AdminRow = { id: string; full_name: string | null; isOwner: boolean; permissions: AdminPermission[]; version: number }
const input = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#111C30] dark:text-slate-100'
const button = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50 dark:border-slate-700'
export default function PermissionsPage() {
  const router = useRouter()
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<AdminRow | null>(null)
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError(''); setAdmins([]); setSelected(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (controller.signal.aborted) return
        if (!session) { router.replace('/'); return }
        const params = new URLSearchParams({ page: String(page), search })
        const response = await fetch(`/api/admin/permissions?${params}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (controller.signal.aborted) return
        if (response.status === 403) { router.replace(result.error === 'MFA_REQUIRED' ? getAdminMfaHref('/admin/permissions') : '/admin/denied'); return }
        if (!response.ok) throw new Error(result.error === 'PERMISSIONS_UNAVAILABLE' ? 'Run the permission setup SQL before using this page.' : result.error || 'Unable to load administrators.')
        const lastPage = Math.max(1, Math.ceil(result.total / 25))
        if (page > lastPage) { setPage(lastPage); return }
        setAdmins(result.admins); setTotal(result.total)
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load administrators.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [page, search, refresh, router])
  function toggle(key: AdminPermission) {
    setPermissions(current => {
      if (current.includes(key)) return key === 'blog.read' ? current.filter(p => !p.startsWith('blog.')) : current.filter(p => p !== key)
      return [...new Set([...current, key, ...(key.startsWith('blog.') ? ['blog.read' as const] : [])])]
    })
  }
  async function save() {
    if (!selected || selected.isOwner || saving) return
    if (!window.confirm(`Save access changes for ${selected.full_name || selected.id}? Revoked permissions take effect on their next API request.`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/'); return }
      const response = await fetch('/api/admin/permissions', { method: 'PATCH', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: selected.id, permissions, version: selected.version }) })
      const result = await response.json()
      if (!response.ok) {
        if (result.error === 'MFA_REQUIRED') { router.replace(getAdminMfaHref('/admin/permissions')); return }
        throw new Error(result.error || 'Unable to save permissions.')
      }
      setMessage('Permissions saved and recorded in Audit Logs.'); setSelected(null); setRefresh(n => n + 1)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save permissions.') }
    finally { setSaving(false) }
  }
  const pages = Math.max(1, Math.ceil(total / 25))
  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 md:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <header><h1 className="text-3xl font-extrabold">Administrator Permissions</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The designated owner controls section access and article actions for existing administrators.</p></header>
    <p className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900 dark:bg-indigo-400/10 dark:text-indigo-200">Owners retain full access. This page cannot create administrators, change account roles, or remove owner access. Each saved change and its audit event commit together.</p>
    <Link href="/admin/employees" className="inline-block text-sm font-bold text-indigo-600 dark:text-indigo-300">Invite and manage employees →</Link>
    <form className="flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); setRefresh(n => n + 1) }}><label className="flex flex-1 flex-col gap-1 text-xs font-bold">Search administrators by name or full user ID<input className={input} maxLength={100} value={searchInput} disabled={saving} onChange={e => { setSearchInput(e.target.value); if (!e.target.value.trim()) { setSearch(''); setPage(1) } }} /></label><button className={button} disabled={saving}>Search</button><button type="button" disabled={saving || loading} className={button} onClick={() => { setSearch(searchInput.trim()); setPage(1); setRefresh(n => n + 1) }}>Refresh</button></form>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">{message}</p>}
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#1B263B]"><table className="w-full text-left text-sm"><caption className="sr-only">Administrator permissions</caption><thead><tr>{['Administrator','Access','Action'].map(label => <th className="p-4" scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={3} className="p-6">Loading administrators…</td></tr> : admins.length === 0 ? <tr><td colSpan={3} className="p-6">{error ? 'Administrators unavailable.' : 'No matching administrators.'}</td></tr> : admins.map(admin => <tr key={admin.id} className="border-t border-slate-100 dark:border-slate-700"><td className="p-4"><p className="font-bold">{admin.full_name || 'Unnamed administrator'}</p><p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{admin.id}</p></td><td className="p-4">{admin.isOwner ? 'Owner · full access' : `${admin.permissions.length} permissions`}</td><td className="p-4"><button className={button} disabled={admin.isOwner || saving} onClick={() => { setSelected(admin); setPermissions([...admin.permissions]); setError(''); setMessage('') }}>{admin.isOwner ? 'Protected owner' : 'Edit access'}</button></td></tr>)}</tbody></table></div>
    <div className="flex items-center justify-between"><button className={button} disabled={loading || saving || page <= 1} onClick={() => setPage(n => n - 1)}>Previous</button><span className="text-sm">Page {page} of {pages}</span><button className={button} disabled={loading || saving || !!error || page >= pages} onClick={() => setPage(n => n + 1)}>Next</button></div>
    {selected && <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]" aria-labelledby="permission-editor-title"><h2 id="permission-editor-title" className="text-xl font-bold">Access for {selected.full_name || selected.id}</h2><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Article actions include viewing articles. Removing article viewing also removes those actions.</p><fieldset disabled={saving} className="mt-5 grid gap-3 sm:grid-cols-2"><legend className="sr-only">Allowed actions</legend>{ADMIN_PERMISSIONS.map(key => <label key={key} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={permissions.includes(key)} onChange={() => toggle(key)} className="h-4 w-4 accent-indigo-600" />{ADMIN_PERMISSION_CATALOG[key]}</label>)}</fieldset><div className="mt-6 flex gap-3"><button disabled={saving} onClick={() => void save()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save permissions'}</button><button disabled={saving} className={button} onClick={() => setSelected(null)}>Cancel</button></div></section>}
  </div></main>
}

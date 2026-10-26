'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAdminMfaHref } from '@/lib/admin-navigation'
import ExportExcelButton from '@/components/admin/ExportExcelButton'

type UserRow = { id: string; full_name: string | null; role: string | null; career_credits: number | null; created_at: string | null }
type Purchase = { id: string; package_name: string | null; amount_paise: number; currency: string; credits: number; status: string; created_at: string }
type UserDetails = { user: UserRow & { email: string | null; phone: string | null; lastSignInAt: string | null }; purchases: Purchase[]; purchasesUnavailable: boolean; contactUnavailable: boolean }
const date = (value: string | null) => value ? new Date(value).toLocaleString('en-IN') : '—'
const input = 'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-[#111C30] dark:text-slate-100'
const button = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [details, setDetails] = useState<UserDetails | null>(null)
  const [detailsError, setDetailsError] = useState('')
  const [detailsLoading, setDetailsLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      setUsers([])
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (controller.signal.aborted) return
        if (!session) { router.replace('/'); return }
        const params = new URLSearchParams({ page: String(page), search, role })
        const response = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (controller.signal.aborted) return
        if (response.status === 403) {
          router.replace(result.error === 'MFA_REQUIRED' ? getAdminMfaHref(window.location.pathname + window.location.search) : result.error === 'PERMISSION_DENIED' ? '/admin/denied' : '/')
          return
        }
        if (!response.ok) throw new Error(result.error || 'Unable to load users.')
        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize))
        if (page > lastPage) { setPage(lastPage); return }
        setUsers(result.users)
        setTotal(result.total)
        setPageSize(result.pageSize)
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load users.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [page, search, role, refresh, router])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    async function load() {
      setDetails(null)
      setDetailsError('')
      setDetailsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (controller.signal.aborted) return
        if (!session) { router.replace('/'); return }
        const response = await fetch(`/api/admin/users/${encodeURIComponent(selectedId!)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (controller.signal.aborted) return
        if (response.status === 403) {
          router.replace(result.error === 'MFA_REQUIRED' ? getAdminMfaHref('/admin/users') : result.error === 'PERMISSION_DENIED' ? '/admin/denied' : '/')
          return
        }
        if (!response.ok) throw new Error(result.error || 'Unable to load user details.')
        setDetails(result)
      } catch (err) {
        if (!controller.signal.aborted) setDetailsError(err instanceof Error ? err.message : 'Unable to load user details.')
      } finally { if (!controller.signal.aborted) setDetailsLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [selectedId, refresh, router])

  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 md:p-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-extrabold">Users</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">View registered profiles, Career Credits and recent purchases.</p></div>
        <button type="button" className={button} disabled={loading} onClick={() => { setSearch(searchInput.trim()); setPage(1); setSelectedId(null); setRefresh(n => n + 1) }}>Refresh</button>
      </header>
      <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); setPage(1); setSelectedId(null); setSearch(searchInput.trim()); setRefresh(n => n + 1) }}>
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-bold">Search by name or full user ID<input className={input} maxLength={100} value={searchInput} onChange={e => {
          const value = e.target.value
          setSearchInput(value)
          if (!value.trim()) {
            setSearch('')
            setPage(1)
            setSelectedId(null)
          }
        }} placeholder="Name or user ID" /></label>
        <label className="flex flex-col gap-1 text-xs font-bold">Role<select className={input} value={role} onChange={e => { setRole(e.target.value); setPage(1); setSelectedId(null) }}><option value="all">All roles</option><option value="admin">Administrators</option><option value="member">Other users</option></select></label>
        <button className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700" type="submit">Search</button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm">{loading ? 'Loading users…' : error ? 'Users unavailable' : `${total.toLocaleString('en-IN')} matching profiles`}</p>
        <div className="flex flex-wrap items-center gap-3"><span className="text-xs text-slate-500 dark:text-slate-400">Export includes this page only</span><ExportExcelButton disabled={loading || !!error || users.length === 0} fileName={`CVeat_Users_Page_${page}.xlsx`} sheets={[{ name: 'Users', headers: ['User ID', 'Name', 'Role', 'Career Credits', 'Joined'], rows: users.map(user => [user.id, user.full_name || '', user.role || '', user.career_credits ?? '', user.created_at || '']) }]} /></div>
      </div>
      {error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}<button className="ml-3 underline" onClick={() => setRefresh(n => n + 1)}>Retry</button></div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#1B263B]">
        <table className="w-full text-left text-sm"><caption className="sr-only">Registered user profiles</caption><thead className="bg-slate-100 text-xs uppercase dark:bg-slate-800"><tr>{['User', 'Role', 'Career Credits', 'Joined', 'Details'].map(title => <th key={title} scope="col" className="px-4 py-3">{title}</th>)}</tr></thead><tbody>
          {loading ? <tr><td colSpan={5} className="p-6 text-center">Loading users…</td></tr> : users.length === 0 ? <tr><td colSpan={5} className="p-6 text-center">No matching profiles found.</td></tr> : users.map(user => <tr key={user.id} className="border-t border-slate-100 dark:border-slate-700"><td className="px-4 py-4"><p className="font-semibold">{user.full_name || 'Unnamed user'}</p><p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{user.id}</p></td><td className="px-4 py-4">{user.role || 'Unassigned'}</td><td className="px-4 py-4">{user.career_credits ?? '—'}</td><td className="px-4 py-4">{date(user.created_at)}</td><td className="px-4 py-4"><button className="font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setSelectedId(user.id)} aria-label={`View details for ${user.full_name || user.id}`}>View</button></td></tr>)}
        </tbody></table>
      </div>}
      <div className="flex items-center justify-between gap-3"><button className={button} disabled={loading || page <= 1} onClick={() => { setPage(n => n - 1); setSelectedId(null) }}>Previous</button><span className="text-sm">Page {page} of {pages}</span><button className={button} disabled={loading || !!error || page >= pages} onClick={() => { setPage(n => n + 1); setSelectedId(null) }}>Next</button></div>
      {selectedId && <section aria-labelledby="user-details-title" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]">
        <div className="flex items-center justify-between gap-3"><h2 id="user-details-title" className="text-xl font-bold">User details</h2><button className={button} onClick={() => setSelectedId(null)}>Close details</button></div>
        {detailsLoading && <p role="status" className="mt-4">Loading user details…</p>}
        {detailsError && <p role="alert" className="mt-4 text-red-600 dark:text-red-300">{detailsError}</p>}
        {details && <div className="mt-5 space-y-5">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">{[['Name', details.user.full_name], ['User ID', details.user.id], ['Email', details.user.email], ['Phone', details.user.phone], ['Role', details.user.role], ['Career Credits', details.user.career_credits], ['Joined', date(details.user.created_at)], ['Last sign-in', date(details.user.lastSignInAt)]].map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-all">{value ?? '—'}</dd></div>)}</dl>
          {details.contactUnavailable && <p role="status" className="text-sm text-amber-700 dark:text-amber-200">Contact and sign-in information could not be loaded.</p>}
          <h3 className="font-bold">Recent purchases (up to 10)</h3>
          {details.purchasesUnavailable ? <p role="status">Purchase history could not be loaded.</p> : details.purchases.length === 0 ? <p className="text-sm">No purchases found.</p> : <ul className="space-y-3">{details.purchases.map(purchase => <li key={purchase.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><p className="font-semibold">{purchase.package_name || 'Credit pack'} · {purchase.credits} credits</p><p className="mt-1">{purchase.currency} {(purchase.amount_paise / 100).toFixed(2)} · {purchase.status} · {date(purchase.created_at)}</p></li>)}</ul>}
        </div>}
      </section>}
    </div>
  </main>
}

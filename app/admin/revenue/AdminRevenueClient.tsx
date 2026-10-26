'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAdminMfaHref } from '@/lib/admin-navigation'
import ExportExcelButton from '@/components/admin/ExportExcelButton'

type Purchase = { id: string; user_id: string; provider: string; provider_order_id: string | null; provider_payment_id: string | null; package_name: string | null; amount_paise: number; currency: string; credits: number; status: string; created_at: string }
type Filters = { search: string; field: string; status: string; from: string; to: string }
const initial: Filters = { search: '', field: 'provider_payment_id', status: 'all', from: '', to: '' }
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-[#111C30] dark:text-slate-100 dark:[color-scheme:dark]'
const button = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800'
const when = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
const money = (value: number, currency = 'INR') => `${currency} ${(value / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function AdminRevenuePage() {
  const router = useRouter()
  const [draft, setDraft] = useState<Filters>(initial)
  const [filters, setFilters] = useState<Filters>(initial)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<Purchase | null>(null)
  function apply(next: Filters) {
    setFilters({ ...next, search: next.search.trim() })
    setPage(1)
    setSelected(null)
    setRefresh(n => n + 1)
  }
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      setRows([])
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (controller.signal.aborted) return
        if (!session) { router.replace('/'); return }
        const params = new URLSearchParams({ ...filters, page: String(page) })
        const response = await fetch(`/api/admin/revenue?${params}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (controller.signal.aborted) return
        if (response.status === 403) { router.replace(result.error === 'MFA_REQUIRED' ? getAdminMfaHref('/admin/revenue') : result.error === 'PERMISSION_DENIED' ? '/admin/denied' : '/'); return }
        if (!response.ok) throw new Error(result.error || 'Unable to load purchases.')
        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize))
        if (page > lastPage) { setPage(lastPage); return }
        setRows(result.purchases)
        setTotal(result.total)
        setPageSize(result.pageSize)
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load purchases.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [filters, page, refresh, router])
  const completed = rows.filter(row => row.status === 'completed')
  const pageRevenue = completed.filter(row => row.currency === 'INR').reduce((sum, row) => sum + Number(row.amount_paise || 0), 0)
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Revenue & Purchases</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Recorded credit-pack purchases and payment statuses. Dates are shown in India time.</p></div><button className={button} disabled={loading} onClick={() => apply(draft)}>Refresh</button></header>
      <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={e => { e.preventDefault(); apply(draft) }}>
        <label className="space-y-1 text-xs font-bold">Search field<select className={input} value={draft.field} onChange={e => setDraft({ ...draft, field: e.target.value })}><option value="provider_payment_id">Payment ID (exact)</option><option value="provider_order_id">Order ID (exact)</option><option value="user_id">User ID (full)</option><option value="id">Purchase ID (full)</option><option value="package_name">Pack name</option></select></label>
        <label className="space-y-1 text-xs font-bold">Search<input className={input} maxLength={150} value={draft.search} placeholder="Enter an ID or pack name" onChange={e => { const next = { ...draft, search: e.target.value }; setDraft(next); if (!next.search.trim()) apply(next) }} /></label>
        <label className="space-y-1 text-xs font-bold">Status<select className={input} value={draft.status} onChange={e => { const next = { ...draft, status: e.target.value }; setDraft(next); apply(next) }}>{['all', 'created', 'pending', 'completed', 'failed', 'refunded'].map(status => <option key={status} value={status}>{status === 'all' ? 'All statuses' : status}</option>)}</select></label>
        <label className="space-y-1 text-xs font-bold">From date (India time)<input className={input} type="date" value={draft.from} max={draft.to || undefined} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
        <label className="space-y-1 text-xs font-bold">To date (India time)<input className={input} type="date" value={draft.to} min={draft.from || undefined} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
        <div className="flex gap-2"><button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Apply filters</button><button type="button" className={button} onClick={() => { setDraft(initial); apply(initial) }}>Clear all</button></div>
      </form>
      <div className="grid gap-3 sm:grid-cols-3">{[['Matching purchases', loading || error ? '—' : total.toLocaleString('en-IN')], ['Completed INR revenue · this page', loading || error ? '—' : money(pageRevenue)], ['Completed purchases · this page', loading || error ? '—' : String(completed.length)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]"><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500 dark:text-slate-400">Page revenue sums completed INR purchases only, before fees, taxes and refunds recorded elsewhere.</p><div className="flex items-center gap-3"><span className="text-xs">Export: current page</span><ExportExcelButton disabled={loading || !!error || rows.length === 0} fileName={`CVeat_Purchases_Page_${page}.xlsx`} sheets={[{ name: 'Purchases', headers: ['Purchase ID', 'User ID', 'Pack', 'Amount', 'Currency', 'Credits', 'Status', 'Payment ID', 'Order ID', 'Date (India time)'], rows: rows.map(row => [row.id, row.user_id, row.package_name || '', row.amount_paise / 100, row.currency, row.credits, row.status, row.provider_payment_id || '', row.provider_order_id || '', when(row.created_at)]) }]} /></div></div>
      {error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}<button className="ml-3 underline" onClick={() => apply(draft)}>Retry</button></div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#1B263B]"><table className="w-full text-left text-sm"><caption className="sr-only">Credit-pack purchase records</caption><thead className="bg-slate-100 text-xs uppercase dark:bg-slate-800"><tr>{['Purchase / user', 'Pack / credits', 'Amount', 'Status', 'Date (India time)', 'Details'].map(title => <th scope="col" className="px-4 py-3" key={title}>{title}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-6 text-center">Loading purchases…</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="p-6 text-center">No purchases match these filters.</td></tr> : rows.map(row => <tr className="border-t border-slate-100 dark:border-slate-700" key={row.id}><td className="px-4 py-4"><p className="break-all text-xs font-semibold">{row.id}</p><p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">User: {row.user_id}</p></td><td className="px-4 py-4">{row.package_name || 'Credit pack'}<p className="text-xs">{row.credits} credits</p></td><td className="whitespace-nowrap px-4 py-4">{money(row.amount_paise, row.currency)}</td><td className="px-4 py-4">{row.status}</td><td className="px-4 py-4">{when(row.created_at)}</td><td className="px-4 py-4"><button className="font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setSelected(row)} aria-label={`View purchase ${row.id}`}>View</button></td></tr>)}</tbody></table></div>}
      <div className="flex items-center justify-between"><button className={button} disabled={loading || page <= 1} onClick={() => { setPage(n => n - 1); setSelected(null) }}>Previous</button><span className="text-sm">Page {page} of {pages}</span><button className={button} disabled={loading || !!error || page >= pages} onClick={() => { setPage(n => n + 1); setSelected(null) }}>Next</button></div>
      {selected && <section aria-labelledby="purchase-details-title" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]"><div className="flex justify-between gap-3"><h2 id="purchase-details-title" className="text-xl font-bold">Purchase details</h2><button className={button} onClick={() => setSelected(null)}>Close details</button></div><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[['Purchase ID', selected.id], ['User ID', selected.user_id], ['Provider', selected.provider], ['Order ID', selected.provider_order_id], ['Payment ID', selected.provider_payment_id], ['Status', selected.status]].map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-all">{value || '—'}</dd></div>)}</dl></section>}
    </div>
  </main>
}

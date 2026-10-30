'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'

type Purchase = {
    id: string
    provider: string
    provider_order_id: string | null
    provider_payment_id: string | null
    package_id: string | null
    package_key: string | null
    package_name: string | null
    amount_paise: number
    currency: string
    credits: number
    status: string
    created_at: string
  }

export default function BillingPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signedOut, setSignedOut] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPurchases() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          if (!cancelled) setSignedOut(true)
          return
        }

        const response = await fetch('/api/billing/purchases', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        })
        const result = await response.json().catch(() => null)
        if (!response.ok) throw new Error(result?.error || 'Unable to load payments.')
        if (!cancelled) setPurchases(result.purchases || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load payments.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPurchases()
    return () => { cancelled = true }
  }, [])

  const formatMoney = (paise: number, currency: string) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR' }).format(paise / 100)

  async function downloadReceipt(purchase: Purchase) {
    if (purchase.status !== 'completed' || downloadingId) return
    setReceiptError('')
    setDownloadingId(purchase.id)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) throw new Error('Please sign in again to download your receipt.')

      const response = await fetch(`/api/billing/receipt?purchaseId=${encodeURIComponent(purchase.id)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error || 'Unable to download this receipt. Please try again.')
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/pdf')) throw new Error('The receipt service returned an unexpected response.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `CVeat-Payment-Receipt-${purchase.id}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : 'Unable to download receipt.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-12 sm:px-6 dark:bg-[#0B1120] dark:text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Your account</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Billing &amp; Payments</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Review your Career Credit purchases and download payment receipts.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1B263B] dark:shadow-black/15">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-700/70">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Purchase history</h2>
            <Link href="/pricing" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700">Buy Credits →</Link>
          </div>

          {receiptError && (
            <div role="alert" className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-300">
              {receiptError}
              <button type="button" onClick={() => setReceiptError('')} className="ml-3 font-semibold underline">Dismiss</button>
            </div>
          )}

          {loading ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">Loading your purchases...</p>
          ) : signedOut ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300">Please sign in to view your payment history.</p>
              <Link href="/?auth=signin" className="mt-4 inline-block text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-300">Sign in →</Link>
            </div>
          ) : error ? (
            <p role="alert" className="px-6 py-12 text-center text-sm text-red-600 dark:text-red-300">{error}</p>
          ) : purchases.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-semibold text-slate-800 dark:text-slate-100">No purchases yet</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your Career Credit purchases will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-[#111C30] dark:text-slate-400">
                  <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
<th className="px-6 py-4 font-semibold">Package</th>
<th className="px-6 py-4 font-semibold">Credits</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="align-top text-slate-700 dark:text-slate-200">
                      <td className="whitespace-nowrap px-6 py-4">
  {new Date(purchase.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}
</td>
<td className="whitespace-nowrap px-6 py-4 font-semibold">
  {purchase.package_name?.trim() || 'Career Credits'}
</td>
<td className="px-6 py-4 font-semibold">{purchase.credits}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold">{formatMoney(purchase.amount_paise, purchase.currency)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${purchase.status === 'completed' ? 'bg-green-50 text-green-700 dark:bg-emerald-400/10 dark:text-emerald-300' : purchase.status === 'created' ? 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300'}`}>
                          {purchase.status === 'completed' ? 'Completed' : purchase.status === 'created' ? 'Pending' : purchase.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {purchase.status === 'completed' ? (
                          <button
                            type="button"
                            onClick={() => void downloadReceipt(purchase)}
                            disabled={downloadingId !== null}
                            className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-600 hover:text-white disabled:cursor-wait disabled:opacity-50 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200 dark:hover:bg-indigo-600 dark:hover:text-white"
                          >
                            {downloadingId === purchase.id ? 'Preparing PDF…' : '↓ Download PDF'}
                          </button>
                        ) : <span className="text-xs text-slate-400 dark:text-slate-400">Not available</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Downloadable documents are payment receipts, not GST tax invoices. Receipts are available for completed purchases with saved billing details. For assistance, contact support@cveat.in.</p>
      </div>
    </div>
  )
}

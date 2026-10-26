
'use client'

import { getAdminMfaHref } from '@/lib/admin-navigation'

import ExportExcelButton from '@/components/admin/ExportExcelButton'
import type { ExcelSheet } from '@/lib/exports/excel'
import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

type Summary = {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  estimatedAiCostInr: number
  revenueInr: number
  estimatedContributionInr: number
  contributionMarginPercent: number | null
  outstandingCredits: number
  freeCreditsIssued: number
}

type Feature = {
  feature: string
  requests: number
  inputTokens: number
  outputTokens: number
  estimatedCostInr: number
}

type Usage = {
  id: string
  feature: string
  model: string
  input_tokens: number
  output_tokens: number
  thinking_tokens: number
  estimated_cost_inr: number | null
  status: string
  created_at: string
}


type AtsRefundTracking = {
    completedTransactions: number
    refundedTransactions: number
    completedAiUsageRecords: number
    refundedAiUsageRecords: number
    linkedCompletedTransactions: number
    linkedRefundedTransactions: number
    completedAiCostInr: number
    refundedAiCostInr: number
    totalRecordedAtsAiCostInr: number
    averageCostPerLinkedCompletedReportInr: number | null
  }
  

type EconomicsData = {
  generatedAt: string
  summary: Summary
  features: Feature[]
  recentUsage: Usage[]
  warnings: string[]

atsRefundTracking: AtsRefundTracking

}

const currency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const number = (value: number) =>
  new Intl.NumberFormat('en-IN').format(value)

function MetricCard({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-bold text-slate-900">
        {value}
      </p>
      {note && (
        <p className="mt-2 text-xs text-slate-500">
          {note}
        </p>
      )}
    </div>
  )
}

export default function AiEconomicsPage() {
  const [data, setData] = useState<EconomicsData | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.access_token) {
          throw new Error(
            'Please log in with your admin account.'
          )
        }

        const response = await fetch(
          '/api/admin/ai-economics',
          {
            method: 'GET',
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
            cache: 'no-store',
          }
        )

        if (response.status === 403) {
          const errorResult = await response.json().catch(() => null)
        
          if (errorResult?.error === 'MFA_REQUIRED') {
            window.location.replace(getAdminMfaHref(window.location.pathname + window.location.search + window.location.hash))
            return
          }
        
          throw new Error(
            'Access denied. This dashboard is for admins only.'
          )
        }

        if (!response.ok) {
          throw new Error(
            'Unable to load AI Economics data.'
          )
        }

        const result =
          (await response.json()) as EconomicsData

        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setData(null)
          setError(
            err instanceof Error
              ? err.message
              : 'Something went wrong.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [refreshKey])


  const getEconomicsExcelSheets = async (): Promise<ExcelSheet[]> => {
    if (!data) {
      throw new Error('AI Economics data is not available')
    }

    const s = data.summary
    const a = data.atsRefundTracking

    return [
      {
        name: 'Financial Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Recorded Revenue (INR)', s.revenueInr],
          ['Modeled AI Cost (INR)', s.estimatedAiCostInr],
          ['Estimated Contribution (INR)', s.estimatedContributionInr],
          ['Contribution Margin (%)', s.contributionMarginPercent],
          ['AI Usage Records', s.totalRequests],
          ['Input Tokens', s.totalInputTokens],
          ['Output + Thinking Tokens', s.totalOutputTokens],
          ['Outstanding Credit Units', s.outstandingCredits],
          ['Free Credits Issued', s.freeCreditsIssued],
        ],
      },
      {
        name: 'ATS Refund Analysis',
        headers: ['Metric', 'Value'],
        rows: [
          ['Completed ATS Transactions', a.completedTransactions],
          ['Refunded ATS Transactions', a.refundedTransactions],
          ['Completed AI Usage Records', a.completedAiUsageRecords],
          ['Refunded AI Usage Records', a.refundedAiUsageRecords],
          ['Linked Completed Transactions', a.linkedCompletedTransactions],
          ['Linked Refunded Transactions', a.linkedRefundedTransactions],
          ['Completed ATS AI Cost (INR)', a.completedAiCostInr],
          ['Refunded ATS AI Cost (INR)', a.refundedAiCostInr],
          ['Total Recorded ATS AI Cost (INR)', a.totalRecordedAtsAiCostInr],
          [
            'Average Cost Per Linked Completed Report (INR)',
            a.averageCostPerLinkedCompletedReportInr,
          ],
        ],
      },
      {
        name: 'Feature Costs',
        headers: [
          'Feature',
          'Requests',
          'Input Tokens',
          'Output + Thinking Tokens',
          'Modeled Cost (INR)',
        ],
        rows: data.features.map((feature) => [
          feature.feature,
          feature.requests,
          feature.inputTokens,
          feature.outputTokens,
          feature.estimatedCostInr,
        ]),
      },
      {
        name: 'Recent AI Usage',
        headers: [
          'Date',
          'Feature',
          'Model',
          'Status',
          'Input Tokens',
          'Output Tokens',
          'Thinking Tokens',
          'Modeled Cost (INR)',
        ],
        rows: data.recentUsage.map((item) => [
          item.created_at,
          item.feature,
          item.model,
          item.status,
          item.input_tokens,
          item.output_tokens,
          item.thinking_tokens,
          item.estimated_cost_inr,
        ]),
      },
      {
        name: 'Reporting Notes',
        headers: ['Warning'],
        rows: data.warnings.map((warning) => [warning]),
      },
    ]
  }


  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Cveat Admin
            </p>
            <h1 className="mt-1 text-3xl font-extrabold">
              AI Economics
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              AI usage, modeled costs and credit economics
            </p>
          </div>

          <div className="flex gap-3">

<ExportExcelButton
  sheets={getEconomicsExcelSheets}
  fileName={`CVeat_AI_Economics_${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`}
  disabled={loading || !data}
/>

            
            <button
              type="button"
              onClick={() => setRefreshKey((v) => v + 1)}
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </header>

        {loading && (
          <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
            Loading financial data...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Recorded revenue"
                value={currency(data.summary.revenueInr)}
                note="Completed purchases only"
              />
              <MetricCard
                label="Modeled AI cost"
                value={currency(
                  data.summary.estimatedAiCostInr
                )}
                note="Paid-tier equivalent, not actual billing"
              />
              <MetricCard
                label="Estimated contribution"
                value={currency(
                  data.summary.estimatedContributionInr
                )}
                note="Before hosting, payment fees and taxes"
              />
              <MetricCard
                label="Contribution margin"
                value={
                  data.summary.contributionMarginPercent ===
                  null
                    ? 'N/A'
                    : `${data.summary.contributionMarginPercent.toFixed(1)}%`
                }
                note="N/A when revenue is zero"
              />
              <MetricCard
                label="AI usage records"
                value={number(data.summary.totalRequests)}
              />
              <MetricCard
                label="Input tokens"
                value={number(
                  data.summary.totalInputTokens
                )}
              />
              <MetricCard
                label="Output + thinking tokens"
                value={number(
                  data.summary.totalOutputTokens
                )}
              />
              <MetricCard
                label="Outstanding credit units"
                value={number(
                  data.summary.outstandingCredits
                )}
                note={`Trial credits issued: ${number(
                  data.summary.freeCreditsIssued
                )}`}
              />
            </section>


<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <div>
    <h2 className="text-xl font-bold">
      ATS Refund &amp; Cost Analysis
    </h2>
    <p className="mt-1 text-sm text-slate-500">
      Completed and refunded credit transactions,
      including modeled Gemini processing costs.
    </p>
  </div>

  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <MetricCard
      label="Completed ATS transactions"
      value={number(
        data.atsRefundTracking.completedTransactions
      )}
    />

    <MetricCard
      label="Refunded ATS transactions"
      value={number(
        data.atsRefundTracking.refundedTransactions
      )}
    />

    <MetricCard
      label="Completed ATS AI cost"
      value={currency(
        data.atsRefundTracking.completedAiCostInr
      )}
      note="Modeled cost linked to completed transactions"
    />

    <MetricCard
      label="Refunded ATS AI cost"
      value={currency(
        data.atsRefundTracking.refundedAiCostInr
      )}
      note="AI processing cost incurred despite credit refunds"
    />

    <MetricCard
      label="Average cost per linked completed report"
      value={
        data.atsRefundTracking
          .averageCostPerLinkedCompletedReportInr === null
          ? 'N/A'
          : currency(
              data.atsRefundTracking
                .averageCostPerLinkedCompletedReportInr
            )
      }
      note="Includes all recorded ATS processing costs, including refunds"
    />

    <MetricCard
      label="Refund share of ATS AI cost"
      value={
        data.atsRefundTracking.totalRecordedAtsAiCostInr > 0
          ? `${(
              (data.atsRefundTracking.refundedAiCostInr /
                data.atsRefundTracking
                  .totalRecordedAtsAiCostInr) *
              100
            ).toFixed(1)}%`
          : 'N/A'
      }
      note="Percentage of recorded ATS cost linked to refunds"
    />
  </div>

  <p className="mt-4 text-xs text-slate-500">
    {number(
      data.atsRefundTracking.completedAiUsageRecords
    )}{' '}
    recorded AI usage entries linked to{' '}
    {number(
      data.atsRefundTracking.linkedCompletedTransactions
    )}{' '}
    completed transactions. These counts may differ from
    total completed credit transactions.
  </p>
</section>


            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">
                Cost by AI feature
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">Feature</th>
                      <th className="p-3">Requests</th>
                      <th className="p-3">Input tokens</th>
                      <th className="p-3">
                        Output + thinking
                      </th>
                      <th className="p-3">Modeled cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.features.map((feature) => (
                      <tr
                        key={feature.feature}
                        className="border-b border-slate-100"
                      >
                        <td className="p-3 font-medium">
                          {feature.feature.replaceAll('_', ' ')}
                        </td>
                        <td className="p-3">
                          {number(feature.requests)}
                        </td>
                        <td className="p-3">
                          {number(feature.inputTokens)}
                        </td>
                        <td className="p-3">
                          {number(feature.outputTokens)}
                        </td>
                        <td className="p-3 font-semibold">
                          {currency(feature.estimatedCostInr)}
                        </td>
                      </tr>
                    ))}
                    {data.features.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-6 text-center text-slate-500"
                        >
                          No AI usage recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">
                Recent AI usage
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest 20 recorded API usage entries
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Feature</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentUsage.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100"
                      >
                        <td className="whitespace-nowrap p-3">
                          {new Date(
                            item.created_at
                          ).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3">
                          {item.feature.replaceAll('_', ' ')}
                        </td>
                        <td className="p-3">
                          {item.model}
                        </td>
                        <td className="p-3">
                          {item.status}
                        </td>
                        <td className="p-3 font-medium">
                          {item.estimated_cost_inr === null
                            ? 'Unpriced'
                            : currency(
                                Number(
                                  item.estimated_cost_inr
                                )
                              )}
                        </td>
                      </tr>
                    ))}
                    {data.recentUsage.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-6 text-center text-slate-500"
                        >
                          No recent usage available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-bold text-amber-950">
                Financial reporting notes
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-900">
                {data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>

            <p className="text-xs text-slate-500">
              Last updated:{' '}
              {new Date(
                data.generatedAt
              ).toLocaleString('en-IN')}
            </p>
          </>
        )}
      </div>
    </main>
  )
}

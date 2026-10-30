'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { HISTORY_LIMIT } from '@/lib/save-history'

type SavedCV = {
  id: string
  cv_title: string
  cv_data: unknown
  is_primary: boolean
  created_at: string
}
type SavedInterview = {
  id: string
  profession: string | null
  seniority: string | null
  experience: string | null
  score: number | null
  feedback_summary: string | null
  qa_transcript: unknown
  report_data: unknown
  created_at: string
}

type HistoryTab = 'cv' | 'interview'

function formatDate(date: string) {
  return new Date(date).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join('\n')
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${key.replace(/([A-Z])/g, ' $1')}: ${displayValue(item)}`)
    .join('\n')
  return ''
}

function ReportSection({ title, value }: { title: string, value: unknown }) {
  if (value == null || value === '') return null
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]">
      <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">{displayValue(value)}</div>
    </section>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<HistoryTab>('cv')
  const [historyItems, setHistoryItems] = useState<SavedCV[]>([])
  const [interviewItems, setInterviewItems] = useState<SavedInterview[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [selectedInterview, setSelectedInterview] = useState<SavedInterview | null>(null)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'interview') setActiveTab('interview')
  }, [])

  const fetchHistory = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/')
      return
    }
    const [cvResult, interviewResult] = await Promise.all([
      supabase.from('cv_history').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('interview_history').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
    ])
    if (cvResult.data) setHistoryItems(cvResult.data as SavedCV[])
    if (interviewResult.data) setInterviewItems(interviewResult.data as SavedInterview[])
    setErrorMessage([cvResult.error?.message, interviewResult.error?.message].filter(Boolean).join(' | '))
    setLoading(false)
  }

  useEffect(() => { void fetchHistory() }, [router])

  const handleRename = async (id: string) => {
    if (!newTitle.trim()) return
    const { error } = await supabase.from('cv_history').update({ cv_title: newTitle.trim() }).eq('id', id)
    if (error) { alert(`Failed to rename CV: ${error.message}`); return }
    setEditingId(null)
    setNewTitle('')
    await fetchHistory()
  }

  const handleSetPrimary = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error: clearError } = await supabase.from('cv_history').update({ is_primary: false }).eq('user_id', session.user.id)
    if (clearError) { alert(clearError.message); return }
    const { error } = await supabase.from('cv_history').update({ is_primary: true }).eq('id', id).eq('user_id', session.user.id)
    if (error) alert(`Failed to set primary CV: ${error.message}`)
    await fetchHistory()
  }

  const handleDeleteCV = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved CV?')) return
    const { error } = await supabase.from('cv_history').delete().eq('id', id)
    if (error) { alert(`Failed to delete CV: ${error.message}`); return }
    await fetchHistory()
  }

  const handleDeleteInterview = async (id: string) => {
    if (!confirm('Permanently delete this saved interview evaluation? This cannot be undone.')) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('interview_history').delete().eq('id', id).eq('user_id', session.user.id)
    if (error) { alert(`Failed to delete interview: ${error.message}`); return }
    setSelectedInterview(null)
    await fetchHistory()
  }

  const handleReDownload = async (item: SavedCV) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    sessionStorage.setItem(`cveate_resume_data_${session.user.id}`, JSON.stringify(item.cv_data))
    router.push('/dashboard?download=true')
  }

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-600 text-sm dark:bg-[#0B1120] dark:text-slate-300">Loading your history...</div>

  const report = selectedInterview?.report_data
  const reportObject = report && typeof report === 'object' && !Array.isArray(report) ? report as Record<string, unknown> : null
  const qa = Array.isArray(selectedInterview?.qa_transcript) ? selectedInterview.qa_transcript as Record<string, unknown>[] : []

  return (
    <main className="min-h-[calc(100vh-73px)] bg-white px-5 py-10 text-slate-900 sm:px-8 dark:bg-[#0B1120] dark:text-slate-100">
      <div className="mx-auto w-full max-w-5xl space-y-7">
        <header className="space-y-2">
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-300">← Back to Home</Link>
          <h1 className="text-3xl font-extrabold tracking-tight">My History</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Manage your saved CVs and interview evaluations in one place.</p>
        </header>

        <div role="group" aria-label="History categories" className="grid grid-cols-2 gap-3 sm:gap-5">
          <button type="button" aria-pressed={activeTab === 'cv'} onClick={() => { setActiveTab('cv'); setSelectedInterview(null) }}
            className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${activeTab === 'cv' ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-400/70 dark:bg-indigo-400/10' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1B263B] dark:hover:bg-[#26344D]'}`}>
            <span className="text-sm font-bold">CV History</span>
            <div className="mt-2 text-2xl font-extrabold">{historyItems.length}<span className="text-sm font-normal text-slate-500 dark:text-slate-400"> / {HISTORY_LIMIT}</span></div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Saved CVs</span>
          </button>
          <button type="button" aria-pressed={activeTab === 'interview'} onClick={() => setActiveTab('interview')}
            className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${activeTab === 'interview' ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-400/70 dark:bg-indigo-400/10' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1B263B] dark:hover:bg-[#26344D]'}`}>
            <span className="text-sm font-bold">Interview History</span>
            <div className="mt-2 text-2xl font-extrabold">{interviewItems.length}<span className="text-sm font-normal text-slate-500 dark:text-slate-400"> / {HISTORY_LIMIT}</span></div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Saved evaluations</span>
          </button>
        </div>

        <p className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs leading-6 text-slate-600 dark:border-indigo-400/20 dark:bg-indigo-400/5 dark:text-slate-300">Keep up to <strong>10 CVs and 10 interviews</strong>, with separate limits. When a category is full, saving another asks for confirmation before permanently replacing its oldest save. Cancelling keeps your existing saves.</p>

        {errorMessage && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-300">Unable to load all history: {errorMessage}</p>}

        {activeTab === 'cv' ? (
          <div className="space-y-3">
            {historyItems.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 p-10 text-center space-y-3 dark:border-slate-700">
                <p className="text-sm font-bold">No saved resumes found.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Go to your dashboard and save a CV to see it here.</p>
                <Link href="/dashboard" className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white">Go to Dashboard</Link>
              </div>
            ) : historyItems.map(item => (
              <article key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-[#1B263B] dark:shadow-black/15">
                <div className="space-y-2">
                  {editingId === item.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={item.cv_title}
                        className="rounded-lg border border-indigo-300 px-3 py-2 text-sm outline-none dark:bg-[#111C30] dark:text-slate-100 dark:focus:ring-2 dark:focus:ring-indigo-400 dark:border-indigo-400/50" />
                      <button onClick={() => void handleRename(item.id)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white cursor-pointer">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 cursor-pointer dark:text-slate-400">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold">{item.cv_title || 'Untitled CV'}</h2>
                      <button onClick={() => { setEditingId(item.id); setNewTitle(item.cv_title || '') }} className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer dark:text-indigo-300">Rename</button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">Saved {formatDate(item.created_at)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.is_primary ? <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200">Primary CV</span> : (
                    <button onClick={() => void handleSetPrimary(item.id)} title="Quick download shortcut for your primary CV"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:hover:bg-[#26344D]">Set as Primary</button>
                  )}
                  <button onClick={() => handleReDownload(item)} className="rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer dark:bg-indigo-400/10 dark:text-indigo-200 dark:hover:bg-indigo-400/20">Download PDF</button>
                  <button onClick={() => void handleDeleteCV(item.id)} aria-label={`Delete ${item.cv_title}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer dark:border-slate-700 dark:text-red-300 dark:hover:bg-red-400/15">Delete</button>
                </div>
              </article>
            ))}
          </div>
        ) : selectedInterview ? (
          <div className="space-y-4">
            <button onClick={() => setSelectedInterview(null)} className="text-sm font-semibold text-indigo-600 hover:underline cursor-pointer dark:text-indigo-300">← Back to Interview History</button>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-indigo-50 p-5 dark:border-slate-700 dark:bg-indigo-400/10">
              <div>
                <h2 className="text-xl font-bold">{selectedInterview.profession || 'Interview Evaluation'}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selectedInterview.seniority || selectedInterview.experience || 'Interview'} • {formatDate(selectedInterview.created_at)}</p>
              </div>
              <div className="text-right"><div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-200">{selectedInterview.score ?? '—'}/100</div><div className="text-xs text-slate-500 dark:text-slate-400">Overall score</div></div>
            </div>
            {reportObject ? (
              <>
                {Object.entries(reportObject).filter(([key]) => key !== 'overallScore' && key !== 'summary').map(([key, value]) => (
                  <ReportSection key={key} title={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} value={value} />
                ))}
                <ReportSection title="Summary" value={reportObject.summary ?? selectedInterview.feedback_summary} />
              </>
            ) : (
              <>
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">This interview was saved before complete reports were supported. Available details are shown below.</p>
                <ReportSection title="Feedback summary" value={selectedInterview.feedback_summary} />
              </>
            )}
            {qa.length > 0 && <section className="space-y-3">
              <h3 className="text-lg font-bold">Questions & Answers</h3>
              {qa.map((item, index) => <div key={index} className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <p className="mb-2 text-sm font-semibold">Q{index + 1}. {displayValue(item.question)}</p>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{displayValue(item.answer) || 'No answer provided'}</p>
              </div>)}
            </section>}
            <button onClick={() => void handleDeleteInterview(selectedInterview.id)} className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer dark:border-red-400/25 dark:text-red-300 dark:hover:bg-red-400/15">Delete Saved Interview</button>
          </div>
        ) : (
          <div className="space-y-3">
            {interviewItems.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 p-10 text-center space-y-3 dark:border-slate-700">
                <p className="text-sm font-bold">No saved interviews yet.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Complete an interview and select Save Interview to keep the evaluation here.</p>
                <Link href="/interview-prep" className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white">Start Interview Prep</Link>
              </div>
            ) : interviewItems.map(item => (
              <article key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-[#1B263B] dark:shadow-black/15">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold">{item.profession || 'Interview Evaluation'}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.seniority || item.experience || 'Interview'} • {formatDate(item.created_at)}</p>
                  {item.feedback_summary && <p className="max-w-xl line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{item.feedback_summary}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-200">{item.score ?? '—'}/100</span>
                  <button onClick={() => setSelectedInterview(item)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer">View Report</button>
                  <button onClick={() => void handleDeleteInterview(item.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer dark:border-red-400/25 dark:text-red-300 dark:hover:bg-red-400/15">Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

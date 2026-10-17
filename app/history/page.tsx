'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3>
      <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{displayValue(value)}</div>
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

  const handleReDownload = (item: SavedCV) => {
    sessionStorage.setItem('cveate_resume_data', JSON.stringify(item.cv_data))
    router.push('/dashboard?download=true')
  }

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-600 text-sm">Loading your history...</div>

  const report = selectedInterview?.report_data
  const reportObject = report && typeof report === 'object' && !Array.isArray(report) ? report as Record<string, unknown> : null
  const qa = Array.isArray(selectedInterview?.qa_transcript) ? selectedInterview.qa_transcript as Record<string, unknown>[] : []

  return (
    <main className="min-h-[calc(100vh-73px)] bg-white px-5 py-10 text-slate-900 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-7">
        <header className="space-y-2">
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline">← Back to Home</Link>
          <h1 className="text-3xl font-extrabold tracking-tight">My History</h1>
          <p className="text-sm text-slate-600">Manage your saved CVs and interview evaluations in one place.</p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          <button type="button" onClick={() => { setActiveTab('cv'); setSelectedInterview(null) }}
            className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${activeTab === 'cv' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
            <span className="text-sm font-bold">My History</span>
            <div className="mt-2 text-2xl font-extrabold">{historyItems.length}</div>
            <span className="text-xs text-slate-500">Saved resumes</span>
          </button>
          <button type="button" onClick={() => setActiveTab('interview')}
            className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${activeTab === 'interview' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
            <span className="text-sm font-bold">Interview History</span>
            <div className="mt-2 text-2xl font-extrabold">{interviewItems.length}</div>
            <span className="text-xs text-slate-500">Saved evaluations</span>
          </button>
        </div>

        {errorMessage && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load all history: {errorMessage}</p>}

        {activeTab === 'cv' ? (
          <div className="space-y-3">
            {historyItems.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 p-10 text-center space-y-3">
                <p className="text-sm font-bold">No saved resumes found.</p>
                <p className="text-xs text-slate-500">Go to your dashboard and save a CV to see it here.</p>
                <Link href="/dashboard" className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white">Go to Dashboard</Link>
              </div>
            ) : historyItems.map(item => (
              <article key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <div className="space-y-2">
                  {editingId === item.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={item.cv_title}
                        className="rounded-lg border border-indigo-300 px-3 py-2 text-sm outline-none" />
                      <button onClick={() => void handleRename(item.id)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white cursor-pointer">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 cursor-pointer">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold">{item.cv_title || 'Untitled CV'}</h2>
                      <button onClick={() => { setEditingId(item.id); setNewTitle(item.cv_title || '') }} className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer">Rename</button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Saved {formatDate(item.created_at)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.is_primary ? <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">Primary CV</span> : (
                    <button onClick={() => void handleSetPrimary(item.id)} title="Quick download shortcut for your primary CV"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer">Set as Primary</button>
                  )}
                  <button onClick={() => handleReDownload(item)} className="rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer">Download PDF</button>
                  <button onClick={() => void handleDeleteCV(item.id)} aria-label={`Delete ${item.cv_title}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer">Delete</button>
                </div>
              </article>
            ))}
          </div>
        ) : selectedInterview ? (
          <div className="space-y-4">
            <button onClick={() => setSelectedInterview(null)} className="text-sm font-semibold text-indigo-600 hover:underline cursor-pointer">← Back to Interview History</button>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-indigo-50 p-5">
              <div>
                <h2 className="text-xl font-bold">{selectedInterview.profession || 'Interview Evaluation'}</h2>
                <p className="mt-1 text-sm text-slate-600">{selectedInterview.seniority || selectedInterview.experience || 'Interview'} • {formatDate(selectedInterview.created_at)}</p>
              </div>
              <div className="text-right"><div className="text-2xl font-extrabold text-indigo-700">{selectedInterview.score ?? '—'}/100</div><div className="text-xs text-slate-500">Overall score</div></div>
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
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">This interview was saved before complete reports were supported. Available details are shown below.</p>
                <ReportSection title="Feedback summary" value={selectedInterview.feedback_summary} />
              </>
            )}
            {qa.length > 0 && <section className="space-y-3">
              <h3 className="text-lg font-bold">Questions & Answers</h3>
              {qa.map((item, index) => <div key={index} className="rounded-2xl border border-slate-200 p-5">
                <p className="mb-2 text-sm font-semibold">Q{index + 1}. {displayValue(item.question)}</p>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{displayValue(item.answer) || 'No answer provided'}</p>
              </div>)}
            </section>}
            <button onClick={() => void handleDeleteInterview(selectedInterview.id)} className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer">Delete Saved Interview</button>
          </div>
        ) : (
          <div className="space-y-3">
            {interviewItems.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 p-10 text-center space-y-3">
                <p className="text-sm font-bold">No saved interviews yet.</p>
                <p className="text-xs text-slate-500">Complete an interview and select Save Interview to keep the evaluation here.</p>
                <Link href="/interview-prep" className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white">Start Interview Prep</Link>
              </div>
            ) : interviewItems.map(item => (
              <article key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold">{item.profession || 'Interview Evaluation'}</h2>
                  <p className="text-xs text-slate-500">{item.seniority || item.experience || 'Interview'} • {formatDate(item.created_at)}</p>
                  {item.feedback_summary && <p className="max-w-xl line-clamp-2 text-xs leading-5 text-slate-600">{item.feedback_summary}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">{item.score ?? '—'}/100</span>
                  <button onClick={() => setSelectedInterview(item)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer">View Report</button>
                  <button onClick={() => void handleDeleteInterview(item.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer">Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HistoryPage() {
  const router = useRouter()
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')

  const fetchHistory = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/')
      return
    }

    const { data } = await supabase
      .from('cv_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (data) setHistoryItems(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchHistory()
  }, [router])

  const handleRename = async (id: string) => {
    if (!newTitle.trim()) return
    await supabase.from('cv_history').update({ cv_title: newTitle }).eq('id', id)
    setEditingId(null)
    setNewTitle('')
    fetchHistory()
  }

  const handleSetPrimary = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('cv_history').update({ is_primary: false }).eq('user_id', session.user.id)
    await supabase.from('cv_history').update({ is_primary: true }).eq('id', id)
    fetchHistory()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved CV?')) return

    const { error } = await supabase.from('cv_history').delete().eq('id', id)
    if (error) {
      alert('Failed to delete CV: ' + error.message)
      return
    }
    fetchHistory()
  }

  const handleReDownload = (item: any) => {
    sessionStorage.setItem('cveate_resume_data', JSON.stringify(item.cv_data))
    router.push('/dashboard?download=true')
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm">Loading your CV history...</div>
  }

  return (
    <div className="relative min-h-[calc(100vh-73px)] bg-slate-50 py-12 px-6 text-slate-900 flex flex-col justify-center overflow-hidden">
      <div className="relative z-10 mx-auto max-w-3xl w-full space-y-6">
        
        <div>
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline">
             Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2">CV History & Saves</h1>
          <p className="text-xs text-slate-600 mt-1">Manage saved resumes, rename titles, and set your primary CV for quick downloads.</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
          {historyItems.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm font-bold text-slate-700">No saved resumes found.</p>
              <p className="text-xs text-slate-500">Go to your dashboard and click 'Save CV to History' to store resumes here.</p>
              <Link href="/dashboard">
                <button className="mt-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer">
                  Go to Dashboard
                </button>
              </Link>
            </div>
          ) : (
            historyItems.map((item, index) => (
              <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4 ${index !== historyItems.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div className="space-y-1">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={newTitle} 
                        onChange={(e) => setNewTitle(e.target.value)} 
                        placeholder={item.cv_title}
                        className="border border-indigo-300 rounded-lg px-2.5 py-1 text-xs outline-none" 
                      />
                      <button onClick={() => handleRename(item.id)} className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-slate-500 text-xs cursor-pointer">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{item.cv_title}</h3>
                      <button onClick={() => { setEditingId(item.id); setNewTitle(item.cv_title); }} className="text-indigo-600 text-[11px] font-semibold hover:underline cursor-pointer">[Rename]</button>
                    </div>
                  )}
                  
                  <p className="text-[11px] text-slate-400">
                    Saved on: {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {item.is_primary ? (
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-bold text-indigo-700">Primary CV</span>
                  ) : (
                    <div className="relative group inline-block">
                      <button 
                        onClick={() => handleSetPrimary(item.id)} 
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Set as Primary
                      </button>
                      
                      {/* Hover Tooltip Dialog Box */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-xl shadow-xl text-center z-50 pointer-events-none">
                        Quick download shortcut for your primary CV.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                      </div>
                    </div>
                  )}

                  <button onClick={() => handleReDownload(item)} className="rounded-xl bg-indigo-50 text-indigo-600 px-4 py-2 text-xs font-semibold hover:bg-indigo-100 transition-all cursor-pointer">
                    Download PDF
                  </button>

                  <button 
                    onClick={() => handleDelete(item.id)} 
                    title="Delete CV"
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
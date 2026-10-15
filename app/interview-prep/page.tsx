'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { questionBank } from '@/data/questionBank'

export default function InterviewPrepPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedPosition, setSelectedPosition] = useState('Junior')

  const [questions, setQuestions] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [currentAnswer, setCurrentAnswer] = useState('')

  // 30 minutes total assessment timer (1800 seconds)
  const [timeLeft, setTimeLeft] = useState(1800)
  const [evaluating, setEvaluating] = useState(false)
  const [interviewResult, setInterviewResult] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const professionCategories = [
    { name: 'Coding & Software Development', tag: 'coding' },
    { name: 'UI/UX & Visual Designing', tag: 'designing' },
    { name: 'Product Management', tag: 'product' }
  ]

  const positionOptions = ['Internship', 'Junior', 'Intermediate', 'Senior', 'Team Lead', 'Manager', 'HOD']

  // Dotted Network Canvas Animation (Fixed positioning & rendering)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number

    const updateCanvasSize = () => {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1.5,
    }))

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.2 * (1 - dist / 130)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.fillStyle = 'rgba(99, 102, 241, 0.4)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  // 30-Minute Overall Assessment Timer & Auto-Submit
  useEffect(() => {
    if (questions.length === 0 || interviewResult || evaluating) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Auto-submit all answers when 30 mins expire
          evaluateInterviewTranscript(userAnswers)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [questions, interviewResult, evaluating, userAnswers])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (profileData) {
          setProfile(profileData)
          if (profileData.role === 'admin' || profileData.role === '`admin`') setIsAdmin(true)
        }
      }
      setAuthLoading(false)
    }
    checkUser()
  }, [])

  const handleCategorySelect = (categoryName: string) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'signin' }))
      return
    }

    const isOwnerOrAdmin = user?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL || profile?.role === 'admin' || profile?.role === '`admin`'
    const hasPaidPass = profile?.plan_name === 'Daily Pass' || profile?.plan_name === 'Monthly'

    if (!isOwnerOrAdmin && !hasPaidPass) {
      setIsPricingModalOpen(true)
      return
    }

    setSelectedCategory(categoryName)
    setIsWizardOpen(true)
  }

  const handleStartInterview = (e: React.FormEvent) => {
    e.preventDefault()
    setIsWizardOpen(false)

    const categoryPool = questionBank[selectedCategory] || questionBank['Coding & Software Development']
    const positionPool = categoryPool[selectedPosition] || categoryPool['Junior'] || ['Tell me about your background.']
    
    const shuffled = [...positionPool].sort(() => 0.5 - Math.random())
    const selected5 = shuffled.slice(0, 5)

    setQuestions(selected5)
    setCurrentIndex(0)
    setTimeLeft(1800) // Reset 30-min timer on start
    setUserAnswers(new Array(selected5.length).fill(''))
    setCurrentAnswer('')
  }

  const handleNextOrSkipQuestion = (isSkipped = false) => {
    const answerText = isSkipped ? '[Skipped]' : (currentAnswer.trim() || '[No Answer Provided]')
    const updatedAnswers = [...userAnswers]
    updatedAnswers[currentIndex] = answerText
    setUserAnswers(updatedAnswers)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentAnswer(updatedAnswers[currentIndex + 1] === '[Skipped]' ? '' : (updatedAnswers[currentIndex + 1] || ''))
    } else {
      evaluateInterviewTranscript(updatedAnswers)
    }
  }

  const evaluateInterviewTranscript = async (finalAnswers: string[]) => {
    setEvaluating(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/evaluate-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          category: selectedCategory,
          seniority: selectedPosition,
          questions,
          answers: finalAnswers
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Evaluation failed.')
      setInterviewResult(data)
    } catch (err: any) {
      alert(err.message || 'Failed to evaluate.')
    } finally {
      setEvaluating(false)
    }
  }

  const handleSaveInterview = async () => {
    if (!user || !interviewResult) return
    setSaving(true)
    try {
      const { error } = await supabase.from('interview_history').insert({
        user_id: user.id,
        profession: selectedCategory,
        seniority: selectedPosition,
        experience: `${selectedPosition} Level`,
        score: interviewResult.overallScore,
        feedback_summary: interviewResult.summary,
        qa_transcript: questions.map((q, idx) => ({ question: q, answer: userAnswers[idx] }))
      })
      if (error) throw error
      setSavedSuccess(true)
    } catch (err: any) {
      alert(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) return <div className="h-screen w-screen flex items-center justify-center text-slate-600 bg-slate-50">Verifying session...</div>

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-50 overflow-hidden flex flex-col justify-center items-center pt-16 px-6">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full opacity-60 z-0" />

      <style jsx>{`
        @keyframes siriPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 30px rgba(99, 102, 241, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        .siri-orb { animation: siriPulse 2.8s infinite cubic-bezier(0.4, 0, 0.6, 1); }
        @keyframes shimmerBar {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .loading-bar {
          background: linear-gradient(90deg, #e0e7ff 0%, #6366f1 50%, #e0e7ff 100%);
          background-size: 200% 100%;
          animation: shimmerBar 1.8s infinite linear;
        }
      `}</style>

      <div className="max-w-3xl w-full space-y-4 relative z-10 my-auto">
        {(questions.length > 0 || interviewResult) && !evaluating && (
          <div>
            <button
              onClick={() => { setQuestions([]); setInterviewResult(null); setSelectedCategory(''); }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
            >
              ← Back to Categories
            </button>
          </div>
        )}

        {questions.length === 0 && !interviewResult && (
          <div className="space-y-6 text-center">
            <div className="space-y-2 max-w-xl mx-auto">
              <span className="inline-block rounded-full bg-indigo-50 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 border border-indigo-100">
                Structured Assessment
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Master Your Interview with <span className="text-indigo-600">Timed Assessments</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
                Select your target profession category to begin a 30-minute position-specific assessment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
              {professionCategories.map((cat) => (
                <button
                  key={cat.tag}
                  onClick={() => handleCategorySelect(cat.name)}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm hover:border-indigo-600 hover:shadow-md transition-all text-left space-y-1 cursor-pointer"
                >
                  <h4 className="text-xs font-bold text-slate-900">{cat.name}</h4>
                  <p className="text-[10px] text-slate-500">Click to configure & start</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {questions.length > 0 && !interviewResult && !evaluating && (
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                Q{currentIndex + 1} of {questions.length} ({selectedCategory})
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">Position: {selectedPosition}</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                  ⏱️ {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)} remaining
                </span>
              </div>
            </div>

            <h2 className="text-base font-bold text-slate-900 leading-snug">{questions[currentIndex]}</h2>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Your Answer</label>
              <textarea
                rows={5}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your detailed answer here..."
                className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => handleNextOrSkipQuestion(true)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Skip Question
              </button>
              <button
                onClick={() => handleNextOrSkipQuestion(false)}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer"
              >
                {currentIndex < questions.length - 1 ? 'Next Question ->' : 'Submit & Get Evaluation'}
              </button>
            </div>
          </div>
        )}

        {evaluating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-2xl space-y-6 max-w-md w-full mx-auto">
              <div className="relative flex items-center justify-center py-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 siri-orb flex items-center justify-center shadow-2xl">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Evaluating your assessment responses...</h2>
                  <p className="text-xs text-slate-500">Scoring technical depth, communication, and overall suitability.</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="loading-bar h-2 rounded-full w-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {interviewResult && (
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Assessment Evaluation Report</h2>
                <p className="text-[11px] text-slate-500">Role: {selectedCategory} ({selectedPosition})</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-indigo-600">{interviewResult.overallScore}/10</span>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Overall Score</span>
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3.5 space-y-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">Performance Summary</h4>
              <p className="text-xs text-slate-700 leading-relaxed">{interviewResult.summary}</p>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Question Breakdown</h3>
              <div className="space-y-2.5">
                {interviewResult.breakdown?.map((item: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-3 space-y-1 bg-slate-50">
                    <p className="text-xs font-bold text-slate-900">Q{i + 1}: {questions[i]}</p>
                    <p className="text-[11px] text-slate-600"><strong>Your Answer:</strong> {userAnswers[i]}</p>
                    <p className="text-[11px] text-indigo-600"><strong>Feedback:</strong> {item.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => { setInterviewResult(null); setQuestions([]); setSelectedCategory(''); }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Start New Assessment
              </button>
              
              <button
                onClick={handleSaveInterview}
                disabled={saving || savedSuccess}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer disabled:opacity-50"
              >
                {savedSuccess ? 'Saved to History!' : (saving ? 'Saving...' : 'Save Report to History')}
              </button>
            </div>
          </div>
        )}

      </div>

      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 relative text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Configure: {selectedCategory}</h3>
              <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleStartInterview} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Target Position / Seniority *</label>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white"
                >
                  {positionOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer"
                >
                  Start 30-Min Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 text-center space-y-3 text-slate-900">
            <h3 className="text-base font-extrabold text-slate-900">Pass Required for Assessments</h3>
            <p className="text-xs text-slate-500">Assessments are included with our Daily and Monthly Passes. Upgrade your plan to unlock full access.</p>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/pricing">
                <button className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer">View Pricing Plans</button>
              </Link>
              <button onClick={() => setIsPricingModalOpen(false)} className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
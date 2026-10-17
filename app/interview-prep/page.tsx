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
  const evaluationStartedRef = useRef(false)
const evaluationFinishedRef = useRef(false)

const [activeEvaluationId, setActiveEvaluationId] =
  useState<string | null>(null)

const [evaluationStartedAt, setEvaluationStartedAt] =
  useState<number | null>(null)

const [evaluationElapsed, setEvaluationElapsed] = useState(0)
const [evaluationNotice, setEvaluationNotice] = useState('')

const formatEvaluationTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

const clearPendingEvaluation = (userId: string) => {
  sessionStorage.removeItem(`cveate_interview_pending_${userId}`)
  sessionStorage.removeItem(`cveate_interview_started_${userId}`)
  sessionStorage.removeItem(`cveate_interview_context_${userId}`)
  setActiveEvaluationId(null)
}

const finishEvaluation = (
  userId: string,
  report?: any,
  refunded = false
) => {
  if (evaluationFinishedRef.current) return

  evaluationFinishedRef.current = true
  evaluationStartedRef.current = false

  if (report) setInterviewResult(report)

  setEvaluating(false)
  setEvaluationNotice('')

  // Preserve the evaluation ID and context after success
  // so the completed report can be recovered on refresh.
  // Clear temporary data only when the evaluation was refunded.
  if (refunded) {
    clearPendingEvaluation(userId)

    alert(
      'The evaluation was interrupted. Its reserved Career Credit was refunded.'
    )
  }
}

  const professionCategories = [
    { name: 'Coding & Software Development', tag: 'coding', icon: <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> },
    { name: 'UI/UX & Visual Designing', tag: 'designing', icon: <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg> },
    { name: 'Product Management', tag: 'product', icon: <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
    { name: 'Finance', tag: 'finance', icon: <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { name: 'Graphic Designing', tag: 'graphicdesigning', icon: <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { name: 'Video Editing', tag: 'videoediting', icon: <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
    { name: 'HR (Human Resources)', tag: 'hr', icon: <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { name: 'Data Analytics', tag: 'dataanalytics', icon: <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> }
  ]

  const positionOptions = ['Internship', 'Junior', 'Intermediate', 'Senior', 'Team Lead', 'Manager', 'HOD']


  // Dotted Network Canvas Animation
  useEffect(() => {
    // Wait until authentication finishes and the canvas is mounted
    if (authLoading) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let isActive = true

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      // Match the canvas drawing dimensions to its actual size
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)

      // Keep drawing coordinates in CSS pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    updateSize()

    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1.5,
    }))

    const render = () => {
      if (!isActive) return

      const width = canvas.clientWidth
      const height = canvas.clientHeight

      ctx.clearRect(0, 0, width, height)

      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 120) {
            ctx.strokeStyle =
              `rgba(99, 102, 241, ${0.15 * (1 - dist / 120)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Move and draw particles
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        ctx.fillStyle = 'rgba(99, 102, 241, 0.3)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    // Keep canvas dimensions synchronized with the container
    const resizeObserver = new ResizeObserver(() => {
      updateSize()
    })

    resizeObserver.observe(canvas)

    window.addEventListener('resize', updateSize)

    return () => {
      isActive = false
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [authLoading])


  // 30-Minute Overall Assessment Timer & Auto-Submit
  useEffect(() => {
    if (questions.length === 0 || interviewResult || evaluating) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
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
  // Live elapsed time, including after refresh.
useEffect(() => {
  if (!evaluating || evaluationStartedAt === null) return

  const tick = () => {
    setEvaluationElapsed(
      Math.max(
        0,
        Math.floor((Date.now() - evaluationStartedAt) / 1000)
      )
    )
  }

  tick()

  const timer = setInterval(tick, 1000)
  return () => clearInterval(timer)
}, [evaluating, evaluationStartedAt])

// Restore the pending evaluation and its interview context.
useEffect(() => {
  if (authLoading || !user) return

  const userId = user.id
  const requestId = sessionStorage.getItem(
    `cveate_interview_pending_${userId}`
  )

  if (!requestId) return

  const contextText = sessionStorage.getItem(
    `cveate_interview_context_${userId}`
  )

  if (contextText) {
    try {
      const context = JSON.parse(contextText)

      if (
        Array.isArray(context.questions) &&
        Array.isArray(context.answers)
      ) {
        setSelectedCategory(context.category || '')
        setSelectedPosition(context.seniority || 'Junior')
        setQuestions(context.questions)
        setUserAnswers(context.answers)
      }
    } catch (error) {
      console.error('Unable to restore interview context:', error)
    }
  }

  const storedStart = Number(
    sessionStorage.getItem(
      `cveate_interview_started_${userId}`
    )
  )

  evaluationStartedRef.current = true
  evaluationFinishedRef.current = false

  setEvaluationStartedAt(
    Number.isFinite(storedStart) && storedStart > 0
      ? storedStart
      : Date.now()
  )

  setActiveEvaluationId(requestId)
  setEvaluating(true)
}, [authLoading, user?.id])

// Poll the same request ID; never launch Gemini again on refresh.
useEffect(() => {
  if (!user || !activeEvaluationId || !evaluating) return

  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const userId = user.id
  const requestId = activeEvaluationId

  const checkStatus = async () => {
    if (cancelled || evaluationFinishedRef.current) return

    try {
      const { data: sessionData } =
        await supabase.auth.getSession()

      if (!sessionData.session || cancelled) return

      const response = await fetch(
        `/api/evaluate-interview?requestId=${encodeURIComponent(requestId)}`,
        {
          headers: {
            Authorization:
              `Bearer ${sessionData.session.access_token}`,
          },
          cache: 'no-store',
        }
      )

      if (cancelled || evaluationFinishedRef.current) return

      const data = await response.json()

      if (data.status === 'completed' && data.report) {
        finishEvaluation(userId, data.report)
        return
      }

      if (data.status === 'refunded') {
        finishEvaluation(userId, undefined, true)
        return
      }

      if (response.status === 404) {
        const started = Number(
          sessionStorage.getItem(
            `cveate_interview_started_${userId}`
          )
        ) || Date.now()

        if (Date.now() - started > 30000) {
          setEvaluationNotice(
            'We could not locate your evaluation yet. Your request details have been preserved. Please check your connection or try refreshing the page.'
          )

          // Keep the original request ID and interview context.
          // A temporary 404 must not erase recovery information.
          // Continue checking instead of starting another evaluation.
        }
      } else if (!response.ok && response.status !== 202) {
        setEvaluationNotice(
          'Checking your evaluation status. Your request is saved for recovery.'
        )
      }
    } catch (error) {
      console.error('Interview recovery check failed:', error)

      if (!cancelled) {
        setEvaluationNotice(
          'Connection interrupted. We will keep checking for your report.'
        )
      }
    }

    if (!cancelled && !evaluationFinishedRef.current) {
      timer = setTimeout(checkStatus, 5000)
    }
  }

  void checkStatus()

  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}, [activeEvaluationId, evaluating, user?.id])

  const handleCategorySelect = async (categoryName: string) => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent('open-auth-modal', { detail: 'signin' })
      )
      return
    }

    const { data: currentProfile, error } = await supabase
      .from('profiles')
      .select('role, career_credits')
      .eq('id', user.id)
      .single()

    if (error || !currentProfile) {
      alert('Unable to verify your Career Credits. Please try again.')
      return
    }

    setProfile((previous: any) => ({
      ...previous,
      ...currentProfile
    }))

    const isAdmin = currentProfile.role === 'admin'
    const hasCredits = currentProfile.career_credits > 0

    if (!isAdmin && !hasCredits) {
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
    setTimeLeft(1800)
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

  const evaluateInterviewTranscript = async (
    finalAnswers: string[]
  ) => {
    if (evaluationStartedRef.current || !user) return

    evaluationStartedRef.current = true
    evaluationFinishedRef.current = false

    const userId = user.id
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()

    const completedAnswers = questions.map(
      (_, index) =>
        finalAnswers[index] || '[No Answer Provided]'
    )

    const context = {
      category: selectedCategory,
      seniority: selectedPosition,
      questions,
      answers: completedAnswers,
    }

    sessionStorage.setItem(
      `cveate_interview_pending_${userId}`,
      requestId
    )

    sessionStorage.setItem(
      `cveate_interview_started_${userId}`,
      String(startedAt)
    )

    sessionStorage.setItem(
      `cveate_interview_context_${userId}`,
      JSON.stringify(context)
    )

    setUserAnswers(completedAnswers)
    setEvaluationStartedAt(startedAt)
    setEvaluationElapsed(0)
    setEvaluationNotice('')
    setActiveEvaluationId(requestId)
    setEvaluating(true)

    try {
      const { data: { session } } =
        await supabase.auth.getSession()

      if (!session) {
        throw new Error('Please sign in again.')
      }

      const response = await fetch('/api/evaluate-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          requestId,
          ...context,
        }),
      })

      const data = await response.json()

      if (evaluationFinishedRef.current) return

      if (data.status === 'completed' && data.report) {
        finishEvaluation(userId, data.report)
        return
      }

      if (response.status === 202) {
        return
      }

      if (response.status === 402 || data.insufficientCredits) {
        evaluationFinishedRef.current = true
        evaluationStartedRef.current = false
        setEvaluating(false)
        clearPendingEvaluation(userId)
        setIsPricingModalOpen(true)
        return
      }

      if (data.status === 'refunded') {
        finishEvaluation(userId, undefined, true)
        return
      }

      if (!response.ok) {
        setEvaluationNotice(
          data.error ||
          'Checking whether your evaluation was completed or refunded.'
        )
      }
    } catch (error) {
      console.error('Interview evaluation request failed:', error)

      // A network error does not prove Gemini stopped.
      // Keep the request ID and continue checking.
      setEvaluationNotice(
        'Connection interrupted. Checking whether your report was saved...'
      )
    }
  }

  const handleSaveInterview = async () => {
    if (!user || !interviewResult || saving || savedSuccess) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('interview_history')
        .insert({
          user_id: user.id,
          profession: selectedCategory,
          seniority: selectedPosition,
          experience: `${selectedPosition} Level`,
          score: interviewResult.overallScore,
          feedback_summary: interviewResult.summary,
          qa_transcript: questions.map((q, idx) => ({
            question: q,
            answer: userAnswers[idx]
          }))
        })

      if (error) throw error

      // Permanent history was saved successfully.
      setSavedSuccess(true)

      // Clear browser recovery information only after saving.
      clearPendingEvaluation(user.id)

      // Stop tracking the completed temporary evaluation.
      setActiveEvaluationId(null)

    } catch (err: any) {
      // Keep the report and recovery information if saving fails.
      alert(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-slate-600 bg-slate-50">Verifying session...</div>

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6 text-slate-900 flex flex-col justify-center relative overflow-hidden">
      {/* Dotted Network Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none h-full w-full opacity-60 z-0"
      />

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
          @keyframes cveateScanActivity {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(300%);
  }
}
      `}</style>

      <div className="mx-auto max-w-6xl w-full space-y-12 relative z-10">

        {/* Header */}
        {(questions.length > 0 || interviewResult) && !evaluating ? (
          <div>
            <button
              onClick={() => { setQuestions([]); setInterviewResult(null); setSelectedCategory(''); }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
            >
              ← Back to Categories
            </button>
          </div>
        ) : questions.length === 0 && !interviewResult && (
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 border border-indigo-100">
              Structured Assessment
            </span>
            {/* Heading updated so "Timed Assessments" sits on two rows */}
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-slate-900 leading-tight">
              Master Your Interview with <br />
              <span className="text-indigo-600">Timed Assessments</span>
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
              Select your target profession category to begin a 30-minute position-specific assessment.
            </p>
          </div>
        )}

        {/* Categories Grid */}
        {questions.length === 0 && !interviewResult && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-stretch pt-2">
            {professionCategories.map((cat) => (
              <button
                key={cat.tag}
                onClick={() => handleCategorySelect(cat.name)}
                className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-indigo-600 hover:shadow-md transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer group"
              >
                <div className="space-y-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {cat.icon}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {cat.name}
                  </h4>
                </div>
                <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                  Configure & Start →
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Active Assessment Question View */}
        {questions.length > 0 && !interviewResult && !evaluating && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200 space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">
                Question {currentIndex + 1} of {questions.length} ({selectedCategory})
              </span>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500">Position: {selectedPosition}</span>
                <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                  ⏱️ {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)} remaining
                </span>
              </div>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">{questions[currentIndex]}</h2>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Your Answer</label>
              <textarea
                rows={6}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your detailed answer here..."
                className="w-full rounded-2xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => handleNextOrSkipQuestion(true)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Skip Question
              </button>
              <button
                onClick={() => handleNextOrSkipQuestion(false)}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer"
              >
                {currentIndex < questions.length - 1 ? 'Next Question ->' : 'Submit & Get Evaluation'}
              </button>
            </div>
          </div>
        )}

        {/* Evaluating Modal - same design as ATS Checker */}
{evaluating && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6 overflow-y-auto">
    <div className="bg-white rounded-3xl p-8 sm:p-12 text-center text-slate-900 shadow-2xl space-y-7 max-w-3xl w-full mx-auto">

      <div className="flex justify-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-30" />

          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-lg shadow-indigo-200">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h4M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 3v5h5"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-900">
          CVeate AI is evaluating your interview
        </h2>

        <p className="text-sm text-slate-500">
          We're reviewing your answers, technical accuracy,
          communication, and overall performance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
          <p className="text-xs font-semibold text-indigo-500 mb-2">
            Time Elapsed
          </p>

          <p className="text-2xl font-black text-indigo-700 tabular-nums">
            {formatEvaluationTime(evaluationElapsed)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">
            Estimated Total Wait
          </p>

          <p className="text-2xl font-black text-slate-800">
            2-3 min
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-500">
            Evaluation in progress
          </span>

          <span className="text-indigo-600">
            Processing...
          </span>
        </div>

        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-indigo-100">
          <div
            className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-400"
            style={{
              animation:
                'cveateScanActivity 2s ease-in-out infinite',
            }}
          />
        </div>

        <p className="text-xs text-slate-400">
          Activity indicator - not an exact completion percentage
        </p>
      </div>

      {evaluationNotice && (
        <p
          role="status"
          className="text-xs text-amber-700 bg-amber-50 rounded-xl px-4 py-3"
        >
          {evaluationNotice}
        </p>
      )}

      <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100 p-5 text-left space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />

          <span className="text-sm font-bold text-indigo-800">
            {evaluationElapsed < 180
              ? 'AI evaluation is running'
              : evaluationElapsed < 300
                ? 'Still evaluating your answers'
                : 'Taking longer than expected'}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-slate-600">
          {evaluationElapsed < 180
            ? 'Your interview report will appear automatically when ready. This may take 2-3 minutes.'
            : evaluationElapsed < 300
              ? 'Detailed evaluations may take a little longer. We are checking for your completed report.'
              : 'We are continuing to check for your report. Please keep this page open if possible.'}
        </p>
      </div>

      <p className="text-xs text-slate-400">
        If you refresh, we will attempt to recover your evaluation
        using the same request ID.
      </p>

    </div>
  </div>
)}

        {/* Evaluation Report Result View */}
        {interviewResult && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200 space-y-6 max-w-3xl mx-auto max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Assessment Evaluation Report</h2>
                <p className="text-xs text-slate-500 mt-0.5">Role: {selectedCategory} ({selectedPosition})</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-indigo-600">{interviewResult.overallScore}/10</span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Score</span>
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">Performance Summary</h4>
              <p className="text-xs text-slate-700 leading-relaxed">{interviewResult.summary}</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Question Breakdown</h3>
              <div className="space-y-4">
                {interviewResult.breakdown?.map((item: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-4 space-y-2 bg-slate-50">
                    <p className="text-xs font-bold text-slate-900">Q{i + 1}: {questions[i]}</p>
                    <p className="text-xs text-slate-600"><strong>Your Answer:</strong> {userAnswers[i]}</p>
                    <p className="text-xs text-indigo-600"><strong>Feedback:</strong> {item.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => { setInterviewResult(null); setQuestions([]); setSelectedCategory(''); }}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Start New Assessment
              </button>

              <button
                onClick={handleSaveInterview}
                disabled={saving || savedSuccess}
                className="rounded-xl bg-indigo-600 px-8 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer disabled:opacity-50"
              >
                {savedSuccess ? 'Saved to History!' : (saving ? 'Saving...' : 'Save Report to History')}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Configuration Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-slate-900">Configure: {selectedCategory}</h3>
              <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleStartInterview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Target Position / Seniority *</label>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white"
                >
                  {positionOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer"
                >
                  Start 30-Min Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pricing / Pass Modal */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 text-center space-y-4 text-slate-900">
            <h3 className="text-xl font-extrabold text-slate-900">Pass Required for Assessments</h3>
            <p className="text-xs text-slate-500">Assessments are included with our Daily and Monthly Passes. Upgrade your plan to unlock full access.</p>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/pricing">
                <button className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer">View Pricing Plans</button>
              </Link>
              <button onClick={() => setIsPricingModalOpen(false)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
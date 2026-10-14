'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function InterviewPrepPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Auth Modal State
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Pricing Modal for Freemium Users
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)

  // Wizard & Interview Flow State
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [seniorityLevel, setSeniorityLevel] = useState('Junior')
  const [jobDescription, setJobDescription] = useState('')

  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  
  const [evaluating, setEvaluating] = useState(false)
  const [interviewResult, setInterviewResult] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const professionCategories = [
    { name: 'Coding & Software Development', tag: 'coding', icon: '💻' },
    { name: 'UI/UX & Visual Designing', tag: 'designing', icon: '🎨' },
    { name: 'Finance & Banking', tag: 'finance', icon: '📈' },
    { name: 'Product Management', tag: 'product', icon: '🚀' },
    { name: 'Digital Marketing & Growth', tag: 'marketing', icon: '📣' },
    { name: 'Data Science & AI', tag: 'datascience', icon: '📊' }
  ]

  const seniorityOptions = ['Internship', 'Junior', 'Intermediate', 'Senior', 'Team Lead', 'Manager', 'HOD']

  // Canvas Network Animation Effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let running = true

    const initCanvas = () => {
      if (!running || !canvas) return
      const width = window.innerWidth || 1920
      const height = window.innerHeight || 1080
      const dpr = window.devicePixelRatio || 1

      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const particles = Array.from({ length: 40 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 1.5 + 1,
      }))

      const animate = () => {
        if (!running) return
        ctx.clearRect(0, 0, width, height)

        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x
            const dy = particles[i].y - particles[j].y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 110) {
              ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - dist / 110)})`
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
          if (p.x < 0 || p.x > width) p.vx *= -1
          if (p.y < 0 || p.y > height) p.vy *= -1

          ctx.fillStyle = 'rgba(99, 102, 241, 0.3)'
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()
        })

        animationFrameId = requestAnimationFrame(animate)
      }

      animate()
    }

    const timer = setTimeout(initCanvas, 50)
    const handleResize = () => { initCanvas() }
    window.addEventListener('resize', handleResize)

    return () => {
      running = false
      clearTimeout(timer)
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Check Session & Admin Privilege
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        const OWNER_EMAIL = 'yaman.kashyap@gmail.com'
        if (session.user.email === OWNER_EMAIL) {
          setIsAdmin(true)
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileData) setProfile(profileData)
      }
      setAuthLoading(false)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user?.email === 'yaman.kashyap@gmail.com') setIsAdmin(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleCategorySelect = (categoryName: string) => {
    if (!user) {
      setAuthMode('signin')
      setIsAuthOpen(true)
      return
    }

    // Check pass or admin privilege
    const hasPaidPass = profile?.plan_name === 'Daily Pass' || profile?.plan_name === 'Monthly'
    if (!isAdmin && !hasPaidPass) {
      setIsPricingModalOpen(true)
      return
    }

    setSelectedCategory(categoryName)
    setIsWizardOpen(true)
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (authMode === 'signup') {
        if (!agreeTerms) throw new Error('You must agree to the terms and conditions.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, contact_number: contactNumber } }
        })
        if (error) throw error
        setSuccessMessage('Account created successfully! Please sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setSuccessMessage('Signed in successfully!')
        setTimeout(() => {
          setIsAuthOpen(false)
          window.location.reload()
        }, 800)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  // Generate 5 Questions via Gemini API backend
  const handleStartInterviewQuestions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!experienceYears) {
      alert('Please specify your years of experience.')
      return
    }

    setIsWizardOpen(false)
    setGenerating(true)

    try {
      const res = await fetch('/api/generate-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          seniority: seniorityLevel,
          experience: experienceYears,
          jobDescription: jobDescription.trim() || 'General industry standard expectations'
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate interview questions.')

      setQuestions(data.questions || [])
      setCurrentIndex(0)
      setUserAnswers(new Array(data.questions.length).fill(''))
      setCurrentAnswer('')
    } catch (err: any) {
      alert(err.message || 'Error communicating with AI backend.')
    } finally {
      setGenerating(false)
    }
  }

  const handleNextOrSkipQuestion = (isSkipped = false) => {
    const updatedAnswers = [...userAnswers]
    updatedAnswers[currentIndex] = isSkipped ? '[Skipped]' : currentAnswer
    setUserAnswers(updatedAnswers)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentAnswer(updatedAnswers[currentIndex + 1] === '[Skipped]' ? '' : updatedAnswers[currentIndex + 1])
    } else {
      // Finished all 5 questions -> Submit transcript to Gemini for feedback
      evaluateInterviewTranscript(updatedAnswers)
    }
  }

  const evaluateInterviewTranscript = async (finalAnswers: string[]) => {
    setEvaluating(true)
    try {
      const res = await fetch('/api/evaluate-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          seniority: seniorityLevel,
          experience: experienceYears,
          questions,
          answers: finalAnswers
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Evaluation failed.')

      setInterviewResult(data)
    } catch (err: any) {
      alert(err.message || 'Failed to evaluate interview answers.')
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
        seniority: seniorityLevel,
        experience: experienceYears,
        score: interviewResult.overallScore,
        feedback_summary: interviewResult.summary,
        qa_transcript: questions.map((q, idx) => ({
          question: q,
          answer: userAnswers[idx]
        }))
      })

      if (error) throw error
      setSavedSuccess(true)
    } catch (err: any) {
      alert(err.message || 'Failed to save interview history.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Verifying session...</div>
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 relative overflow-hidden flex flex-col">
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-60" />

      {/* Unified Global Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm text-slate-900 border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-black tracking-tight text-indigo-600">
            CVeat
          </Link>
          
          <div className="hidden md:flex items-center gap-6 ml-auto mr-6 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
            <Link href="/blog" className="hover:text-indigo-600 transition-colors">Blog</Link>
            <Link href="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
            <Link href="/interview-prep" className="text-indigo-600 font-bold transition-colors">Interview Prep</Link>
            <Link href="/ats-checker" className="hover:text-indigo-600 transition-colors">ATS Checker</Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100">
                {profile?.plan_name || 'Freemium'} {isAdmin ? '(Admin)' : ''}
              </span>
            ) : (
              <button
                onClick={() => { setAuthMode('signin'); setIsAuthOpen(true); }}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-grow z-10 max-w-6xl mx-auto px-6 py-16 w-full">

        {!generating && !questions.length && !interviewResult && (
          <div className="space-y-16">
            {/* Hero Section */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 border border-indigo-100">
                AI Career Companion
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl sm:leading-tight">
                Master Your Next Interview with <span className="text-indigo-600">AI Mock Training</span>
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Select your profession category below to start a tailored 5-question interview session complete with instant AI scoring and recruiter feedback.
              </p>
            </div>

            {/* Profession Category Tags Grid */}
            <div className="space-y-6">
              <h3 className="text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                Select a Profession Category to Begin
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {professionCategories.map((cat) => (
                  <button
                    key={cat.tag}
                    onClick={() => handleCategorySelect(cat.name)}
                    className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-600 hover:shadow-md transition-all text-left flex items-center gap-4 cursor-pointer"
                  >
                    <span className="text-3xl p-3 rounded-xl bg-indigo-50 group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {cat.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">Click to configure preparation</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generating Loader */}
        {generating && (
          <div className="text-center py-24 space-y-6">
            <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto text-xl font-bold animate-spin">
              AI
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Curating Your Custom Interview Questions...</h2>
            <p className="text-xs text-slate-500">Gemini AI is analyzing your experience and job description.</p>
          </div>
        )}

        {/* 5-Question Interview Flow */}
        {!generating && questions.length > 0 && !interviewResult && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">
                Question {currentIndex + 1} of {questions.length} ({selectedCategory})
              </span>
              <span className="text-xs font-semibold text-slate-400">Seniority: {seniorityLevel}</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {questions[currentIndex]}
              </h2>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Your Answer</label>
              <textarea
                rows={6}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your detailed interview answer here..."
                className="w-full rounded-2xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => handleNextOrSkipQuestion(true)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Skip Question
              </button>
              <button
                onClick={() => handleNextOrSkipQuestion(false)}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
              >
                {currentIndex < questions.length - 1 ? 'Next Question ->' : 'Finish & Get AI Feedback'}
              </button>
            </div>
          </div>
        )}

        {/* Evaluating Loader */}
        {evaluating && (
          <div className="text-center py-24 space-y-6">
            <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto text-xl font-bold animate-pulse">
              AI
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Evaluating Your Interview Responses...</h2>
            <p className="text-xs text-slate-500">Scoring communication, technical accuracy, and structural impact.</p>
          </div>
        )}

        {/* Interview Feedback & Rating Result Page */}
        {interviewResult && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Mock Interview Evaluation Report</h2>
                <p className="text-xs text-slate-500 mt-0.5">Role: {selectedCategory} ({seniorityLevel})</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-indigo-600">{interviewResult.overallScore}/10</span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Score</span>
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-6 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">AI Performance Summary</h4>
              <p className="text-xs text-slate-700 leading-relaxed">{interviewResult.summary}</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Question-by-Question Breakdown</h3>
              <div className="space-y-4">
                {interviewResult.breakdown?.map((item: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-5 space-y-2 bg-slate-50">
                    <p className="text-xs font-bold text-slate-900">Q{i + 1}: {questions[i]}</p>
                    <p className="text-xs text-slate-600"><strong>Your Answer:</strong> {userAnswers[i]}</p>
                    <p className="text-xs text-indigo-600"><strong>Feedback:</strong> {item.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-3">
              <button
                onClick={() => {
                  setInterviewResult(null)
                  setQuestions([])
                  setSelectedCategory('')
                }}
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-6 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Start New Practice
              </button>
              
              <button
                onClick={handleSaveInterview}
                disabled={saving || savedSuccess}
                className="w-full sm:w-auto rounded-xl bg-indigo-600 px-8 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50"
              >
                {savedSuccess ? 'Saved to History!' : (saving ? 'Saving...' : 'Save Interview to History')}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Configuration Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-slate-900">Configure: {selectedCategory}</h3>
              <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer">X</button>
            </div>

            <form onSubmit={handleStartInterviewQuestions} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Years of Experience *</label>
                <input
                  type="text"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  required
                  placeholder="e.g. 3 years, 6 months, Fresher"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Seniority Level *</label>
                <select
                  value={seniorityLevel}
                  onChange={(e) => setSeniorityLevel(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white"
                >
                  {seniorityOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Target Job Description (Optional)</label>
                <textarea
                  rows={4}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste specific job description requirements here, or skip for general practice..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  Generate 5 Interview Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Auth Modal */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 font-bold cursor-pointer">X</button>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h3>
            {errorMessage && <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 font-semibold">{errorMessage}</div>}
            {successMessage && <div className="mb-4 rounded-xl bg-green-50 p-3 text-xs text-green-600 font-semibold">{successMessage}</div>}

            <form onSubmit={handleEmailAuth} className="space-y-3 text-xs">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none text-slate-900" />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Contact Number</label>
                    <input type="tel" maxLength={10} value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none text-slate-900" />
                  </div>
                </>
              )}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none text-slate-900" />
              </div>
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none text-slate-900" />
              </div>
              {authMode === 'signup' && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} required />
                  <label htmlFor="terms" className="text-[11px] text-slate-600">I agree to Terms & Conditions.</label>
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-500 cursor-pointer">
                {loading ? 'Processing...' : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pricing Modal for Freemium Users */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 text-center space-y-4 text-slate-900">
            <h3 className="text-xl font-extrabold text-slate-900">Pass Required for Interview Prep</h3>
            <p className="text-xs text-slate-500">Interview preparation is included with our Daily and Monthly Passes. Upgrade your plan to unlock full access.</p>
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
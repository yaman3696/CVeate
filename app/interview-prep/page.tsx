'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function InterviewPrepPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
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
  
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)

  const [evaluating, setEvaluating] = useState(false)
  const [interviewResult, setInterviewResult] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const professionCategories = [
    { 
      name: 'Coding & Software Development', 
      tag: 'coding', 
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ) 
    },
    { 
      name: 'UI/UX & Visual Designing', 
      tag: 'designing', 
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ) 
    },
    { 
      name: 'Finance & Banking', 
      tag: 'finance', 
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) 
    },
    { 
      name: 'Product Management', 
      tag: 'product', 
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ) 
    },
    { 
      name: 'Digital Marketing & Growth', 
      tag: 'marketing', 
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ) 
    },
    { 
      name: 'Data Science & AI', 
      tag: 'datascience', 
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ) 
    }
  ]

  const seniorityOptions = ['Internship', 'Junior', 'Intermediate', 'Senior', 'Team Lead', 'Manager', 'HOD']

  const speakQuestion = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
    }
    window.speechSynthesis.speak(utterance)
  }

  // Robust live speech-to-text initialization using webkitSpeechRecognition
  const startLiveSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome.')
      return
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (e) {}
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsRecording(true)
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        } else {
          interimTranscript += event.results[i][0].transcript
        }
      }

      if (finalTranscript || interimTranscript) {
        setCurrentAnswer(prev => {
          const base = prev.trim()
          return (base ? base + ' ' : '') + (finalTranscript || interimTranscript)
        })
      }
    }

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch (err) {
      console.error('Could not start recognition:', err)
      setIsRecording(false)
    }
  }

  const stopLiveSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {}
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      speakQuestion(questions[currentIndex])
    }
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) {}
      }
    }
  }, [currentIndex, questions])

  // Canvas Network Background Animation Effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let running = true

    const initCanvas = () => {
      if (!running || !canvas) return
      const width = window.innerWidth
      const height = window.innerHeight
      const dpr = window.devicePixelRatio || 1

      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.0,
        vy: (Math.random() - 0.5) * 1.0,
        radius: Math.random() * 2 + 1,
      }))

      const animate = () => {
        if (!running) return
        ctx.clearRect(0, 0, width, height)

        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x
            const dy = particles[i].y - particles[j].y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 140) {
              ctx.strokeStyle = `rgba(99, 102, 241, ${0.35 * (1 - dist / 140)})`
              ctx.lineWidth = 1.2
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

          ctx.fillStyle = 'rgba(99, 102, 241, 0.7)'
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()
        })

        animationFrameId = requestAnimationFrame(animate)
      }

      animate()
    }

    initCanvas()
    const handleResize = () => { initCanvas() }
    window.addEventListener('resize', handleResize)

    return () => {
      running = false
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          if (profileData.role === 'admin' || profileData.role === '`admin`') {
            setIsAdmin(true)
          }
        }
      }
      setAuthLoading(false)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setUser(session.user)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          if (profileData.role === 'admin' || profileData.role === '`admin`') {
            setIsAdmin(true)
          }
        }
      } else {
        setUser(null)
        setProfile(null)
        setIsAdmin(false)
      }
      setAuthLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleCategorySelect = (categoryName: string) => {
    if (!user) {
      const globalAuthBtn = document.querySelector('nav button') as HTMLButtonElement
      if (globalAuthBtn) {
        globalAuthBtn.click()
      } else {
        alert('Please sign in using the top navigation bar to start mock interviews.')
      }
      return
    }

    const isOwnerOrAdmin = user?.email === 'yaman.kashyap@gmail.com' || profile?.role === 'admin' || profile?.role === '`admin`'
    const hasPaidPass = profile?.plan_name === 'Daily Pass' || profile?.plan_name === 'Monthly'

    if (!isOwnerOrAdmin && !hasPaidPass) {
      setIsPricingModalOpen(true)
      return
    }

    setSelectedCategory(categoryName)
    setIsWizardOpen(true)
  }

  const handleStartInterviewQuestions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!experienceYears) return alert('Please specify experience.')

    setIsWizardOpen(false)
    setGenerating(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/generate-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          category: selectedCategory,
          seniority: seniorityLevel,
          experience: experienceYears,
          jobDescription: jobDescription.trim() || 'General industry standard expectations'
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate.')

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
    if (isRecording) stopLiveSpeechRecognition()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()

    const updatedAnswers = [...userAnswers]
    updatedAnswers[currentIndex] = isSkipped ? '[Skipped]' : currentAnswer
    setUserAnswers(updatedAnswers)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentAnswer(updatedAnswers[currentIndex + 1] === '[Skipped]' ? '' : updatedAnswers[currentIndex + 1])
    } else {
      evaluateInterviewTranscript(updatedAnswers)
    }
  }

  const evaluateInterviewTranscript = async (finalAnswers: string[]) => {
    if (isRecording) stopLiveSpeechRecognition()
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
        seniority: seniorityLevel,
        experience: experienceYears,
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-slate-600">Verifying session...</div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100 text-slate-900 relative overflow-hidden flex flex-col">
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-90" />

      <style jsx>{`
        @keyframes siriPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 30px rgba(99, 102, 241, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        .siri-orb { animation: siriPulse 2.8s infinite cubic-bezier(0.4, 0, 0.6, 1); }
      `}</style>

      <div className="flex-grow z-10 max-w-6xl mx-auto px-6 py-16 w-full">

        {/* TOP BACK BUTTON */}
        {(questions.length > 0 || interviewResult) && !generating && !evaluating && (
          <div className="mb-6">
            <button
              onClick={() => {
                if (isRecording) stopLiveSpeechRecognition()
                if ('speechSynthesis' in window) window.speechSynthesis.cancel()
                setQuestions([])
                setInterviewResult(null)
                setSelectedCategory('')
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
            >
              ← Back to Categories
            </button>
          </div>
        )}

        {!generating && questions.length === 0 && !interviewResult && (
          <div className="space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 border border-indigo-100 shadow-sm">
                AI Career Companion
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl sm:leading-tight">
                Master Your Next Interview with <span className="text-indigo-600">AI Mock Training</span>
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Select your profession category below to start a tailored 5-question voice interview session complete with live AI speech and recruiter feedback.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                Select a Profession Category to Begin
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {professionCategories.map((cat) => (
                  <button
                    key={cat.tag}
                    onClick={() => handleCategorySelect(cat.name)}
                    className="group rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-6 shadow-md hover:border-indigo-600 hover:shadow-xl transition-all text-left flex items-center gap-4 cursor-pointer"
                  >
                    <span className="p-3 rounded-xl border border-slate-100 bg-slate-50 group-hover:scale-105 transition-transform">
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

        {/* GENERATING OVERLAY MODAL */}
        {generating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-12 text-center shadow-2xl space-y-8 max-w-xl w-full mx-auto">
              <div className="relative flex items-center justify-center py-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 siri-orb flex items-center justify-center shadow-2xl">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold text-sm">
                    AI
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900">CVeat AI is generating your interview questions...</h2>
                <p className="text-xs text-slate-500">Tailoring technical and behavioral questions to your experience level.</p>
              </div>
            </div>
          </div>
        )}

        {!generating && questions.length > 0 && !interviewResult && (
          <div className="max-w-3xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">
                Question {currentIndex + 1} of {questions.length} ({selectedCategory})
              </span>
              <span className="text-xs font-semibold text-slate-400">Seniority: {seniorityLevel}</span>
            </div>

            <div className="rounded-2xl bg-slate-900 p-6 text-center text-white space-y-3 relative overflow-hidden shadow-inner">
              <div className="flex items-center justify-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isSpeaking ? 'bg-indigo-400 animate-ping' : (isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500')}`}></span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  {isSpeaking ? 'CVeat AI Speaking...' : (isRecording ? 'Listening & Transcribing Live...' : 'Ready / Paused')}
                </span>
              </div>
              <div className="h-16 flex items-center justify-center">
                <canvas ref={waveformCanvasRef} width={500} height={60} className="w-full max-w-md h-12" />
              </div>
              <button
                type="button"
                onClick={() => speakQuestion(questions[currentIndex])}
                className="text-xs font-semibold text-indigo-300 hover:text-white transition-colors cursor-pointer"
              >
                [ Replay Question Audio ]
              </button>
            </div>

            <h2 className="text-lg font-bold text-slate-900 leading-snug">{questions[currentIndex]}</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Your Answer (Live Transcribed)</label>
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startLiveSpeechRecognition}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition-all cursor-pointer"
                  >
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                    Start Live Speech-to-Text
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopLiveSpeechRecognition}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Stop Listening
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Speak into your microphone or type your response here..."
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

        {/* EVALUATING OVERLAY MODAL */}
        {evaluating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-12 text-center shadow-2xl space-y-8 max-w-xl w-full mx-auto">
              <div className="relative flex items-center justify-center py-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 siri-orb flex items-center justify-center shadow-2xl">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold text-sm">
                    AI
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900">CVeat AI is evaluating your responses...</h2>
                <p className="text-xs text-slate-500">Scoring communication, technical accuracy, and structural impact.</p>
              </div>
            </div>
          </div>
        )}

        {interviewResult && (
          <div className="max-w-3xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100 space-y-8">
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">CVeat AI Performance Summary</h4>
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
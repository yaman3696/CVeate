'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AtsCheckerPage() {
  const router = useRouter()
  const pathname = usePathname()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false)
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false)

  const [jobDescription, setJobDescription] = useState('')
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [loadingStep, setLoadingStep] = useState(0)

  // Auth Modal State
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')
  const [isResetMode, setIsResetMode] = useState(false)
  const [fullName, setFullName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Profile Dropdown State
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Sync Google Profile with name preservation logic
  const syncGoogleProfile = async (sessionUser: any) => {
    if (!sessionUser) return

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name, plan_name, ats_chances_remaining')
      .eq('id', sessionUser.id)
      .maybeSingle()

    const googleName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || ''
    const contactNo = sessionUser.user_metadata?.contact_number || sessionUser.user_metadata?.phone || ''

    if (!existingProfile) {
      await supabase.from('profiles').upsert({
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: googleName,
        phone: contactNo,
        contact_number: contactNo,
        plan_name: 'Freemium',
        ats_chances_remaining: 2,
        ats_last_reset: new Date().toISOString()
      })
    } else if (!existingProfile.full_name && googleName) {
      await supabase.from('profiles')
        .update({ full_name: googleName })
        .eq('id', sessionUser.id)
    }
  }

  // Reliable Canvas Network Animation Effect
  useEffect(() => {
    if (authLoading) return

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

      const particles = Array.from({ length: 45 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
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
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.18 * (1 - dist / 110)})`
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

          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
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
  }, [authLoading])

  // Check Session on Load, Verify Credits Timer via Secure RPC, & Listen for Auth Changes
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        await syncGoogleProfile(session.user)

        // Call the secure Supabase function to automatically evaluate and refresh credits & plan rules
        const { data: refreshedProfile, error } = await supabase
          .rpc('get_or_refresh_user_profile', { user_id: session.user.id })

        if (!error && refreshedProfile && Array.isArray(refreshedProfile) && refreshedProfile.length > 0) {
          setProfile(refreshedProfile[0])
        } else {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileData) setProfile(profileData)
        }
      }
      setAuthLoading(false)
    }
    checkUserSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) syncGoogleProfile(session.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setIsResetMode(false)
    setErrorMessage('')
    setSuccessMessage('')
    setIsAuthOpen(true)
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
  
    try {
      if (authMode === 'signup') {
        const mobileRegex = /^[0-9]{10}$/
        if (!mobileRegex.test(contactNumber)) {
          throw new Error('Please enter a valid 10-digit mobile number.')
        }
  
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }
  
        if (!agreeTerms) {
          throw new Error('You must agree to the terms and conditions to sign up.')
        }
  
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              contact_number: contactNumber
            }
          }
        })
  
        if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
          throw new Error('This email address is already registered. Please sign in using Google or your password.')
        }
  
        if (error) {
          const msg = error.message.toLowerCase()
          if (
            msg.includes('already registered') || 
            msg.includes('already exists') || 
            msg.includes('user already registered') ||
            error.status === 422
          ) {
            throw new Error('This email address is already registered. Please sign in using Google or your password.')
          }
          throw error
        }
  
        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            contact_number: contactNumber,
            phone: contactNumber,
            plan_name: 'Freemium',
            ats_chances_remaining: 2,
            ats_last_reset: new Date().toISOString()
          })
        }
        setSuccessMessage('Account created successfully! Please check your email for verification.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials.')
          }
          throw error
        }
        
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setErrorMessage('Please enter your email address first.')
      return
    }
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) throw error
      setSuccessMessage('Password reset link sent! Check your email inbox.')
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.href}`
        }
      })
      if (error) throw error
    } catch (err: any) {
      setErrorMessage(err.message || 'Google login failed.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    setIsProfileOpen(false)
    window.location.href = '/'
  }

  const [loadingProgress, setLoadingProgress] = useState(0)

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setIsLoginPromptOpen(true)
      return
    }

    if (!selectedFile) {
      alert('Please upload a CV file first.')
      return
    }
    if (!jobDescription.trim()) {
      alert('Please paste a target job description.')
      return
    }

    if (!profile || profile.ats_chances_remaining <= 0) {
      setIsLimitModalOpen(true)
      return
    }

    setIsAnalyzing(true)
    setLoadingStep(1)
    setLoadingProgress(15)

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev < 40) {
          setLoadingStep(1)
          return prev + 10
        } else if (prev < 75) {
          setLoadingStep(2)
          return prev + 8
        } else if (prev < 90) {
          setLoadingStep(3)
          return prev + 3
        }
        return prev
      })
    }, 600)

    try {
      const newChances = profile.ats_chances_remaining - 1
      await supabase
        .from('profiles')
        .update({ ats_chances_remaining: newChances })
        .eq('id', user.id)

      setProfile((prev: any) => ({ ...prev, ats_chances_remaining: newChances }))

      const formData = new FormData()
      formData.append('jobDescription', jobDescription)
      formData.append('cvFile', selectedFile)

      const res = await fetch('/api/analyze-cv', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      clearInterval(progressInterval)
      setLoadingProgress(100)

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong during analysis.')
      }

      setAnalysisResult(data)
    } catch (err: any) {
      clearInterval(progressInterval)
      alert(err.message || 'Failed to connect to CVeat AI backend.')
    } finally {
      setIsAnalyzing(false)
      setLoadingStep(0)
      setLoadingProgress(0)
    }
  }

  const handleAutoFillAndBuild = () => {
    sessionStorage.setItem('cveate_ats_data', JSON.stringify(analysisResult))
    router.push('/onboard?autofill=true')
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Verifying session...</div>
  }

  return (
    <div className="min-h-screen bg-indigo-600 text-white flex flex-col relative overflow-hidden">
      
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />

      <style jsx>{`
        @keyframes siriPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 25px rgba(255, 255, 255, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        .siri-orb { animation: siriPulse 2.5s infinite cubic-bezier(0.4, 0, 0.6, 1); }
      `}</style>

      {/* Main Nav */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm text-slate-900 border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-black tracking-tight text-indigo-600">
              CVeat
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-6 ml-auto mr-6 text-sm font-medium text-slate-600">
            <Link href="/about" className="hover:text-indigo-600 transition-colors">About Us</Link>
            <Link href="/blog" className="hover:text-indigo-600 transition-colors">Blog</Link>
            <Link href="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
            <Link href="/ats-checker" className="text-indigo-600 font-bold transition-colors">ATS Checker</Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
                >
                  <div className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {user.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span>{profile?.plan_name ? profile.plan_name.toUpperCase() : 'FREEMIUM'} ({profile?.ats_chances_remaining ?? 0} Left)</span>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 text-slate-900 text-xs z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{user.user_metadata?.full_name || 'My Account'}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link href="/profile" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2.5 hover:bg-slate-50 font-medium text-slate-700 transition-colors">Profile Settings</Link>
                      <Link href="/history" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2.5 hover:bg-slate-50 font-medium text-slate-700 transition-colors">CV History</Link>
                    </div>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 font-semibold transition-colors flex items-center justify-between cursor-pointer">
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuth('signup')}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Get Started
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden rounded-xl bg-slate-100 p-2.5 text-slate-700 hover:bg-slate-200 transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 px-6 py-6 space-y-4 shadow-xl">
            <div className="flex flex-col space-y-3 font-semibold text-sm text-slate-700">
              <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-indigo-600 transition-colors py-1.5">About Us</Link>
              <Link href="/blog" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-indigo-600 transition-colors py-1.5">Blog</Link>
              <Link href="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-indigo-600 transition-colors py-1.5">Pricing</Link>
              <Link href="/ats-checker" onClick={() => setIsMobileMenuOpen(false)} className="text-indigo-600 py-1.5">ATS Checker</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="flex-grow flex items-center justify-center px-6 py-12 z-10">
        <div className="w-full max-w-3xl">
          
        {isAnalyzing ? (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 text-center text-white shadow-2xl space-y-8 my-auto">
              <div className="relative flex items-center justify-center py-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-400 to-pink-400 siri-orb flex items-center justify-center shadow-2xl">
                  <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-white animate-ping"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">CVeat AI is scanning your resume ({loadingProgress}%)</h2>
                <p className="text-xs text-indigo-100 min-h-[20px]">
                  {loadingStep === 1 && 'Extracting text and layout layers from PDF...'}
                  {loadingStep === 2 && 'Comparing skills against target job description...'}
                  {loadingStep === 3 && 'Generating recruiter match score & optimization plan...'}
                </p>
              </div>

              <div className="w-full bg-black/25 rounded-full h-2 overflow-hidden max-w-sm mx-auto p-0.5">
                <div 
                  className="bg-gradient-to-r from-cyan-300 to-pink-300 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
            </div>
          ) : !analysisResult ? (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">AI ATS Resume Scanner</h1>
                <p className="text-sm text-indigo-100 max-w-lg mx-auto">
                  Evaluate your resume against any job description to uncover missing keywords, formatting traps, and your recruiter match score.
                </p>
                {user && (
                  <div className="inline-block bg-white/25 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold">
                    Remaining Checks: {profile?.ats_chances_remaining ?? 0}
                  </div>
                )}
              </div>

              <form onSubmit={handleAnalyze} className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    1. Target Job Description (JD) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the complete job description text here..."
                    className="w-full rounded-xl border border-slate-200 p-4 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    2. Upload Resume (PDF or DOCX) <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 relative hover:bg-slate-100 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0])
                          setFileName(e.target.files[0].name)
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <p className="text-sm font-semibold text-slate-700">
                      {fileName ? `Selected: ${fileName}` : 'Drag & drop your CV file here, or click to browse'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Supports PDF, Word, and Text documents</p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  Analyze Resume Match Score
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8">
              <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">ATS Analysis Report</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Scanned against provided job description via CVeat AI</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-3xl font-black text-indigo-600">{analysisResult.matchScore}%</span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Match Score</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Missing Critical Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.missingKeywords?.length > 0 ? (
                    analysisResult.missingKeywords.map((kw: string, i: number) => (
                      <span key={i} className="rounded-lg bg-red-50 text-red-600 border border-red-100 px-3 py-1 text-xs font-semibold">
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">None! All key terms are present.</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-green-50/60 border border-green-100 p-5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-green-700">Key Strengths</h4>
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                    {analysisResult.strengths?.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-amber-50/60 border border-amber-100 p-5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">Areas for Improvement</h4>
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                    {analysisResult.weaknesses?.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Optimization Action Plan</h3>
                <div className="space-y-2">
                  {analysisResult.suggestions?.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium">
                      <span className="text-indigo-600 font-bold">0{i + 1}.</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-3">
                <button
                  onClick={() => {
                    setAnalysisResult(null)
                    setSelectedFile(null)
                    setFileName('')
                  }}
                  className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Scan Another Resume
                </button>
                <button
                  onClick={handleAutoFillAndBuild}
                  className="w-full sm:w-auto rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Auto-Fill Builder & Create Optimized CV
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Login Required Prompt Modal for Guests */}
      {isLoginPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 text-center space-y-4 text-slate-900">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Authentication Required</h3>
              <p className="text-xs text-slate-500">Please sign in or create an account to run your AI ATS resume match check.</p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setIsLoginPromptOpen(false)
                  openAuth('signin')
                }}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
              >
                Sign In / Sign Up Now
              </button>
              <button
                onClick={() => setIsLoginPromptOpen(false)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Limit Exceeded Modal Popup */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 text-center space-y-4 text-slate-900">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">ATS Check Chances Over!</h3>
              <p className="text-xs text-slate-500">You have exhausted your available ATS check credits. Please upgrade to a paid plan on our pricing page to continue scanning resumes.</p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <Link href="/pricing">
                <button className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer">
                  View Pricing Plans
                </button>
              </Link>
              <button
                onClick={() => setIsLimitModalOpen(false)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Auth Modal for ATS Checker */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900">
            <button
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-extrabold text-slate-900">
                {isResetMode ? 'Reset Password' : (authMode === 'signin' ? 'Welcome Back to CVeat' : 'Create Your Account')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isResetMode ? 'Enter your email to receive a secure recovery link' : (authMode === 'signin' ? 'Sign in to access your saved resumes & ATS history' : 'Join thousands of professionals landing interviews faster')}
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-3 text-xs font-semibold text-green-600">
                {successMessage}
              </div>
            )}

            {isResetMode ? (
              <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    placeholder="name@example.com" 
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-600 outline-none text-slate-900 bg-white" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-500 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <div className="text-center pt-2">
                  <button 
                    type="button" 
                    onClick={() => { setIsResetMode(false); setErrorMessage(''); setSuccessMessage(''); }}
                    className="text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.39-1.49-.39-2.24s.14-1.52.39-2.24V6.61H1.18C.43 8.13 0 9.85 0 11.69s.43 3.56 1.18 5.08l4.09-2.53z"/>
                    <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.77l3.43-3.43C17.95 1.18 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-4 text-[10px] uppercase font-bold tracking-wider text-slate-400">or email</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3 text-xs">
                  {authMode === 'signup' && (
                    <>
                      <div>
                        <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Full Name</label>
                        <input 
                          type="text" 
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required 
                          placeholder="e.g. John Doe" 
                          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-600 outline-none text-slate-900 bg-white" 
                        />
                      </div>
                      <div>
                        <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Contact Number (10 Digits)</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">+91</span>
                          <input 
                            type="tel" 
                            maxLength={10}
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
                            required 
                            placeholder="9876543210" 
                            className="w-full rounded-r-xl border border-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-600 outline-none text-slate-900 bg-white" 
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                      placeholder="name@example.com" 
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-600 outline-none text-slate-900 bg-white" 
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                        placeholder="••••••••" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 pr-10 text-sm focus:ring-2 focus:ring-indigo-600 outline-none text-slate-900 bg-white" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {authMode === 'signup' && (
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Confirm Password</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? 'text' : 'password'} 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required 
                          placeholder="••••••••" 
                          className="w-full rounded-xl border border-slate-200 px-4 py-2 pr-10 text-sm focus:ring-2 focus:ring-indigo-600 outline-none text-slate-900 bg-white" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {authMode === 'signup' && (
                    <div className="flex items-start gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="terms-checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="terms-checkbox" className="text-[11px] text-slate-600 leading-relaxed cursor-pointer">
                        I agree to the <span className="text-indigo-600 font-bold hover:underline">Terms and Conditions</span> and Privacy Policy.
                      </label>
                    </div>
                  )}

                  {authMode === 'signin' && (
                    <div className="flex justify-end pt-1">
                      <button 
                        type="button"
                        onClick={() => { setIsResetMode(true); setErrorMessage(''); setSuccessMessage(''); }}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full mt-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-500 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
                  </button>
                </form>
              </div>
            )}

            {!isResetMode && (
              <div className="mt-6 text-center text-xs text-slate-500">
                {authMode === 'signin' ? (
                  <p>Don't have an account? <button onClick={() => setAuthMode('signup')} className="text-indigo-600 font-bold hover:underline cursor-pointer">Sign up</button></p>
                ) : (
                  <p>Already have an account? <button onClick={() => setAuthMode('signin')} className="text-indigo-600 font-bold hover:underline cursor-pointer">Sign in</button></p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
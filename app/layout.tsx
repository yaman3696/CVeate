'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import './globals.css'

// Inner component to handle client-side pathname, search params, and navigation hooks safely
function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAtsCheckerPage = pathname === '/ats-checker'

  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Form States
  const [fullName, setFullName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  
  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Session & Profile Dropdown State
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Fetch user profile plan and ATS credits from Supabase
  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('plan_name, ats_chances_remaining, full_name')
      .eq('id', userId)
      .single()

    if (data) {
      setUserProfile(data)
    }
  }

  // Check active session on load & listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check URL query parameters to auto-open auth modal if redirected (e.g., ?auth=signup)
  useEffect(() => {
    const authAction = searchParams.get('auth')
    if (authAction === 'signin' || authAction === 'signup') {
      setAuthMode(authAction)
      setIsAuthOpen(true)
    }
  }, [searchParams])

  // Listen for custom trigger from pricing page or other components to open auth modal
  useEffect(() => {
    const handleOpenAuth = (e: CustomEvent) => {
      if (e.detail) setAuthMode(e.detail)
      setErrorMessage('')
      setSuccessMessage('')
      setIsAuthOpen(true)
    }

    window.addEventListener('open-auth-modal', handleOpenAuth as EventListener)
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth as EventListener)
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
    setErrorMessage('')
    setSuccessMessage('')
    setIsAuthOpen(true)
    setIsMobileMenuOpen(false)
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
        })
        
        // If Supabase returns a user but identities array is empty or null (duplicate sign-up)
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
            throw new Error('This email address is already registered. Please sign in using Google or any other email id.')
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
            ats_chances_remaining: 2
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
        
        // Capture current path and stay on the exact page after login
        const currentPath = window.location.pathname
        setTimeout(() => {
          setIsAuthOpen(false)
          window.location.href = currentPath
        }, 800)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`
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
    setUser(null)
    setUserProfile(null)
    
    // Force a complete browser reload to clear caches and hide user components instantly
    window.location.href = '/'
  }

  const handleQuickDownload = async () => {
    if (!user) return

    try {
      const { data: primaryCv, error } = await supabase
        .from('cv_history')
        .select('cv_data')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single()

      if (error || !primaryCv || !primaryCv.cv_data) {
        alert('First create and save CV to use this feature.')
        return
      }

      sessionStorage.setItem(`cveate_resume_data_${user.id}`, JSON.stringify(primaryCv.cv_data))
      router.push('/dashboard?download=true')
    } catch (err) {
      alert('First create and save CV to use this feature.')
    }
  }

  return (
    <>
      {/* Global Navigation Bar */}
      {!isAtsCheckerPage && (
        <nav className="sticky top-0 z-50 bg-indigo-600 shadow-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-black tracking-tight text-white">
                CVeat
              </Link>
            </div>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 ml-auto mr-6 text-sm font-medium text-indigo-100">
              <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/ats-checker" className="hover:text-white transition-colors">ATS Checker</Link>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <button
                  onClick={handleQuickDownload}
                  title="Quick CV Download"
                  className="hidden sm:flex items-center gap-2 rounded-xl border border-indigo-400 bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Quick CV Download</span>
                </button>
              )}

              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-700/80 border border-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded-full bg-white text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">Profile</span>
                  </button>

                  {/* Profile Dropdown Menu with Plan & Credits Info */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 text-slate-900 text-xs">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="font-bold text-slate-900 truncate">{userProfile?.full_name || 'My Account'}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
                        
                        {/* Active Plan & ATS Credits Badge */}
                        <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Active Plan</p>
                            <p className="text-xs font-extrabold text-slate-900">{userProfile?.plan_name || 'Freemium'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">ATS Checks</p>
                            <p className="text-xs font-extrabold text-slate-900">{userProfile?.ats_chances_remaining ?? 2} Left</p>
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link 
                          href="/profile" 
                          onClick={() => setIsProfileOpen(false)}
                          className="block px-4 py-2.5 hover:bg-slate-50 font-medium text-slate-700 transition-colors"
                        >
                          Profile Settings
                        </Link>
                        <Link 
                          href="/history" 
                          onClick={() => setIsProfileOpen(false)}
                          className="block px-4 py-2.5 hover:bg-slate-50 font-medium text-slate-700 transition-colors"
                        >
                          CV History
                        </Link>
                      </div>
                      <div className="border-t border-slate-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 font-semibold transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>Log Out</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openAuth('signup')}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm hover:shadow-lg hover:shadow-indigo-950/40 hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  Get Started
                </button>
              )}

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden rounded-xl bg-indigo-700 p-2.5 text-white hover:bg-indigo-800 transition-colors focus:outline-none cursor-pointer"
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

          {/* Mobile Dropdown Navigation Drawer */}
          {isMobileMenuOpen && (
            <div className="md:hidden bg-indigo-700 border-t border-indigo-500 px-6 py-6 space-y-4 shadow-xl text-white">
              <div className="flex flex-col space-y-3 font-semibold text-sm">
                <Link 
                  href="/about" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:text-indigo-200 transition-colors py-1.5"
                >
                  About Us
                </Link>
                <Link 
                  href="/blog" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:text-indigo-200 transition-colors py-1.5"
                >
                  Blog
                </Link>
                <Link 
                  href="/pricing" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:text-indigo-200 transition-colors py-1.5"
                >
                  Pricing
                </Link>
                <Link 
                  href="/ats-checker" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:text-indigo-200 transition-colors py-1.5"
                >
                  ATS Checker
                </Link>
              </div>
            </div>
          )}
        </nav>
      )}

      <main>{children}</main>

      {/* Global Auth Modal */}
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
                {authMode === 'signin' ? 'Welcome Back to CVeat' : 'Create Your Account'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {authMode === 'signin' ? 'Sign in to access your saved resumes & ATS history' : 'Join thousands of professionals landing interviews faster'}
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

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full mt-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-500 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
                </button>
              </form>
            </div>

            <div className="mt-6 text-center text-xs text-slate-500">
              {authMode === 'signin' ? (
                <p>Don't have an account? <button onClick={() => setAuthMode('signup')} className="text-indigo-600 font-bold hover:underline cursor-pointer">Sign up</button></p>
              ) : (
                <p>Already have an account? <button onClick={() => setAuthMode('signin')} className="text-indigo-600 font-bold hover:underline cursor-pointer">Sign in</button></p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased font-sans">
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
          <NavigationWrapper>
            {children}
          </NavigationWrapper>
        </Suspense>
      </body>
    </html>
  )
}
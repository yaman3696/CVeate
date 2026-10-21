'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { unstable_noStore as noStore } from 'next/cache';

export default function LandingPage() {
  noStore();
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const [testimonials, setTestimonials] = useState<any[]>([])
  const [latestBlogs, setLatestBlogs] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Testimonial Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false)
  const [isAllTestimonialsOpen, setIsAllTestimonialsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [newTestimonial, setNewTestimonial] = useState({
    name: '',
    profession: '',
    rating: 5,
    text: '',
  })
  const [formError, setFormError] = useState('')

  const [isAdmin, setIsAdmin] = useState(false)

  // Check active user session, admin status, and load user ID
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const OWNER_EMAIL = 'yaman.kashyap@gmail.com'

      if (user) {
        setCurrentUserId(user.id)
        if (user.email === OWNER_EMAIL) {
          setIsAdmin(true)
        }
      } else {
        setCurrentUserId(null)
        setIsAdmin(false)
      }
    }
    checkUserSession()
  }, [])

  // Fetch latest 3 blogs from Supabase[cite: 6]
  useEffect(() => {
    const fetchLatestBlogs = async () => {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)

      if (data) {
        setLatestBlogs(data)
      }
    }

    fetchLatestBlogs()
  }, [])

  // Fetch testimonials and sort so user's own testimonial is always on top
  const fetchTestimonials = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false })

    let items = []
    if (data && data.length > 0) {
      items = data
    } else {
      items = [
        {
          id: '1',
          name: 'Yaman K.',
          profession: 'Senior Creative Designer',
          rating: 5,
          text: 'The ATS export format is incredible. I applied to 5 companies with a resume built here and got 4 interview callbacks within a week!',
          initial: 'Y'
        },
        {
          id: '2',
          name: 'Sakshi S.',
          profession: 'UI/UX Product Specialist',
          rating: 5,
          text: 'Clean layout, no annoying website clutter on the PDF export, and super intuitive onboarding wizard. Highly recommend!',
          initial: 'S'
        },
        {
          id: '3',
          name: 'Rahul M.',
          profession: 'Frontend Software Engineer',
          rating: 5,
          text: 'Most resume builders trap your data behind paywalls or output messy code. Cveat is lightning fast and gets straight to the point.',
          initial: 'R'
        },
        {
          id: '4',
          name: 'Priya D.',
          profession: 'Product Marketing Manager',
          rating: 5,
          text: 'The clean structure helped me pass corporate ATS filters seamlessly. Landed my dream role in less than a month of active searching.',
          initial: 'P'
        },
        {
          id: '5',
          name: 'Aniket V.',
          profession: 'Full Stack Developer',
          rating: 5,
          text: 'Absolute lifesaver! The layout looks professional, prints cleanly without browser headers, and respects modern typographic standards.',
          initial: 'A'
        }
      ]
    }

    // Sort items so current user's review is always pinned to the top
    if (userId) {
      items.sort((a, b) => {
        if (a.user_id === userId) return -1
        if (b.user_id === userId) return 1
        return 0
      })
    }

    setTestimonials(items)
  }

  useEffect(() => {
    fetchTestimonials()
  }, [])

  // Check if user is logged in before opening Add Testimonial modal
  const handleOpenAddModal = async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      setIsLoginPromptOpen(true)
      return
    }

    // Check if user already submitted one
    const existing = testimonials.find(t => t.user_id === session.user.id)
    if (existing) {
      handleOpenEditModal(existing)
      return
    }
    
    setIsEditing(false)
    setEditingId(null)
    setNewTestimonial({ name: '', profession: '', rating: 5, text: '' })
    setFormError('')
    setIsAddModalOpen(true)
  }

  const handleOpenEditModal = (item: any) => {
    setIsEditing(true)
    setEditingId(item.id)
    setNewTestimonial({
      name: item.name,
      profession: item.profession,
      rating: item.rating,
      text: item.text,
    })
    setFormError('')
    setIsAddModalOpen(true)
  }

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -380, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 380, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' })
        } else {
          scrollContainerRef.current.scrollBy({ left: 380, behavior: 'smooth' })
        }
      }
    }, 4500)
    return () => clearInterval(interval)
  }, [])

  const handleAddTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTestimonial.name.trim() || !newTestimonial.profession.trim() || !newTestimonial.text.trim()) {
      setFormError('Please fill out all required fields.')
      return
    }

    const wordCount = newTestimonial.text.trim().split(/\s+/).length
    if (wordCount > 250) {
      setFormError(`Testimonial exceeds 250 words (currently ${wordCount} words).`)
      return
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Unauthorized: You must be logged in to submit a testimonial.')
      }

      const payload = {
        name: newTestimonial.name,
        profession: newTestimonial.profession,
        rating: Number(newTestimonial.rating),
        text: newTestimonial.text,
        initial: newTestimonial.name.charAt(0).toUpperCase(),
        user_id: user.id
      }

      // Check if user already has a testimonial in the database
      const { data: existingReview } = await supabase
        .from('testimonials')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      let error

      if (existingReview) {
        // Explicitly update if it exists (bypasses upsert RLS conflict errors)
        const res = await supabase
          .from('testimonials')
          .update(payload)
          .eq('user_id', user.id)
        error = res.error
      } else {
        // Explicitly insert if it's new
        const res = await supabase
          .from('testimonials')
          .insert([payload])
        error = res.error
      }

      if (error) throw error

      await fetchTestimonials()
      setNewTestimonial({ name: '', profession: '', rating: 5, text: '' })
      setFormError('')
      setIsAddModalOpen(false)
      setIsEditing(false)
      setEditingId(null)
    } catch (err: any) {
      setFormError(err.message || 'Failed to save testimonial.')
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = canvas.offsetWidth)
    let height = (canvas.height = canvas.offsetHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth
      height = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', handleResize)

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1.5,
    }))

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.12 * (1 - dist / 120)})`
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

        ctx.fillStyle = 'rgba(99, 102, 241, 0.25)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: 'What is an ATS optimized resume and why do I need one?',
      answer: 'An Applicant Tracking System is software used by corporate recruiters to automatically scan, parse, and rank job applications before a human ever reads them. If your resume contains heavy graphic design elements, multi column layouts, or missing keyword terms, the software will filter you out automatically. Cveat formats your career details into clean structured layouts that pass corporate filters seamlessly.'
    },
    {
      question: 'Can I build and download my resume for free on Cveat?',
      answer: 'Yes. You can use our guided 4 step resume builder completely free without any mandatory login or hidden paywalls. When you finish, you can instantly export your document into a professional PDF that prints cleanly and maintains strict typographic standards.'
    },
    {
      question: 'How does the AI ATS resume checker work?',
      answer: 'Our AI scanner allows you to paste any target job description and upload your resume document. It evaluates your skills against the job requirements, detects missing critical keywords, calculates your recruiter match score, and gives you a step by step optimization plan.'
    },
    {
      question: 'How do the free daily check credits renew?',
      answer: 'Every user starts on our Freemium plan with 2 free ATS check credits that automatically refresh every 24 hours. If you upgrade to a Daily Pass or Monthly Pass, your credits are scaled accordingly and will safely transition back to your standard freemium limits once your pass duration ends.'
    },
    {
      question: 'Is my personal data and resume content secure?',
      answer: 'Your privacy and data security are our top priorities. All data transmitted through Cveat is encrypted, stored securely in database profiles, and never sold or shared with third party advertisers or recruiters without your explicit permission.'
    }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <style jsx>{`
        @keyframes siriPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 30px rgba(99, 102, 241, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        .siri-orb { animation: siriPulse 2.8s infinite cubic-bezier(0.4, 0, 0.6, 1); }
      `}</style>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 to-white px-6 py-24 text-center">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none h-full w-full opacity-70"
        />

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur-sm border border-indigo-100 px-4 py-1.5 text-xs font-semibold text-indigo-700 mb-6 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            Modern ATS-Optimized CV Builder
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl sm:leading-tight">
            Craft Resumes That <span className="text-indigo-600">Beat ATS Bots</span> & Land Interviews.
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Build a FREE professional, recruiter-approved CV in minutes and export clean, ATS-ready PDFs instantly. No login required to create your CV.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboard" className="w-full sm:w-auto">
              <button className="w-full rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500 transition-all shine-wrapper cursor-pointer">
                Create Your CV Now
              </button>
            </Link>
            <button 
              onClick={() => alert('Find Job feature is coming soon!')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Find Jobs 
              <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">Coming Soon</span>
            </button>
          </div>
        </div>
      </section>

      {/* Attractive CVeat AI Showcase Section */}
<section className="bg-indigo-600 py-20 px-6 text-white my-12 relative overflow-hidden">
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)] pointer-events-none"></div>
  <div className="mx-auto max-w-4xl text-center space-y-6 relative z-10">
    <span className="inline-block rounded-full bg-indigo-500/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-100 border border-indigo-400/30">
      Powered by CVeat AI
    </span>
    <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
      Instant ATS Match Score & Resume Optimizer
    </h2>
    <p className="text-sm text-indigo-100 max-w-xl mx-auto leading-relaxed">
      Uncover why automated tracking systems filter out resumes. Let our intelligent career engine scan your CV, analyze keyword gaps, and provide instant recruiter-ready insights.
    </p>

    {/* ATS Card Container */}
    <div className="mt-8 bg-white rounded-3xl p-8 sm:p-10 text-slate-900 shadow-2xl max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
      
      {/* Text Content - Added items-center sm:items-start and text-center sm:text-left */}
      <div className="space-y-2 flex flex-col items-center sm:items-start text-center sm:text-left">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Live AI Scanner Ready</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">Check Your Resume Against Any Job</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Drop your document and paste the job description in our dedicated workspace to get instant feedback.
        </p>
      </div>

      {/* Glowing Siri Orb & Action Button */}
      <div className="flex flex-col items-center gap-4 shrink-0">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 siri-orb flex items-center justify-center shadow-lg">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold text-sm">
            AI
          </div>
        </div>
        <Link href="/ats-checker">
          <button className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer whitespace-nowrap">
            Launch ATS Checker 
          </button>
        </Link>
      </div>

    </div>
  </div>
</section>

      {/* About Section */}
      <section id="about" className="mx-auto max-w-6xl px-6 py-20 border-t border-slate-100 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">About Cveate</h2>
        <p className="mt-4 text-base text-slate-600 max-w-6xl mx-auto leading-relaxed">
        Cveat was born out of a universal job-seeking frustration: qualified professionals losing career opportunities simply because automated Applicant Tracking Systems (ATS) reject beautifully styled resumes over hidden formatting elements. We built Cveat to bridge this gap, combining a sleek, modern web experience with strict, recruiter-approved document exporting. By fixing common resume issues like columns and graphic text that cause your CV to fail ATS scans, our platform ensures your true skills and professional achievements always shine through to human hiring managers.
        </p>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-6 py-16 border-t border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">01</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">4-Step Guided Wizard</h3>
            <p className="text-sm text-slate-600">Quickly input your personal details, work experience, education, and skills without feeling overwhelmed.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">02</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">ATS-Friendly Layouts</h3>
            <p className="text-sm text-slate-600">Designed specifically to parse cleanly through automated corporate tracking systems and recruiter filters.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">03</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Instant PDF Export</h3>
            <p className="text-sm text-slate-600">Export your resume into a clean, professional PDF document with one click-no formatting mess.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="mx-auto max-w-6xl px-6 py-16 border-t border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-indigo-100/40 rounded-3xl my-10">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Trusted by Modern Professionals</h2>
            <p className="mt-1 text-sm text-slate-600">See how Cveat helped job seekers land interviews faster.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={() => setIsAllTestimonialsOpen(true)}
              className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-all whitespace-nowrap cursor-pointer"
            >
              See All Testimonials ({testimonials.length})
            </button>
            <button
              onClick={handleOpenAddModal}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all whitespace-nowrap cursor-pointer"
            >
              {testimonials.some(t => t.user_id === currentUserId) ? 'Edit Your Testimonial' : '+ Add Testimonial'}
            </button>
            <div className="flex items-center gap-1.5">
              <button onClick={scrollLeft} className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all font-bold shadow-sm cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <button onClick={scrollRight} className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all font-bold shadow-sm cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex gap-6 overflow-x-auto scrollbar-none pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {testimonials.slice(0, 6).map((item) => (
            <div key={item.id} className="min-w-[320px] max-w-[360px] flex-1 snap-start bg-white rounded-2xl border border-indigo-100 p-7 shadow-sm flex flex-col justify-between relative">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    {Array.from({ length: item.rating }).map((_, i) => (<span key={i}>★</span>))}
                  </div>
                  {/* Edit button appears ONLY on the current user's written testimonial */}
                  {currentUserId && item.user_id === currentUserId && (
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
                    >
                      Edit Review
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700 italic leading-relaxed">"{item.text}"</p>
              </div>
              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">{item.initial}</div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                  <p className="text-xs text-slate-500">{item.profession}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* See All Testimonials Modal */}
      {isAllTestimonialsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">All Community Testimonials</h3>
                <p className="text-xs text-slate-500">Read what professionals are saying about CVeat.</p>
              </div>
              <button
                onClick={() => setIsAllTestimonialsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map((item) => (
                <div key={item.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between relative">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-amber-400 text-sm">
                        {Array.from({ length: item.rating }).map((_, i) => (<span key={i}>★</span>))}
                      </div>
                      {currentUserId && item.user_id === currentUserId && (
                        <button
                          onClick={() => {
                            setIsAllTestimonialsOpen(false)
                            handleOpenEditModal(item)
                          }}
                          className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
                        >
                          Edit Review
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 italic leading-relaxed">"{item.text}"</p>
                  </div>
                  <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-200">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">{item.initial}</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                      <p className="text-xs text-slate-500">{item.profession}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Login Required Popup Modal */}
      {isLoginPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900 text-center space-y-4">
            <button
              onClick={() => setIsLoginPromptOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">
              🔒
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Authentication Required</h3>
              <p className="text-xs text-slate-500">Please sign in or create an account to share your testimonial with the community.</p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setIsLoginPromptOpen(false)
                  const allButtons = Array.from(document.querySelectorAll('button, a'))
                  const signUpBtn = allButtons.find(el => el.textContent?.toLowerCase().includes('get started') || el.textContent?.toLowerCase().includes('sign up'))
                  if (signUpBtn) {
                    (signUpBtn as HTMLElement).click()
                  } else {
                    router.push('/onboard')
                  }
                }}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
              >
                Sign Up (Get Started)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Testimonial Modal Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 relative text-slate-900">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-2xl font-extrabold text-slate-900 mb-1">
              {isEditing ? 'Edit Your Testimonial' : 'Share Your Experience'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {isEditing ? 'Update your review for the Cveat community.' : 'Add your testimonial to the Cveat community.'}
            </p>

            {formError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddTestimonialSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newTestimonial.name}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Profession *</label>
                  <input
                    type="text"
                    value={newTestimonial.profession}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, profession: e.target.value })}
                    placeholder="e.g. Developer"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Star Rating</label>
                <div className="flex items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewTestimonial({ ...newTestimonial, rating: star })}
                      className={`text-2xl transition-colors cursor-pointer ${star <= newTestimonial.rating ? 'text-amber-400' : 'text-slate-300'}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-slate-600">({newTestimonial.rating} / 5)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Your Testimonial (<span className="text-indigo-600">Max 250 words</span>) *
                </label>
                <textarea
                  rows={4}
                  value={newTestimonial.text}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, text: e.target.value })}
                  placeholder="How did Cveat help your job search or resume building?"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  {isEditing ? 'Save Changes' : 'Publish Testimonial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEO Optimized FAQ Section */}
      <section className="mx-auto max-w-4xl px-6 py-20 border-t border-slate-100">
      <div className="text-center space-y-4 mb-12">
          <div className="mb-4 inline-block">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Got Questions
            </span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Everything you need to know about our resume builder, AI ATS checker, and credit plans.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index
            return (
              <div 
                key={index}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <span className="text-base">{faq.question}</span>
                  <span className={`transform transition-transform duration-300 text-indigo-600 font-bold text-lg ${isOpen ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Blog Section with Dynamic Supabase Articles */}
      <section id="blog" className="mx-auto max-w-6xl px-6 py-20 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Latest Career & ATS Insights</h2>
            <p className="mt-2 text-sm text-slate-600">Expert tips to help you optimize your resume, beat automated screening bots, and ace interviews.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/blog">
              <button className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap">
                See More Blogs 
              </button>
            </Link>
            {isAdmin && (
              <Link href="/admin/blog">
                <button className="rounded-xl bg-amber-500 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition-all cursor-pointer whitespace-nowrap">
                   Admin Dashboard
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Dynamic Latest 3 Blogs Grid */}
        {latestBlogs.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-sm font-bold text-slate-700">No blog posts published yet.</p>
            <p className="text-xs text-slate-500 mt-1">Published articles will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {latestBlogs.map((blog) => (
              <div key={blog.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                    {blog.category}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-3 leading-snug">{blog.title}</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">{blog.excerpt}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">{new Date(blog.created_at).toLocaleDateString()}</span>
                  <Link href={`/articles/${blog.slug}`}>
                    <span className="font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer inline-block">Read Article </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 px-6 border-t border-slate-800">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4 md:col-span-1">
            <h3 className="text-xl font-black tracking-tight text-white">CVeat</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Empowering experienced professionals to bypass automated ATS filters and land interviews faster. CVeat provides a free ATS resume scanning and optimization tool designed for job seekers.</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/ats-checker" className="hover:text-white transition-colors">ATS Checker</Link></li>
              <li><Link href="/interview-prep" className="hover:text-white transition-colors">Interview-Prep</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Support</h4>
            <p className="text-xs text-slate-400">Need help? Reach out to our team.</p>
            <Link href="/contact">
              <button className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer">
                Contact Support
              </button>
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl pt-8 border-t border-slate-900 text-xs text-slate-500">
          <p>© 2026 CVeat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
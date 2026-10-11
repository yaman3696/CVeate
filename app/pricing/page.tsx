'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'

export default function PricingPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  // Dotted network particle animation effect
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

    const particles = Array.from({ length: 25 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
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
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - dist / 120)})`
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

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  const handlePlanClick = async (planName: string, isFree: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'signin' }))
        return
      }

      if (isFree) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_name')
          .eq('id', user.id)
          .single()

        if (profile && profile.plan_name && profile.plan_name !== 'Freemium' && profile.plan_name !== 'Starter') {
          alert(`You are currently on the ${profile.plan_name} plan.`)
        } else {
          alert('You are already a Freemium member!')
        }
      } else {
        setLoadingPlan(planName)
        setTimeout(() => {
          alert('Gateway coming soon! Payment processing is currently under development.')
          setLoadingPlan(null)
        }, 500)
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'signin' }))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6 text-slate-900 flex flex-col justify-center relative overflow-hidden">
      {/* Dotted Network Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none h-full w-full opacity-60 z-0"
      />

      <div className="mx-auto max-w-6xl w-full space-y-12 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline inline-block">
             Back to Home
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Simple, Transparent <span className="text-indigo-600">Pricing Plans</span>
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Enjoy unlimited resume building for free. Scale your AI ATS optimization checks with our high-value subscription tiers.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch pt-4">
          
          {/* 1. Freemium Plan */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200 p-7 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Starter</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Freemium</h3>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">0 <span className="text-xs font-normal text-slate-500">/ forever</span></p>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 pt-2 border-t border-slate-100 text-left">
                <li className="flex items-start gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span> <span><strong>Unlimited CV Generator</strong> (Guests & Users)</span></li>
                <li className="flex items-start gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span> <span>2 Free ATS Checks / 24 Hours</span></li>
                <li className="flex items-start gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span> <span>Standard ATS-ready PDF Export</span></li>
              </ul>
            </div>
            <div className="pt-4">
              <button 
                onClick={() => handlePlanClick('Freemium', true)}
                className="w-full rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
              >
                Get Started Free
              </button>
            </div>
          </div>

          {/* 2. Daily Plan */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-indigo-600 p-7 shadow-xl flex flex-col justify-between space-y-6 relative ring-2 ring-indigo-600/20 hover:shadow-2xl transition-shadow">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
              Most Popular
            </div>
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Daily Booster</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">24-Hour Pass</h3>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">49/- <span className="text-xs font-normal text-slate-500">/ 24 hours</span></p>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 pt-2 border-t border-slate-100 text-left">
                <li className="flex items-start gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span> <span><strong>10 ATS Checks</strong></span></li>
                <li className="flex items-start gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span> <span>Unlimited CV Generator Access</span></li>
                <li className="flex items-start gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span> <span>High-Precision Match Engine</span></li>
              </ul>
            </div>
            <div className="pt-4">
              <button
                onClick={() => handlePlanClick('Daily Pass', false)}
                disabled={loadingPlan === 'Daily Pass'}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingPlan === 'Daily Pass' ? 'Processing...' : 'Buy Daily Pass'}
              </button>
            </div>
          </div>

          {/* 3. Monthly Plan */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200 p-7 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Power Seeker</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Monthly Pro</h3>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">999/- <span className="text-xs font-normal text-slate-500">/ month</span></p>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 pt-2 border-t border-slate-100 text-left">
                <li className="flex items-start gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span> <span><strong>400 ATS Checks / Month</strong></span></li>
                <li className="flex items-start gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span> <span>Unlimited CV Generator Access</span></li>
                <li className="flex items-start gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span> <span>Priority AI Keyword Engine</span></li>
              </ul>
            </div>
            <div className="pt-4">
              <button
                onClick={() => handlePlanClick('Monthly Pro', false)}
                disabled={loadingPlan === 'Monthly Pro'}
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingPlan === 'Monthly Pro' ? 'Processing...' : 'Subscribe Monthly'}
              </button>
            </div>
          </div>

          {/* 4. Enterprise Plan (Locked & Coming Soon with Gradient) */}
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950 text-white rounded-3xl border border-indigo-900/50 p-7 shadow-xl flex flex-col justify-between space-y-6 relative">
            
            {/* Centered Coming Soon Badge */}
            <div className="flex justify-center">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Coming Soon
              </span>
            </div>

            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-900/60 text-indigo-300 flex items-center justify-center border border-indigo-700/50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Recruiter Suite</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">Enterprise</h3>
                <p className="text-3xl font-extrabold text-white mt-2">Custom <span className="text-xs font-normal text-slate-400">/ pricing</span></p>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 pt-2 border-t border-slate-800 text-left">
                <li className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  <span>Direct Database Access to Users</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  <span>Filter by Experience, Pay & Position</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  <span>Notice Period & Active Status Filters</span>
                </li>
              </ul>
            </div>
            <div className="pt-4">
              <button
                onClick={() => handlePlanClick('Enterprise', false)}
                className="w-full rounded-xl bg-slate-800/80 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700/80 transition-all cursor-pointer border border-slate-700/60"
              >
                Contact Sales
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
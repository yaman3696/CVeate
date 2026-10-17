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
window.dispatchEvent(new CustomEvent('open-auth-modal', { detail:
'signin' }))
return
}
if (isFree) {
const { data: profile } = await supabase
.from('profiles')
.select('plan_name')
.eq('id', user.id)
.single()
if (profile && profile.plan_name && profile.plan_name !== 'Freemium' &&
profile.plan_name !== 'Starter') {
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
window.dispatchEvent(new CustomEvent('open-auth-modal', { detail:
'signin' }))
}
}

  const plans = [
    {
      name: 'Freemium', eyebrow: 'STARTER', price: '₹0', period: '/ forever',
      description: 'Everything you need to build a professional CV.',
      features: ['Unlimited CV Generator (Guests & Users)', '2 Free ATS Checks / 24 Hours', 'Standard ATS-ready PDF Export'],
      button: 'Get Started Free', free: true, popular: false, enterprise: false,
    },
    {
      name: '24-Hour Pass', eyebrow: 'DAILY BOOSTER', price: '₹49', period: '/ 24 hours',
      description: 'Extra ATS checks for an active application day.',
      features: ['10 ATS Checks', 'Unlimited CV Generator Access', 'High-Precision Match Engine'],
      button: 'Buy Daily Pass', action: 'Daily Pass', free: false, popular: true, enterprise: false,
    },
    {
      name: 'Monthly Pro', eyebrow: 'POWER SEEKER', price: '₹999', period: '/ month',
      description: 'More room to refine applications throughout the month.',
      features: ['400 ATS Checks / Month', 'Unlimited CV Generator Access', 'Priority AI Keyword Engine'],
      button: 'Subscribe Monthly', action: 'Monthly Pro', free: false, popular: false, enterprise: false,
    },
    {
      name: 'Enterprise', eyebrow: 'RECRUITER SUITE', price: 'Custom', period: '/ pricing',
      description: 'Recruitment tools for teams and organizations.',
      features: ['Direct Database Access to Users', 'Filter by Experience, Pay & Position', 'Notice Period & Active Status Filters'],
      button: 'Contact Sales', action: 'Enterprise', free: false, popular: false, enterprise: true,
    },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-50/80 via-[#fafaff] to-white px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-40" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-indigo-200/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <header className="mb-8 text-center sm:mb-10">
            <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-800">← Back to Home</Link>
            <div className="mx-auto mt-3 w-fit rounded-full border border-indigo-100 bg-white/90 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-600 shadow-sm">✦ Simple & Transparent Pricing</div>
            <h1 className="mt-4 text-[32px] font-black leading-[1.13] tracking-tight text-slate-950 sm:text-[42px] lg:text-[48px]">
              Your next opportunity.<br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Your perfect plan.</span>
            </h1>
          </header>

          {/* Wide horizontal cards: two columns on desktop, one on mobile */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`group relative flex h-full flex-col rounded-[26px] border p-5 shadow-[0_12px_35px_rgba(37,43,94,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(79,70,229,0.15)] sm:p-6 ${plan.enterprise ? 'border-indigo-900/60 bg-gradient-to-br from-slate-900 to-indigo-950 text-white' : plan.popular ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/15' : 'border-indigo-100 bg-white hover:border-indigo-300'}`}
              >
                {plan.popular && (
  <span className="absolute -top-3 right-6 z-20 flex h-7 w-32 items-center justify-center whitespace-nowrap rounded-full bg-indigo-600 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md shadow-indigo-500/20">
    Most Popular
  </span>
)}

{plan.enterprise && (
  <span className="absolute -top-3 right-6 z-20 flex h-7 w-32 items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 text-[10px] font-extrabold uppercase tracking-wide text-slate-950 shadow-md shadow-amber-500/20">
    Coming Soon
  </span>
)}
                
                <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-6">
                  <div className="flex min-w-0 flex-col">
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-xl font-black ${plan.enterprise ? 'border border-indigo-700 bg-indigo-800/60 text-indigo-200' : 'bg-indigo-50 text-indigo-600'}`} aria-hidden="true">
                      {plan.enterprise ? '⌁' : plan.popular ? '↗' : plan.free ? '✦' : '◎'}
                    </div>
                    <div className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${plan.enterprise ? 'text-indigo-300' : 'text-indigo-600'}`}>{plan.eyebrow}</div>
                    <h2 className={`mt-1 text-[23px] font-extrabold tracking-tight ${plan.enterprise ? 'text-white' : 'text-slate-950'}`}>{plan.name}</h2>
                    <p className={`mt-1 text-xs leading-5 ${plan.enterprise ? 'text-indigo-100/75' : 'text-slate-500'}`}>{plan.description}</p>
                    <div className="mt-auto pt-4">
                      <span className="text-[34px] font-black leading-none tracking-tight">{plan.price}</span>
                      <span className={`ml-1 text-[11px] font-medium ${plan.enterprise ? 'text-slate-300' : 'text-slate-500'}`}>{plan.period}</span>
                    </div>
                  </div>
                  <div className={`flex min-w-0 flex-col justify-between border-t pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-1 ${plan.enterprise ? 'border-white/15' : 'border-slate-100'}`}>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className={`flex items-start gap-2.5 text-xs leading-5 ${plan.enterprise ? 'text-slate-200' : 'text-slate-600'}`}>
                          <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${plan.enterprise ? 'bg-white/10 text-indigo-200' : 'bg-indigo-50 text-indigo-600'}`}>✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => handlePlanClick(plan.action ?? plan.name, plan.free)}
                      disabled={loadingPlan === (plan.action ?? plan.name)}
                      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold transition-all duration-300 disabled:cursor-wait disabled:opacity-60 ${plan.enterprise ? 'border border-white/15 bg-white/10 text-white hover:bg-white/20' : plan.popular ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700' : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                    >
                      {loadingPlan === (plan.action ?? plan.name) ? 'Processing...' : plan.button}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-7 text-center text-xs leading-6 text-slate-500">Paid checkout is currently under development. Selecting a paid plan will not charge you.</p>
        </div>
      </section>
    </main>
  )
}

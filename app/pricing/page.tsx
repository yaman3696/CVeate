'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Pack = {
  name: string
  eyebrow: string
  price: string
  description: string
  features: string[]
  popular?: boolean
  free?: boolean
}

const packs: Pack[] = [
  {
    name: 'Free', eyebrow: 'GET STARTED', price: '₹0', free: true,
    description: 'Build your resume and explore Cveat at no cost.',
    features: ['Free CV builder and PDF export', '3 one-time welcome Career Credits for new accounts', 'No automatic daily or monthly credit refills'],
  },
  {
    name: 'Starter', eyebrow: 'TRY MORE', price: '₹19',
    description: 'A little extra support for your next application.',
    features: ['3 Career Credits', 'Use credits for eligible AI ATS and interview tools', 'One-time pack, not a subscription'],
  },
  {
    name: 'Growth', eyebrow: 'MOST POPULAR', price: '₹49', popular: true,
    description: 'For job seekers actively refining their applications.',
    features: ['10 Career Credits', 'Use across eligible AI tools', 'One-time pack, not a subscription'],
  },
  {
    name: 'Career Pro', eyebrow: 'BEST VALUE', price: '₹99',
    description: 'More flexibility for repeated applications and practice.',
    features: ['25 Career Credits', 'Use across eligible AI tools', 'One-time pack, not a subscription'],
  },
]

export default function PricingPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [comingSoon, setComingSoon] = useState<string | null>(null)
  const [enterpriseOpen, setEnterpriseOpen] = useState(false)
  const [company, setCompany] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [requirement, setRequirement] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let frame = 0
    let width = 0
    let height = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const particles = Array.from({ length: 25 }, () => ({
      x: Math.random() * width, y: Math.random() * height,
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
          const dist = Math.hypot(dx, dy)
          if (dist < 120) {
            ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - dist / 120)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
        ctx.fillStyle = 'rgba(99,102,241,0.3)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      frame = window.requestAnimationFrame(render)
    }
    frame = window.requestAnimationFrame(render)
    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  const submitEnterprise = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const subject = `Cveat Enterprise Enquiry - ${company.trim()}`
    const body = [
      `Company: ${company.trim()}`,
      `Contact: ${contact.trim()}`,
      `Business email: ${email.trim()}`,
      `Hiring needs: ${requirement}`,
      '', 'Message:', message.trim(),
    ].join('\n')
    window.location.href = `mailto:support@cveat.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-50/80 via-[#fafaff] to-white px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-40" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-indigo-200/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <header className="mb-10 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">← Back to Home</Link>
            <div className="mx-auto mt-4 w-fit rounded-full border border-indigo-100 bg-white/90 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-600 shadow-sm">✦ Simple & transparent pricing</div>
            <h1 className="mt-4 text-[32px] font-black leading-[1.13] tracking-tight text-slate-950 sm:text-[42px] lg:text-[48px]">
              Your next opportunity.<br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Your perfect plan.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600">Create your CV for free. When you need extra AI assistance, choose Career Credits that suit your journey.</p>
          </header>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            {packs.map((pack) => (
              <article key={pack.name} className={`group relative flex h-full flex-col rounded-[26px] border bg-white p-5 shadow-[0_12px_35px_rgba(37,43,94,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(79,70,229,0.15)] sm:p-6 ${pack.popular ? 'border-indigo-500 ring-2 ring-indigo-500/15' : 'border-indigo-100 hover:border-indigo-300'}`}>
                {pack.popular && <span className="absolute -top-3 right-6 flex h-7 w-32 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md">Most Popular</span>}
                <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-6">
                  <div className="flex min-w-0 flex-col">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl font-black text-indigo-600">{pack.free ? '✦' : pack.popular ? '↗' : '◎'}</div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-600">{pack.eyebrow}</div>
                    <h2 className="mt-1 text-[23px] font-extrabold tracking-tight text-slate-950">{pack.name}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{pack.description}</p>
                    <div className="mt-auto pt-4"><span className="text-[34px] font-black leading-none tracking-tight">{pack.price}</span><span className="ml-1 text-[11px] font-medium text-slate-500">{pack.free ? '/ forever' : '/ one-time'}</span></div>
                  </div>
                  <div className="flex min-w-0 flex-col justify-between border-t border-slate-100 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-1">
                    <ul className="space-y-3">{pack.features.map((feature) => <li key={feature} className="flex items-start gap-2.5 text-xs leading-5 text-slate-600"><span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-black text-indigo-600">✓</span><span>{feature}</span></li>)}</ul>
                    {pack.free ? (
                      <Link href="/" className="mt-5 flex w-full items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-xs font-extrabold text-indigo-700 transition-colors hover:bg-indigo-600 hover:text-white">Start building free →</Link>
                    ) : (
                      <button type="button" onClick={() => setComingSoon(pack.name)} className={`mt-5 flex w-full items-center justify-center rounded-xl px-3 py-3 text-xs font-extrabold transition-colors ${pack.popular ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700' : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white'}`}>Coming Soon →</button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <section className="relative mt-8 overflow-hidden rounded-[28px] border border-indigo-900/60 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-9">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" aria-hidden="true" />
            <div className="relative grid gap-7 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
              <div>
                <span className="inline-flex rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-200">Cveat for Business</span>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Smarter hiring, built around your team.</h2>
                <p className="mt-3 max-w-lg text-sm leading-7 text-indigo-100/80">From discovering suitable candidates to AI-assisted screening and structured interviews, let's design a recruitment workflow that fits your hiring goals.</p>
                <div className="mt-6 flex flex-wrap items-center gap-3"><span className="text-2xl font-extrabold">Custom pricing</span><span className="text-xs text-indigo-200">Based on hiring volume and requirements</span></div>
                <button type="button" onClick={() => setEnterpriseOpen(true)} className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-indigo-900 transition-colors hover:bg-indigo-100">Enquire about Enterprise →</button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['Candidate sourcing', 'Assistance identifying relevant talent'],
                  ['AI-assisted screening', 'Structured, role-based resume reviews'],
                  ['Interview workflows', 'AI-assisted interview questions and evaluations'],
                  ['Hiring insights', 'Candidate comparisons and screening summaries'],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-2 text-lg text-indigo-200">✦</div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-indigo-100/70">{detail}</p></div>
                ))}
              </div>
            </div>
          </section>
          <p className="mt-7 text-center text-xs leading-6 text-slate-500">Credit packs are previews and cannot be purchased yet. Welcome credits are issued once to eligible new accounts; no daily or monthly replenishment is advertised.</p>
        </div>
      </section>

      {comingSoon && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setComingSoon(null) }}><div role="dialog" aria-modal="true" aria-labelledby="coming-soon-title" className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">✦</div><h2 id="coming-soon-title" className="mt-4 text-2xl font-black">Coming soon!</h2><p className="mt-3 text-sm leading-6 text-slate-600">The {comingSoon} Career Credit pack is not available for purchase yet. You can continue using Cveat's free tools in the meantime.</p><button type="button" onClick={() => setComingSoon(null)} className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Got it</button></div></div>}

      {enterpriseOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEnterpriseOpen(false) }}><div role="dialog" aria-modal="true" aria-labelledby="enterprise-title" className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Cveat for Business</p><h2 id="enterprise-title" className="mt-1 text-2xl font-black text-slate-900">Tell us about your hiring needs</h2></div><button type="button" onClick={() => setEnterpriseOpen(false)} aria-label="Close enquiry form" className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button></div><p className="mt-2 text-xs leading-5 text-slate-500">Submitting opens your email application with a prepared message to support@cveat.in. Please send the email to complete your enquiry.</p><form onSubmit={submitEnterprise} className="mt-5 space-y-4">{[
        { label: 'Company name', value: company, setter: setCompany, type: 'text' },
        { label: 'Your name', value: contact, setter: setContact, type: 'text' },
        { label: 'Business email', value: email, setter: setEmail, type: 'email' },
      ].map((field) => <label key={field.label} className="block text-xs font-semibold text-slate-700">{field.label}<input required type={field.type} value={field.value} onChange={(event) => field.setter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>)}<label className="block text-xs font-semibold text-slate-700">What do you need?<select required value={requirement} onChange={(event) => setRequirement(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"><option value="">Select a service</option><option>Candidate sourcing</option><option>AI-assisted screening</option><option>AI interview workflows</option><option>End-to-end recruitment support</option><option>Custom enterprise solution</option></select></label><label className="block text-xs font-semibold text-slate-700">Tell us more<textarea required rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Roles, hiring volume, timelines or other requirements" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500" /></label><button type="submit" className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Open email to send enquiry →</button></form></div></div>}
    </main>
  )
}

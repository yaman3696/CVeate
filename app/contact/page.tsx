'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    query: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.query.trim()) {
      setError('Please fill out all required fields, including your contact number.')
      return
    }

    const phoneRegex = /^[0-9]{10}$/
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid 10-digit contact number.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const contentType = res.headers.get("content-type")
      let data
      if (contentType && contentType.includes("application/json")) {
        data = await res.json()
      } else {
        throw new Error(`Server error (${res.status}): Please ensure your API route exists.`)
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit form.')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  } // <-- FIXED: handleSubmit now properly closes here!

  // Canvas Network Animation Effect (Now cleanly outside handleSubmit)
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

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 1.5 + 1,
    }))

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 110) {
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 * (1 - dist / 110)})`
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

        ctx.fillStyle = 'rgba(59, 130, 246, 0.35)'
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

  return (
    <div className="relative min-h-[calc(100vh-73px)] bg-slate-50 py-12 px-6 text-slate-900 flex flex-col justify-center overflow-hidden">
      
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none h-full w-full opacity-90"
      />

      <div className="relative z-10 mx-auto max-w-5xl w-full space-y-8">
        
        <div>
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline">
             ← Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Contact Support</h1>
          <p className="text-sm text-slate-600 mt-1">Have questions about ATS optimization, your account, or custom resume formatting? We're here to help.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 p-8 shadow-sm">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">✓</div>
                <h3 className="text-xl font-bold text-slate-900">Message Sent Successfully!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Thank you, <strong>{formData.name}</strong>. Your query has been forwarded to <strong>support@cveat.in</strong>. Our team will get back to you at <strong>{formData.email}</strong> within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setFormData({ name: '', email: '', phone: '', query: '' })
                  }}
                  className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Send Us a Message</h3>
                
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Your Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Yaman"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Email ID *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. yaman@example.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Contact Number (10 Digits) *</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="9876543210"
                      className="w-full rounded-r-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Your Query / Message *</label>
                  <textarea
                    rows={4}
                    value={formData.query}
                    onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                    placeholder="Describe how we can assist you..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 leading-relaxed bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Sending Query...' : 'Send Message to Support'}
                </button>
              </form>
            )}
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Contact Details</h3>
                <p className="text-xs text-slate-400">Reach out through our office or official channels.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <strong className="block uppercase tracking-wider text-indigo-400 mb-1 text-[10px]">Office Address</strong>
                  <p className="text-slate-300 leading-relaxed">
                    CVeat Headquarters<br />
                    Mayur Vihar Phase 1<br />
                    New Delhi, Delhi, 110001, India
                  </p>
                </div>

                <div>
                  <strong className="block uppercase tracking-wider text-indigo-400 mb-1 text-[10px]">Contact Number</strong>
                  <p className="text-slate-300">+91 (882) 673-3504</p>
                </div>

                <div>
                  <strong className="block uppercase tracking-wider text-indigo-400 mb-1 text-[10px]">Email Support</strong>
                  <p className="text-slate-300">support@cveat.in</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <strong className="block uppercase tracking-wider text-indigo-400 mb-3 text-[10px]">Social Media Handles</strong>
              <div className="flex flex-wrap gap-2 text-xs">
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                  LinkedIn
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                  Instagram
                </a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                  Twitter (X)
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
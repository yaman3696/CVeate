'use client'
import AnimatedNetwork from '@/components/AnimatedNetwork'

import { useState } from 'react'
import Link from 'next/link'
import { useSiteSettings } from '@/components/site/SiteSettingsProvider'
import { SiteSocialLinks } from '@/components/site/SiteDetails'

export default function ContactPage() {
  const site = useSiteSettings()
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



  return (
    <div className="relative min-h-[calc(100vh-73px)] bg-slate-50 py-12 px-6 text-slate-900 flex flex-col justify-center overflow-hidden dark:bg-[#0B1120] dark:text-slate-100 transition-colors duration-300">
      
      <AnimatedNetwork />

      <div className="relative z-10 mx-auto max-w-5xl w-full space-y-8">
        
        <div>
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors duration-300">
             ← Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Contact Support</h1>
          <p className="text-sm text-slate-600 mt-1 dark:text-slate-300 transition-colors duration-300">Have questions about ATS optimization, your account, or custom resume formatting? We're here to help.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 p-8 shadow-sm dark:bg-[#1B263B]/95 dark:border-slate-700/70 dark:shadow-black/25 transition-colors duration-300">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold dark:bg-emerald-400/15 dark:text-emerald-300 transition-colors duration-300">✓</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">Message Sent Successfully!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto dark:text-slate-300 transition-colors duration-300">
                  Thank you, <strong>{formData.name}</strong>. Your query has been forwarded to <strong>support@cveat.in</strong>. Our team will get back to you at <strong>{formData.email}</strong> within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setFormData({ name: '', email: '', phone: '', query: '' })
                  }}
                  className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 cursor-pointer dark:hover:bg-indigo-700 dark:shadow-black/25 transition-colors duration-300"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-lg font-bold text-slate-900 mb-2 dark:text-slate-100 transition-colors duration-300">Send Us a Message</h3>
                
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600 dark:bg-red-400/10 dark:border-red-400/30 dark:text-red-300 transition-colors duration-300">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300 transition-colors duration-300">Your Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white dark:bg-[#111C30] dark:text-slate-100 dark:border-slate-700/70 dark:focus:ring-indigo-400 dark:placeholder:text-slate-400 dark:[color-scheme:dark] transition-colors duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300 transition-colors duration-300">Email ID *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. johndoe@example.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white dark:bg-[#111C30] dark:text-slate-100 dark:border-slate-700/70 dark:focus:ring-indigo-400 dark:placeholder:text-slate-400 dark:[color-scheme:dark] transition-colors duration-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300 transition-colors duration-300">Contact Number (10 Digits) *</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs dark:bg-[#26344D] dark:text-slate-400 dark:border-slate-700/70 transition-colors duration-300">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="9876543210"
                      className="w-full rounded-r-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 bg-white dark:bg-[#111C30] dark:text-slate-100 dark:border-slate-700/70 dark:focus:ring-indigo-400 dark:placeholder:text-slate-400 dark:[color-scheme:dark] transition-colors duration-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 dark:text-slate-300 transition-colors duration-300">Your Query / Message *</label>
                  <textarea
                    rows={4}
                    value={formData.query}
                    onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                    placeholder="Describe how we can assist you..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 leading-relaxed bg-white resize-none dark:bg-[#111C30] dark:text-slate-100 dark:border-slate-700/70 dark:focus:ring-indigo-400 dark:placeholder:text-slate-400 dark:[color-scheme:dark] transition-colors duration-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50 dark:hover:bg-indigo-700 dark:shadow-black/25"
                >
                  {loading ? 'Sending Query...' : 'Send Message to Support'}
                </button>
              </form>
            )}
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between space-y-6 dark:bg-[#111C30] dark:shadow-black/25 transition-colors duration-300">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Contact Details</h3>
                <p className="text-xs text-slate-400">Reach out through our office or official channels.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <strong className="block uppercase tracking-wider text-indigo-400 mb-1 text-[10px] dark:text-indigo-300 transition-colors duration-300">Office Address</strong>
                  <p className="text-slate-300 leading-relaxed">
                    <span className="whitespace-pre-line">{site.address}</span>
                  </p>
                </div>

                <div>
                  <strong className="block uppercase tracking-wider text-indigo-400 mb-1 text-[10px] dark:text-indigo-300 transition-colors duration-300">Contact Number</strong>
                  <p className="text-slate-300">{site.phone}</p>
                </div>

                <div>
                  <strong className="block uppercase tracking-wider text-indigo-400 mb-1 text-[10px] dark:text-indigo-300 transition-colors duration-300">Email Support</strong>
                  <a href={`mailto:${site.supportEmail}`} className="text-slate-300">{site.supportEmail}</a>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <strong className="block uppercase tracking-wider text-indigo-400 mb-3 text-[10px] dark:text-indigo-300 transition-colors duration-300">Social Media Handles</strong>
              <SiteSocialLinks />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

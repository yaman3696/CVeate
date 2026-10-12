'use client'

import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 py-16 px-6">
      <div className="mx-auto max-w-4xl space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Empowering Experienced Professionals to <span className="text-indigo-600">Beat the ATS Bots</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We believe your career achievements shouldn't be filtered out just because an automated parser couldn't read your formatting.
          </p>
        </div>

        {/* When & Why We Started */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center border-t border-slate-100 pt-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">When & Why We Started</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cveat was founded out of a glaring industry reality: highly skilled, experienced professionals with years of corporate excellence were getting rejected instantly during job applications. 
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              The culprit wasn't their lack of talent—it was Applicant Tracking Systems (ATS). Complex multi-column layouts, custom graphics, and unoptimized bullet points were causing corporate software to discard stellar resumes before a human recruiter ever saw them. We built Cveat to level the playing field.
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-8 space-y-4">
            <h3 className="text-lg font-bold text-indigo-900">The Problem We Solve</h3>
            <ul className="space-y-3 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✕</span> Traditional designer CVs get scrambled by automated ATS parsers.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✕</span> High-performing professionals struggle to translate daily impact into keyword-rich achievements.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">✓</span> Cveat bridges visual polish with rigid ATS compliance and instant PDF generation.
              </li>
            </ul>
          </div>
        </div>

        {/* Our Motto & Principles */}
        <div className="border-t border-slate-100 pt-12">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Our Motto & Guiding Principles</h2>
            <p className="mt-2 text-sm text-slate-600">The core values that drive every feature we ship.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">01</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Uncompromising Clarity</h3>
              <p className="text-xs text-slate-600 leading-relaxed">We keep designs clean, readable, and structured so human recruiters and machine algorithms parse data with 100% accuracy.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">02</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Candidate First</h3>
              <p className="text-xs text-slate-600 leading-relaxed">No paywalls hiding your own data, no bloated code, and no hidden print templates. Your career tools should work for you.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">03</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Actionable Excellence</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Empowering professionals to highlight measurable growth metrics, high-impact action verbs, and core industry keywords.</p>
            </div>
          </div>
        </div>

        {/* CTA Footer Banner */}
        <div className="rounded-3xl bg-indigo-600 p-10 text-center text-white space-y-4 shadow-xl">
          <h2 className="text-2xl font-extrabold tracking-tight">Ready to build your ATS-ready resume?</h2>
          <p className="text-xs text-indigo-100 max-w-lg mx-auto">Join thousands of professionals landing interviews faster.</p>
          <div className="pt-2">
            <Link href="/onboard">
              <button className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-indigo-600 shadow-md hover:bg-slate-100 transition-all">
                Get Started Now
              </button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="relative min-h-[calc(100vh-73px)] bg-slate-50 py-12 px-6 text-slate-900 flex flex-col justify-center overflow-hidden">
      <div className="relative z-10 mx-auto max-w-3xl w-full space-y-6">
        <div>
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Terms & Conditions</h1>
          <p className="text-xs text-slate-500 mt-1">Last updated: October 2026</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 p-8 shadow-sm space-y-5 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accessing and using CVeate, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use our service.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">2. Use of CV Templates and Tools</h2>
            <p>
              All resume templates, PDF generation tools, and AI-powered ATS checker features are provided for personal professional use. You are responsible for ensuring that the content you input into your resume is accurate and truthful.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">3. Intellectual Property</h2>
            <p>
              The design, layout, source code, and branding of CVeate are protected by intellectual property rights. Users retain full ownership of the personal resume content and data they create on the platform.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">4. Limitation of Liability</h2>
            <p>
              While our ATS optimization tools are designed to improve compatibility with automated screening systems, CVeate does not guarantee employment or interview callbacks from employers.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
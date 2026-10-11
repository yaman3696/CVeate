import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="relative min-h-[calc(100vh-73px)] bg-slate-50 py-12 px-6 text-slate-900 flex flex-col justify-center overflow-hidden">
      <div className="relative z-10 mx-auto max-w-3xl w-full space-y-6">
        <div>
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Privacy Policy</h1>
          <p className="text-xs text-slate-500 mt-1">Last updated: October 2026</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 p-8 shadow-sm space-y-5 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">1. Information We Collect</h2>
            <p>
              When you use CVeate to build resumes or scan job descriptions, we store the profile details, work history, and job descriptions you provide in order to power your dashboard history and PDF exports.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">2. How We Use Your Data</h2>
            <p>
              Your data is used strictly to render your resume dashboard, execute AI-powered ATS analysis via secure API endpoints, and allow you to download your formatted CV documents. We do not sell or share your personal resume data with third parties.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">3. Data Security & Storage</h2>
            <p>
              We implement industry-standard security practices, utilizing secure database architecture and encrypted local session storage to protect your professional information.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">4. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, you can reach out to our support team at support@cveate.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
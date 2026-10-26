import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="relative min-h-[calc(100vh-73px)] bg-slate-50 py-12 px-6 text-slate-900 flex flex-col justify-center overflow-hidden dark:bg-[#0B1120] dark:text-slate-100 transition-colors duration-300">
      <div className="relative z-10 mx-auto max-w-4xl w-full space-y-6">
        <div>
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors duration-300">
             Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Terms & Conditions</h1>
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400 transition-colors duration-300">Last updated: October 2026</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed dark:bg-[#1B263B]/95 dark:text-slate-300 dark:border-slate-700/70 dark:shadow-black/25 dark:[&_strong]:text-slate-100 transition-colors duration-300">
          
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, or utilizing CVeat (cveat.in), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must immediately cease all use of our platform, resume builder, ATS rater, and related services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">2. Description of Services & User Responsibilities</h2>
            <p>
              CVeat provides free digital career tools, including an Applicant Tracking System (ATS) checker, AI-assisted resume formatting, and document generation wizards. 
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Accuracy of Information:</strong> You represent and warrant that all professional summaries, work histories, educational backgrounds, and personal data you input into the platform are accurate, truthful, and owned by you.</li>
              <li><strong>Prohibited Conduct:</strong> You agree not to upload malicious software, attempt unauthorized access to the database or administrative endpoints, reverse-engineer platform code, or scrape data through automated scripts.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">3. Recruiter Marketplace & Two-Sided Platform Guidelines</h2>
            <p>
              CVeat operates a growing talent-matching ecosystem connecting job seekers with hiring organizations.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>For Job Seekers:</strong> By opting into recruiter search visibility, you consent to making your professional resume data queryable by verified employers. You retain the right to toggle your profile privacy status at any time.</li>
              <li><strong>For Employers and Recruiters:</strong> Registered hiring partners agree to comply with all applicable local employment, labor, and anti-discrimination regulations. Candidate contact information and data retrieved from the talent database must be used exclusively for legitimate active job openings and recruitment purposes. Reselling or harvesting data is strictly prohibited.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">4. Intellectual Property Rights</h2>
            <p>
              All software architecture, user interface design, source code, visual branding, logos, and published educational blog materials associated with CVeat are the exclusive intellectual property of the platform and protected under international copyright laws. Users retain full ownership of the raw personal resume text and content they generate using our tools.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">5. Limitation of Liability and No Employment Guarantee</h2>
            <p>
              While our ATS optimization metrics and resume layout tools are designed to maximize compatibility with automated screening algorithms, <strong>CVeat does not guarantee employment, interview callbacks, or job offers</strong> from third-party employers. The platform acts solely as a technological utility and shall not be held liable for hiring decisions, recruitment outcomes, or third-party employer actions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">6. Modifications to Terms</h2>
            <p>
              We reserve the right to modify or update these Terms and Conditions at any time. Continued use of CVeat following any modifications constitutes your formal acceptance of the revised terms.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
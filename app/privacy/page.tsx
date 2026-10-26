import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="relative min-h-[calc(100vh-73px)] bg-slate-50 py-12 px-6 text-slate-900 flex flex-col justify-center overflow-hidden dark:bg-[#0B1120] dark:text-slate-100 transition-colors duration-300">
      <div className="relative z-10 mx-auto max-w-4xl w-full space-y-6">
        <div>
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors duration-300">
             Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Privacy Policy</h1>
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400 transition-colors duration-300">Last updated: October 2026</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed dark:bg-[#1B263B]/95 dark:text-slate-300 dark:border-slate-700/70 dark:shadow-black/25 dark:[&_strong]:text-slate-100 transition-colors duration-300">
          
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">1. Information We Collect</h2>
            <p>
              At CVeat (cveat.in), we respect your right to privacy. To provide robust resume building and ATS scoring services, we collect and store:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Account Registration Data:</strong> Names, email addresses, and secure authentication identifiers collected when creating an account or logging in.</li>
              <li><strong>Resume and Career Content:</strong> Professional work history, skills, educational credentials, and target job descriptions submitted during onboarding or tool usage to power your user dashboard.</li>
              <li><strong>Technical and Telemetry Data:</strong> Standard browser types, IP addresses, device information, and interaction records captured through server security logs.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">2. How We Use Your Data & Recruiter Talent Search Controls</h2>
            <p>
              Your data is processed strictly to maintain your dashboard, execute secure ATS compatibility algorithms, and allow PDF document exports. 
            </p>
            <p className="mt-2">
              As we expand into an employer marketplace, your data visibility remains entirely under your control:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Visibility Toggles:</strong> You can explicitly authorize or block verified recruiters from discovering your profile via candidate database searches. New accounts default to private.</li>
              <li><strong>Direct Applications:</strong> Submitting an application directly to a posted opening shares your resume package exclusively with that specific hiring entity.</li>
              <li><strong>No Data Sales:</strong> We never sell, trade, or rent personal resume records to third-party data brokers or marketing firms.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">3. Cookies, Caching, and Google AdSense Compliance</h2>
            <p>
              We utilize essential session cookies and encrypted local storage tokens (via Supabase) to manage secure user authentication and session continuity. Performance caching is utilized across edge networks (Vercel CDN) to optimize static assets and blog speed while ensuring private user data and dashboard routes bypass public caches entirely.
            </p>
            <p className="mt-2">
              Additionally, we partner with third-party advertising networks, including <strong>Google AdSense</strong>. Google uses cookies (such as DART cookies) to serve advertisements based on your prior visits to cveat.in and other web destinations. You can review Google’s privacy practices and opt out of personalized advertising by visiting <a href="https://adssettings.google.com" target="_blank" rel="noopener" className="text-indigo-600 underline font-medium dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors duration-300">Google Ads Settings</a>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">4. Data Security & User Rights</h2>
            <p>
              We implement industry-standard security measures, including HTTPS/TLS encryption in transit and secure database protection protocols. You retain the absolute right to view, update, correct, or completely delete your personal account and associated resume records from our system at any time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">5. Contact Information</h2>
            <p>
              If you have any questions, compliance inquiries, or data removal requests regarding this Privacy Policy, please contact our administrative team at support@cveat.in.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
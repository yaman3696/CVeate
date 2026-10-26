import Link from 'next/link'
export default function AdminAccessDenied() {
  return <main className="min-h-screen bg-slate-50 p-8 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100"><h1 className="text-2xl font-bold">Access not granted</h1><p className="mt-3 text-sm">Your administrator account does not have permission for this section or action. Ask the designated owner to update your access.</p><Link href="/" className="mt-6 inline-block font-bold text-indigo-600 dark:text-indigo-300">Back to CVeat</Link></main>
}

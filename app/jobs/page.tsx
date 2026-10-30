import { Suspense } from 'react'
import type { Metadata } from 'next'
import JobsClient from './JobsClient'
export const metadata:Metadata={title:'Find jobs',description:'Explore verified employer job listings by Indian state, position, seniority and work mode.'}
export default function Page(){return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-10 dark:bg-[#0B1120]">Loading jobs…</main>}><JobsClient/></Suspense>}

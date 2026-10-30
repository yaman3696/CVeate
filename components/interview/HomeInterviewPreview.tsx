import InterviewOrb from './InterviewOrb'

/** Interview room preview using the shared idle orb, without microphone or avatar assets. */
export default function HomeInterviewPreview() {
  return <figure data-interview-preview className="mx-auto w-full max-w-[540px] overflow-hidden rounded-3xl border border-white/25 bg-white text-slate-900 shadow-2xl shadow-indigo-950/30 dark:border-slate-700 dark:bg-[#111c30] dark:text-slate-100">
    <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
      <div><p className="text-sm font-bold">AI interview room</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Interface preview · Sample content</p></div>
      <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">No camera needed</span>
    </figcaption>
    <div aria-hidden="true" className="p-3 sm:p-4">
      <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-slate-50 dark:border-slate-700 dark:from-[#1b2545] dark:to-[#111a2e]">
        <span className="absolute left-3 top-3 z-10 rounded-lg bg-white/80 px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">AI interviewer · Orb view</span>
        <div className="flex h-44 w-full items-center justify-center"><InterviewOrb state="idle" displaySize={240} /></div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400"><span>Question 1 of 5 · Example</span><span className="rounded-lg bg-indigo-50 px-2 py-1 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">Up to 5 min / answer</span></div>
      <div className="mt-3 flex gap-1.5">{[0,1,2,3,4].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i === 0 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />)}</div>
      <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Your question</p><p className="mt-2 text-sm font-semibold leading-6">Tell me about a challenge you faced at work and how you solved it.</p><div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px]"><span className="text-slate-500 dark:text-slate-400">Speak or type your answer</span><span className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white">Start my answer →</span></div></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px]"><span className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800"><span className="rounded-md bg-white px-3 py-1.5 font-semibold text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-200">Orb</span><span className="px-3 py-1.5 text-slate-500 dark:text-slate-400">3D interviewer</span></span><span className="text-slate-500 dark:text-slate-400">Audio only · No camera</span></div>
    </div>
    <p className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400">Speak or type, review your answers, then submit for AI feedback.</p>
  </figure>
}

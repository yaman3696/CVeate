'use client'
import { useEffect,useRef } from 'react'
export default function MicrophoneConsentDialog({live,onAgree,onKeyboard,onDismiss}:{live:boolean;onAgree:()=>void;onKeyboard:()=>void;onDismiss:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const element=dialog.current;if(!element)return;element.showModal();return()=>element.close()},[])
 return <dialog ref={dialog} onCancel={e=>{e.preventDefault();onDismiss()}} aria-labelledby="mic-consent-title" aria-describedby="mic-consent-description" className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-indigo-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm sm:p-8 dark:border-indigo-400/30 dark:bg-[#1B263B] dark:text-slate-100">
  <div className="flex items-start justify-between gap-4"><h2 id="mic-consent-title" className="text-xl font-bold">Before using your microphone</h2><button type="button" aria-label="Close microphone notice" onClick={onDismiss} className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-700">×</button></div>
  <p id="mic-consent-description" className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">Audio-only interview. No camera is needed or accessed. {live?"Live transcription may process speech with your browser’s speech provider. If unavailable, Google Gemini transcribes the recording.":"Google Gemini processes the recording for transcription."} Temporary audio remains in this tab for your review and is never saved to Supabase.</p>
  <div className="mt-6 flex flex-col gap-3">
   <button type="button" autoFocus onClick={onAgree} className="min-h-12 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">I agree, open mic to answer</button>
   <button type="button" onClick={onKeyboard} className="min-h-12 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Use my keyboard to type answers</button>
  </div>
 </dialog>
}

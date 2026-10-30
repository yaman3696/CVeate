"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Clock3, FileText, MessageSquare, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
const ConversationPractice=dynamic(()=>import("@/components/interview/ConversationPractice"),{ssr:false,loading:()=> <p role="status" className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">Preparing your interview setup…</p>});
import InterviewOrb from "@/components/interview/InterviewOrb";
import AnimatedNetwork from "@/components/AnimatedNetwork";

export default function InterviewPrepPage() {
  useEffect(() => { if (new URLSearchParams(window.location.search).get('source') === 'dashboard') setStarted(true) }, []);
  const [started,setStarted]=useState(false),[userId,setUserId]=useState<string|null>(null),[loading,setLoading]=useState(true);
  useEffect(() => {
    let mounted = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setUserId(data.session?.user.id || null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserId(session?.user.id || null);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  return (
    <main className={`relative min-h-screen overflow-hidden bg-slate-50 px-5 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 ${started?"py-6 sm:py-12":"py-10 sm:py-16"}`}>
      <AnimatedNetwork />
      <div aria-hidden="true" className="pointer-events-none absolute -top-44 left-1/2 h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-600/10" />
      <div className={`relative mx-auto ${started?"max-w-[1720px]":"max-w-6xl"}`}>
        {loading?<p role="status" className="py-24 text-center">Preparing your practice space…</p>:started?<ConversationPractice key={userId||"guest"} userId={userId} mode="conversation" onBack={()=>setStarted(false)}/>:<>
          <section className="grid items-center gap-10 lg:grid-cols-[1.12fr_1fr] lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300"><Sparkles size={14}/>Conversational AI interview</span>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.4rem]">A real conversation.<br/><span className="text-indigo-600 dark:text-indigo-300">A more confident you.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">Meet your AI practice interviewer. Get questions tailored to your CV and the role you want, answer in your own words, and turn one conversation into a clearer next step.</p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-600 dark:text-slate-300"><span className="inline-flex items-center gap-2"><Mic size={15} className="text-indigo-500"/>Speak or type</span><span className="inline-flex items-center gap-2"><Clock3 size={15} className="text-indigo-500"/>5 minutes per answer</span><span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-indigo-500"/>No camera needed</span></div>
              <button onClick={()=>{setStarted(true);window.scrollTo({top:0,behavior:"instant"})}} className="mt-8 inline-flex min-h-12 items-center justify-center gap-4 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/15 transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500">Start AI conversation<ArrowRight size={18}/></button>
              <p className="mt-4 text-xs leading-6 text-slate-500 dark:text-slate-400">Set up your role and add a CV, a job description, or both.<br/>One complete evaluation · <strong className="font-semibold text-slate-700 dark:text-slate-300">1 Career Credit</strong> · No charge per question.</p>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-100/80 via-violet-100/70 to-white p-6 shadow-sm sm:p-8 dark:border-indigo-400/30 dark:from-[#393073] dark:via-[#292453] dark:to-[#19253D]">
              <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-indigo-600 dark:text-indigo-200"><span className="inline-flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-indigo-400"/>Your AI interviewer</span><span className="rounded-full bg-white/60 px-3 py-1.5 dark:bg-white/5">Conversation preview</span></div>
              <div className="flex justify-center py-2 sm:py-4"><InterviewOrb/></div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-950/25"><span className="text-[9px] font-bold uppercase tracking-[.15em] text-indigo-600 dark:text-indigo-300">One question at a time</span><p className="mt-2 text-lg font-semibold leading-7 tracking-tight">“Tell me about a project you’re proud of. What was your contribution?”</p><p className="mt-3 flex items-center gap-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400"><MessageSquare size={14} className="shrink-0"/>Answer aloud, or type whenever you prefer.</p></div>
              <p className="mt-4 text-center text-[10px] leading-5 text-slate-500 dark:text-slate-400">Choose this orb or the 3D interviewer inside your session.</p>
            </div>
          </section>
          <section aria-labelledby="practice-flow-title" className="mt-14 border-t border-slate-200 pt-10 sm:mt-20 dark:border-slate-700/70">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">A little preparation. A real difference.</span><h2 id="practice-flow-title" className="mt-3 text-2xl font-bold tracking-tight">Your next interview, in three steps.</h2></div><p className="max-w-xs text-xs leading-6 text-slate-500 dark:text-slate-400">One practice flow. Speak, type, or use both as you go.</p></div>
            <ol role="list" className="mt-7 grid list-none! gap-5 pl-0! md:grid-cols-3">
              {[{icon:FileText,step:"01",title:"Make it about you",body:"Add your CV or job description and choose your role and seniority. AI prepares five relevant questions."},{icon:Mic,step:"02",title:"Find your own words",body:"Hear natural spoken questions. Take up to five minutes for each answer, or move on early. Typed answers are always available."},{icon:Check,step:"03",title:"Review. Refine. Grow.",body:"Listen back, edit your transcript, and submit when you’re ready for one complete AI evaluation."}].map(({icon:Icon,step,title,body})=><li key={step} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1B263B]"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300"><Icon size={19}/></span><span className="text-xs font-semibold text-slate-400">{step}</span></div><h3 className="mt-5 text-base font-bold">{title}</h3><p className="mt-3 text-xs leading-7 text-slate-500 dark:text-slate-400">{body}</p></li>)}
            </ol>
          </section>
          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 text-xs leading-6 text-slate-600 dark:border-indigo-400/20 dark:bg-indigo-400/5 dark:text-slate-300"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-indigo-500"/><p><strong className="font-semibold text-slate-800 dark:text-slate-100">Audio-only. No camera needed.</strong> Microphone use is optional and starts with your permission. Temporary recordings stay in your tab for playback and may be processed for transcription. Save your text answers and feedback to My History only when you choose.</p></div>
        </>}
      </div>
    </main>
  );
}

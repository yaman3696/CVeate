"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Flag, Maximize2, Mic, MicOff, Minimize2, Circle, UserRound, Volume2, VolumeX } from "lucide-react";
import InterviewOrb from "./InterviewOrb";
import "./InterviewRoom.css";
import { AVATAR_VIEWER_URL } from "./avatar-assets";
const styles: Record<string, string> = Object.fromEntries(["audioNotice", "badge", "controls", "devices", "done", "error", "eyebrow", "heading", "meta", "minimized", "name", "note", "options", "orb", "panel", "powered", "primary", "promise", "questionTop", "retention", "room", "stage", "stageTop", "status", "steps", "switch", "timer", "tools", "track", "transcript", "warning", "window"].map(name => [name, "cveat-call-" + name]));
type AvatarWindow = Window & {
    ready?: boolean;
    cveatAvatar?: {
        setInterviewState?: (state: unknown) => void;
    };
};
export default function InterviewRoom(p: {
    role: string;
    questions: string[];
    index: number;
    answer: string;
    seconds: number;
    timerStarted: boolean;
    listening: boolean;
    speaking: boolean;
    busy: boolean;
    micSupported: boolean;
    voice: boolean;
    stream: MediaStream | null;
    audio: HTMLAudioElement | null;
    interim: string;
    error: string;
    flagged: boolean;
    notice: ReactNode;
    handsFree: boolean;
    onHandsFree: (value: boolean) => void;
    liveSupported: boolean;
    transcriptionMode: "live" | "record";
    onTranscriptionMode: (value: "live" | "record") => void;
    onAnswer: (text: string) => void;
    onStart: () => void;
    onNext: () => void;
    onMic: () => void;
    onVoice: () => void;
    onReplay: () => void;
    onFlag: () => void;
    onLeave: () => void;
}) {
    const [view, setView] = useState<"orb" | "avatar">("orb"), [mini, setMini] = useState(false), [full, setFull] = useState(false);
    const [transcriptOpen, setTranscriptOpen] = useState(false);
    useEffect(() => { const query = matchMedia("(max-width: 760px)"); const update = () => setTranscriptOpen(!query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
    const container = useRef<HTMLDivElement>(null), frame = useRef<HTMLIFrameElement>(null);
    const [avatarReady,setAvatarReady]=useState(false),[avatarProgress,setAvatarProgress]=useState<number|null>(0),[avatarNotice,setAvatarNotice]=useState("");
    const frameVisible=useRef(true),lastProgress=useRef(0),analysisControl=useRef<{resume:()=>void;pause:()=>void}|null>(null);
    const selectView=useCallback((next:"orb"|"avatar")=>{if(next===view)return;setAvatarReady(false);setAvatarProgress(0);setAvatarNotice("");lastProgress.current=Date.now();setView(next)},[view]);
    const fallback=useCallback(()=>{setView("orb");setAvatarReady(false);setAvatarNotice("The 3D view could not load. You can continue with the orb; your answer and timer are unchanged.")},[]);
    const state = useRef(p);
    useEffect(() => { state.current = p; }, [p]);
    // One audio element plays Sarvam speech. Analysis observes that same playback;
    // the avatar never starts a second, competing audio player.
    useEffect(() => {
        const audio = p.audio;
        if (!audio)
            return;
        let disposed = false, raf = 0, context: AudioContext | undefined, source: MediaElementAudioSourceNode | undefined;
        try {
            context = new AudioContext();
            void context.resume().then(() => {
                if (disposed || context?.state !== "running")
                    return;
                source = context.createMediaElementSource(audio);
                const analyser = context.createAnalyser();
                analyser.fftSize = 1024;
                source.connect(analyser);
                analyser.connect(context.destination);
                const samples = new Float32Array(analyser.fftSize), bins = new Uint8Array(analyser.frequencyBinCount);
                const sample = () => {
                    raf=0;
                    if(disposed||document.hidden||!frameVisible.current||!frame.current)return;
                    analyser.getFloatTimeDomainData(samples);
                    analyser.getByteFrequencyData(bins);
                    let power = 0;
                    for (const v of samples)
                        power += v * v;
                    const open = Math.min(.8, Math.max(0, (Math.sqrt(power / samples.length) - .008) * 7));
                    let low = 0, mid = 0;
                    for (let i = 3; i < 16; i++)
                        low += bins[i];
                    for (let i = 16; i < 50; i++)
                        mid += bins[i];
                    const round = low > mid * .9;
                    const weights = { viseme_aa: open * (round ? .4 : .7), viseme_O: open * (round ? .55 : .1), viseme_E: open * (round ? .05 : .3) };
                    (frame.current?.contentWindow as AvatarWindow | null)?.cveatAvatar?.setInterviewState?.({ speaking: !audio.paused && !audio.ended, listening: state.current.listening, time: audio.currentTime, weights });
                    raf = requestAnimationFrame(sample);
                };
                analysisControl.current={resume(){if(!disposed&&!raf)raf=requestAnimationFrame(sample)},pause(){cancelAnimationFrame(raf);raf=0}};
                analysisControl.current.resume();
            }).catch(() => { });
        }
        catch { /* The question remains playable without visual analysis. */ }
        return () => { disposed = true; analysisControl.current=null; cancelAnimationFrame(raf); source?.disconnect(); void context?.close().catch(() => { }); };
    }, [p.audio]);
    useEffect(() => {
        const update = () => setFull(document.fullscreenElement === container.current);
        document.addEventListener("fullscreenchange", update);
        return () => document.removeEventListener("fullscreenchange", update);
    }, []);
    useEffect(() => { (frame.current?.contentWindow as AvatarWindow | null)?.cveatAvatar?.setInterviewState?.({ speaking: p.speaking, listening: p.listening, time: p.audio?.currentTime || 0, weights: {} }); }, [p.speaking, p.listening, p.audio, view]);
    useEffect(()=>{
      if(view!=="avatar"||mini)return;
      lastProgress.current=Date.now();setAvatarReady(false);setAvatarProgress(0);
      const target=frame.current;
      const sync=()=>{const active=frameVisible.current&&!document.hidden;target?.contentWindow?.postMessage({type:"cveat-avatar-active",active},location.origin);if(active)analysisControl.current?.resume();else analysisControl.current?.pause()};
      const observer=new IntersectionObserver(entries=>{frameVisible.current=entries[0]?.isIntersecting??true;sync()});if(target)observer.observe(target);
      const message=(event:MessageEvent)=>{
        if(event.source!==target?.contentWindow||event.origin!==location.origin||event.data?.type!=="cveat-avatar-status")return;
        lastProgress.current=Date.now();
        if(event.data.status==="error"){fallback();return}
        if(event.data.status==="ready"){ready=true;setAvatarReady(true);setAvatarProgress(100);target?.contentWindow&&(target.contentWindow as AvatarWindow).cveatAvatar?.setInterviewState?.({speaking:state.current.speaking,listening:state.current.listening,time:state.current.audio?.currentTime||0,weights:{}});sync()}
        else if(Number.isFinite(event.data.progress))setAvatarProgress(Math.max(0,Math.min(99,event.data.progress)));
      };
      let ready=false;
      const timer=setInterval(()=>{if(ready)return;if(document.hidden||!frameVisible.current){lastProgress.current=Date.now();return}if(Date.now()-lastProgress.current>90000)fallback()},5000);
      window.addEventListener("message",message);document.addEventListener("visibilitychange",sync);sync();
      return()=>{observer.disconnect();clearInterval(timer);window.removeEventListener("message",message);document.removeEventListener("visibilitychange",sync)};
    },[view,mini,fallback]);
    const time = `${String(Math.floor(p.seconds / 60)).padStart(2, "0")}:${String(Math.ceil(p.seconds) % 60).padStart(2, "0")}`;
    const status = p.listening ? "Recording your answer" : p.speaking ? "Speaking your question" : p.busy ? "Finishing your transcript…" : p.timerStarted ? "Answer in progress" : "Ready when you are";
    async function fullscreen() { try {
        if (document.fullscreenElement)
            await document.exitFullscreen();
        else
            await container.current?.requestFullscreen();
    }
    catch {
        setMini(false);
    } }
    return <section className={styles.room}>
  <div className={styles.heading}><div><span className={styles.eyebrow}>YOUR AI CONVERSATION</span><h1>A conversation, at your pace.</h1><p>{p.role} · {p.questions.length} questions</p></div><button onClick={p.onLeave} disabled={p.busy}>Leave session ↗</button></div>
  <div className="cveat-call-mic-banner">
    <div><strong>{p.listening ? "Microphone is open — you can speak now" : "Open your mic before you speak"}</strong><p>{p.listening ? "Your answer is being recorded. Close the mic when you finish." : p.speaking ? "Listen to the question, then click Open mic and allow microphone access." : "Click Open mic and allow access. Speaking alone does not start recording."}</p></div>
    <button type="button" aria-pressed={p.listening} disabled={p.busy || !p.micSupported || p.speaking} onClick={p.onMic}>{p.listening ? <MicOff size={20}/> : <Mic size={20}/>} {p.listening ? "Close mic" : "Open mic"}</button>
    {!p.micSupported && <p>Microphone unavailable in this browser. Write your answer using the keyboard below.</p>}
  </div>
  {p.error && <div role="alert" className={styles.error}>{p.error}</div>}
  <div ref={container} className={`${styles.window} ${mini ? styles.minimized : ""}`}>
   <div className={styles.stage}>
    <div className={styles.stageTop}><span className={styles.badge}><i />{status}</span><div className={styles.tools}><button aria-label={mini ? "Expand call view" : "Minimize call view"} onClick={() => {setAvatarReady(false);setMini(!mini)}}>{mini ? <Maximize2 size={16}/> : <Minimize2 size={16}/>}</button><button aria-label={full ? "Exit full screen" : "Enter full screen"} onClick={() => void fullscreen()}><Maximize2 size={16}/></button></div></div>
    {!mini&&<>
      {(view==="orb"||!avatarReady)&&<div className={styles.orb}><InterviewOrb stream={p.stream} state={p.listening?"listening":p.speaking?"speaking":p.busy?"thinking":"idle"}/></div>}
      {view==="avatar"&&<iframe ref={frame} title="CVeat 3D interviewer" src={AVATAR_VIEWER_URL} style={{opacity:avatarReady?1:0}} aria-hidden={!avatarReady} onError={fallback} onLoad={()=>{frame.current?.contentWindow?.postMessage({type:"cveat-avatar-active",active:frameVisible.current&&!document.hidden},location.origin)}}/>}
      {view==="avatar"&&!avatarReady&&<div className="cveat-call-loading"><p role="status">{avatarProgress!==null&&avatarProgress<95?"Loading your 3D interviewer…":"Preparing your 3D interviewer…"}</p><progress max={100} value={avatarProgress??undefined} aria-label="3D interviewer loading"/><span>{avatarProgress!==null?`${avatarProgress}% · `:""}Your interview remains available.</span><button onClick={()=>selectView("orb")}>Continue with orb</button></div>}
    </>}
    <div className={styles.name}><strong>CVeat AI interviewer</strong><span>{p.listening ? "Take your time. I’m listening." : "Here to listen. Ready to understand."}</span></div>
   </div>
   <aside className={styles.panel}>
    <div className={styles.questionTop}><span className={styles.eyebrow}>THE CONVERSATION</span><span>{String(p.index + 1).padStart(2, "0")} / {String(p.questions.length).padStart(2, "0")}</span></div>
    <div className={styles.steps} aria-label={`Question ${p.index + 1} of ${p.questions.length}`}>{p.questions.map((_, i) => <i key={i} className={i <= p.index ? styles.done : ""}/>)}</div>
    <div className={styles.meta}><span>Your question</span><button aria-pressed={p.flagged} onClick={p.onFlag}><Flag size={13}/>{p.flagged ? "Flagged" : "Review later"}</button></div>
    <h2>{p.questions[p.index]}</h2>
    <div className={`${styles.timer} ${p.seconds <= 30 ? styles.warning : ""}`}><div><span>{p.timerStarted ? "TIME REMAINING" : "YOUR ANSWER TIME"}</span><strong role="timer">{time}</strong></div><p>Up to 5 minutes.<br />Finish early when you’re ready.</p><div className={styles.track}><i style={{ width: `${p.seconds / 3}%` }}/></div></div>
    {p.notice}
    <details className={styles.transcript} open={transcriptOpen} onToggle={e => setTranscriptOpen(e.currentTarget.open)}><summary>{p.listening ? "View your answer text" : "Write an answer using the keyboard"}</summary><p className="cveat-call-keyboard-help">This box is for keyboard input. To answer aloud, use Open mic above. Recorded speech is transcribed for review; it may appear after you close the mic.</p><textarea rows={3} maxLength={6000} disabled={p.busy || p.listening} value={p.answer} onChange={e => p.onAnswer(e.target.value)} placeholder={p.listening ? "Listening… your words appear here when available." : "Write your answer using your keyboard…"}/></details>
    <p role="status" className={styles.status}>{p.interim || status}{p.timerStarted && p.seconds <= 30 ? " · 30 seconds or less remaining" : ""}</p>
    <button className={styles.primary} disabled={p.busy || p.speaking} onClick={() => { if (p.timerStarted)
        p.onNext();
    else {
        if (!p.micSupported)
            setTranscriptOpen(true);
        p.onStart();
    } }}>{p.timerStarted ? (p.index === p.questions.length - 1 ? "Finish & review" : "Next question") : (p.micSupported ? "Open mic to answer" : "Write my answer")}<ArrowRight size={17}/></button>
    <p className={styles.note}>{p.timerStarted ? "At 00:00, your answer finishes and the next question opens." : "The timer starts with your answer."}</p>
    <p className={styles.promise}>✓ Audio-only interview. No camera needed.<span>We never access or record your camera.</span></p>
   </aside>
   <footer className={styles.controls}><div className={styles.switch}><button aria-pressed={view === "orb"} onClick={() => selectView("orb")}><Circle size={14}/>Orb</button><button aria-pressed={view === "avatar"} onClick={() => selectView("avatar")}><UserRound size={14}/>3D interviewer</button></div><div className={styles.devices}><button onClick={p.onVoice} disabled={p.busy || p.listening}>{p.voice ? <Volume2 size={17}/> : <VolumeX size={17}/>} Voice {p.voice ? "on" : "off"}</button><button disabled={!p.voice || p.busy || p.listening || p.speaking} onClick={p.onReplay}>Replay question</button></div><span className={styles.powered}>Sarvam voice · Gemini feedback</span></footer>
  </div>
  <div className={styles.options}><label><input type="checkbox" checked={p.handsFree} onChange={e => p.onHandsFree(e.target.checked)}/> After microphone consent, start recording automatically when each spoken question finishes.</label><label>Transcription <select disabled={p.listening || p.busy} value={p.transcriptionMode} onChange={e => p.onTranscriptionMode(e.target.value as "live" | "record")}>{p.liveSupported && <option value="live">Live text, with recording fallback</option>}<option value="record">Record and transcribe</option></select></label></div>
  {avatarNotice&&<p role="status" className="cveat-call-fallback">{avatarNotice}</p>}
  <p className={styles.audioNotice}>✓ Audio-only interview · No camera needed. We never access or record your camera.</p>
  <p className={styles.retention}>Recordings stay in this tab for playback. Transcription may process audio with our AI provider. One final review · 1 Career Credit · Save text and feedback to My History only when you choose.</p>
 </section>;
}

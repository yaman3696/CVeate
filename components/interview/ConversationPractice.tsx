"use client";
import { useCallback, useEffect, useEffectEvent, useRef, useState, } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, Mic, MicOff, Save, Sparkles, Volume2, VolumeX, } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { saveToHistory } from "@/lib/save-history";
import { appendTranscript, speechRecognitionConstructor, startLiveTranscription, type LiveTranscription, } from "@/lib/live-transcription";
import { PRACTICE_LEVELS } from "@/lib/practice-interview";
import InterviewOrb from "./InterviewOrb";
import { saveInterviewSetupDraft, restoreInterviewSetupDraft, clearInterviewSetupDraft } from "@/lib/interview-setup-draft";
import InterviewRoom from "./InterviewRoom";
type Session = {
    id: string;
    role: string;
    seniority: string;
    questions: string[];
    token: string;
    version: number;
};
type Report = {
    overallScore: number;
    summary: string;
    breakdown: {
        feedback: string;
    }[];
};
const input = "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-[#111C30] dark:text-slate-100";
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800";
function feedbackTone(score: number) {
  return score < 5 ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-200' : score < 8 ? 'border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-400/40 dark:bg-yellow-400/10 dark:text-yellow-100' : 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-100';
}
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50";
export default function ConversationPractice({ userId, mode, onBack, }: {
    userId: string | null;
    mode: "text" | "conversation";
    onBack: () => void;
}) {
    const spoken = mode === "conversation";
    const [importedName, setImportedName] = useState("");
    useEffect(() => {
      let cancelled = false;
      void (async () => {
      try {
        const draft = await restoreInterviewSetupDraft(userId);
        if (cancelled) return;
        if (draft) { setRole(draft.role); setLevel(draft.level); setJd(draft.jd); setFile(draft.file); setImportedName(draft.importedName); return; }
      } catch { /* Dashboard transfer can still be restored if local draft storage is unavailable. */ }
      if (new URLSearchParams(window.location.search).get('source') !== 'dashboard') return;
      try {
        const raw = sessionStorage.getItem('cveat_interview_cv'); if (!raw) return;
        const transfer = JSON.parse(raw);
        if (Date.now() - transfer.created > 1800000 || typeof transfer.text !== 'string') return;
        if (transfer.owner !== (userId || 'guest')) {
          if (!userId || transfer.owner !== 'guest' || sessionStorage.getItem('cveat_claim_guest_interview') !== String(transfer.created)) return;
          transfer.owner = userId; sessionStorage.setItem('cveat_interview_cv', JSON.stringify(transfer)); sessionStorage.removeItem('cveat_claim_guest_interview');
        }
        setFile(new File([transfer.text], 'dashboard-cv.txt', {type:'text/plain'}));
        setRole(String(transfer.role || '').slice(0,100)); setImportedName(String(transfer.name || 'Your CV'));
      } catch {}
      })();
      return () => { cancelled = true };
    }, [userId]);
    const [session, setSession] = useState<Session | null>(null), [role, setRole] = useState(""), [level, setLevel] = useState("Junior"), [jd, setJd] = useState(""), [file, setFile] = useState<File | null>(null);
    const [answers, setAnswers] = useState<string[]>([]), [index, setIndex] = useState(0), [answer, setAnswer] = useState(""), [reviewing, setReviewing] = useState(false), [report, setReport] = useState<Report | null>(null);
    const [busy, setBusy] = useState(false), [error, setError] = useState(""), [voice, setVoice] = useState(true), [speaking, setSpeaking] = useState(false), [listening, setListening] = useState(false), [consent, setConsent] = useState(false), [interim, setInterim] = useState(""), [micSupported, setMicSupported] = useState(false);
    const [showAudioNotice, setShowAudioNotice] = useState(false), [liveSupported, setLiveSupported] = useState(false), [transcriptionMode, setTranscriptionMode] = useState<"live" | "record">("live"), [liveConsent, setLiveConsent] = useState(false), [handsFree, setHandsFree] = useState(true), [visualStream, setVisualStream] = useState<MediaStream | null>(null);
    const [saving, setSaving] = useState(false), [saved, setSaved] = useState(false), [creditUsed, setCreditUsed] = useState(0);
    const [deadline, setDeadline] = useState<number | null>(null), [seconds, setSeconds] = useState(300), [clips, setClips] = useState<Record<number, {
        url: string;
        seconds: number;
    }[]>>({}), [flags, setFlags] = useState<boolean[]>(Array(5).fill(false)), [reviewConfirmed, setReviewConfirmed] = useState(false), [speechAudio, setSpeechAudio] = useState<HTMLAudioElement | null>(null);
    const clipUrls = useRef(new Set<string>()), expiredPending = useRef(false), answerClock = useRef<number | null>(null);
    function beginAnswerClock() { if (answerClock.current === null) {
        const now = Date.now();
        answerClock.current = now;
        setDeadline(now + 300000);
        setSeconds(300);
    } }
    const expireAnswer = useEffectEvent(() => { if (!session || reviewing || report || answerClock.current === null)
        return; expiredPending.current = true; setDeadline(null); setSeconds(0); if (busyRef.current)
        return; if (listening) {
        advanceAfterRecording.current = true;
        void microphone();
    }
    else
        advanceAnswer(answer.trim() || "[No answer recorded before the five-minute time limit]"); });
    useEffect(() => { if (!spoken || deadline === null || reviewing || report)
        return; const tick = () => { if (answerClock.current === null)
        return; const left = Math.max(0, Math.ceil((answerClock.current + 300000 - Date.now()) / 1000)); setSeconds(left); if (left === 0)
        expireAnswer(); }; tick(); const timer = setInterval(tick, 250); return () => clearInterval(timer); }, [spoken, deadline, reviewing, report]);
    useEffect(() => { if (!busy && expiredPending.current && !listening)
        expireAnswer(); }, [busy, listening]);
    useEffect(() => { const urls = clipUrls.current; return () => { urls.forEach(URL.revokeObjectURL); urls.clear(); }; }, []);
    const recordingIntent = useRef(false), advanceAfterRecording = useRef(false), captureEpoch = useRef(0), autoListen = useRef(false);
    const liveTranscription = useRef<LiveTranscription | null>(null), transcriptionRequest = useRef<AbortController | null>(null);
    const audioNotice = useRef<HTMLDivElement | null>(null), acceptAudio = useRef<HTMLButtonElement | null>(null);
    const recorder = useRef<MediaRecorder | null>(null), audioStream = useRef<MediaStream | null>(null), audioTimer = useRef<ReturnType<typeof setTimeout> | null>(null), busyRef = useRef(false), active = useRef(true), startId = useRef<string | null>(null);
    const playback = useRef<HTMLAudioElement | null>(null), speechRequest = useRef<AbortController | null>(null), speechCache = useRef(new Map<number, string>());
    const question = session?.questions[index] || "";
    const stopMicrophone = useCallback(() => {
        captureEpoch.current++;
        recordingIntent.current = false;
        advanceAfterRecording.current = false;
        transcriptionRequest.current?.abort();
        transcriptionRequest.current = null;
        liveTranscription.current?.abort();
        liveTranscription.current = null;
        if (audioTimer.current)
            clearTimeout(audioTimer.current);
        const r = recorder.current;
        recorder.current = null;
        if (r) {
            r.onstop = null;
            r.ondataavailable = null;
            r.onerror = null;
            if (r.state !== "inactive")
                r.stop();
        }
        audioStream.current?.getTracks().forEach((t) => t.stop());
        audioStream.current = null;
        setVisualStream(null);
        setListening(false);
        setInterim("");
    }, []);
    const stopVoice = useCallback(() => {
        speechRequest.current?.abort();
        speechRequest.current = null;
        const audio = playback.current;
        if (audio) {
            audio.onended = null;
            audio.onerror = null;
            audio.pause();
        }
        playback.current = null;
        setSpeechAudio(null);
        setSpeaking(false);
    }, []);
    const authHeaders = async () => {
        const { data: { session: auth }, } = await supabase.auth.getSession();
        if (!auth)
            throw Error("Please sign in again.");
        return { Authorization: `Bearer ${auth.access_token}` };
    };
    useEffect(() => {
        autoListen.current =
            handsFree &&
                consent &&
                (transcriptionMode !== "live" || liveConsent) &&
                !reviewing &&
                !report;
    }, [handsFree, consent, transcriptionMode, liveConsent, reviewing, report]);
    async function speak() {
        if (!session || !spoken || !voice || reviewing || report)
            return;
        stopMicrophone();
        stopVoice();
        const controller = new AbortController();
        speechRequest.current = controller;
        setInterim("Preparing natural voice…");
        try {
            let url = speechCache.current.get(index);
            if (!url) {
                const response = await fetch("/api/practice-interviews/speech", {
                    method: "POST",
                    signal: controller.signal,
                    headers: {
                        ...(await authHeaders()),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token: session.token,
                        index,
                        version: session.version,
                    }),
                });
                if (!response.ok) {
                    const data = await response.json();
                    throw Error(data.error || "Voice unavailable.");
                }
                const blob = await response.blob();
                if (controller.signal.aborted || !active.current)
                    return;
                url = URL.createObjectURL(blob);
                speechCache.current.set(index, url);
            }
            if (controller.signal.aborted || !active.current)
                return;
            const audio = new Audio(url);
            playback.current = audio;
            setSpeechAudio(audio);
            audio.onended = () => {
                if (active.current) {
                    setSpeaking(false);
                    setSpeechAudio(null);
                    if (autoListen.current &&
                        !busyRef.current &&
                        active.current &&
                        !document.hidden)
                        void startRecording();
                }
            };
            audio.onerror = () => {
                if (active.current) {
                    setSpeaking(false);
                    setError("Audio playback failed. You can read the question and continue.");
                }
            };
            await audio.play();
            if (active.current)
                setSpeaking(true);
        }
        catch (e) {
            if (active.current && !controller.signal.aborted)
                setError(e instanceof Error
                    ? e.message
                    : "Voice unavailable. Read the question and continue.");
        }
        finally {
            if (speechRequest.current === controller) {
                speechRequest.current = null;
                if (active.current)
                    setInterim("");
            }
        }
    }
    const announce = useEffectEvent(() => {
        void speak();
    });
    useEffect(() => {
        active.current = true;
        queueMicrotask(() => {
            if (active.current) {
                setMicSupported(!!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia);
                const supported = !!speechRecognitionConstructor();
                setLiveSupported(supported);
                if (!supported)
                    setTranscriptionMode("record");
            }
        });
        const cache = speechCache.current;
        return () => {
            active.current = false;
            stopMicrophone();
            stopVoice();
            cache.forEach(URL.revokeObjectURL);
            cache.clear();
        };
    }, [stopMicrophone, stopVoice]);
    useEffect(() => {
        if (!session || saved)
            return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [session, saved]);
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("job");
        if (!id || !/^[0-9a-f-]{36}$/i.test(id))
            return;
        const c = new AbortController();
        void fetch(`/api/jobs?id=${encodeURIComponent(id)}`, {
            signal: c.signal,
            cache: "no-store",
        })
            .then((r) => r.json())
            .then((data) => {
            const job = data.jobs?.[0];
            if (job && !c.signal.aborted) {
                setRole(job.title);
                setJd(job.description);
                const levels: Record<string, string> = {
                    "Entry level": "Junior",
                    "Mid level": "Intermediate",
                    Lead: "Team Lead",
                    Director: "HOD",
                };
                setLevel(levels[job.seniority] || job.seniority);
            }
        })
            .catch(() => { });
        return () => c.abort();
    }, []);
    useEffect(() => {
        let cancelled = false;
        queueMicrotask(() => {
            if (!cancelled && question && voice && spoken && !reviewing && !report)
                announce();
        });
        return () => {
            cancelled = true;
            stopVoice();
        };
    }, [question, voice, spoken, reviewing, report, stopVoice]);
    async function start(e: React.FormEvent) {
        e.preventDefault();
        if (!userId) {
            if (busyRef.current) return;
            busyRef.current = true; setBusy(true); setError("");
            try { await saveInterviewSetupDraft({ role, level, jd, file, importedName, owner: null }); }
            catch { setError("Could not keep your interview setup for sign-in. Allow site storage and try again. Your entries are still here."); return; }
            finally { busyRef.current = false; setBusy(false); }
            if (importedName) { try { const transfer = JSON.parse(sessionStorage.getItem('cveat_interview_cv') || '{}'); if (transfer.owner === 'guest') sessionStorage.setItem('cveat_claim_guest_interview', String(transfer.created)); } catch {} }
            window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: "signin" }));
            return;
        }
        if (busyRef.current)
            return;
        busyRef.current = true;
        setBusy(true);
        setError("");
        try {
            if (!startId.current)
                startId.current = crypto.randomUUID();
            const form = new FormData();
            form.set("mode", mode);
            form.set("role", role);
            form.set("seniority", level);
            form.set("jd", jd);
            form.set("requestId", startId.current);
            if (file)
                form.set("cv", file);
            const response = await fetch("/api/practice-interviews", {
                method: "POST",
                headers: await authHeaders(),
                body: form,
            }), data = await response.json();
            if (!response.ok)
                throw Error(data.error || "Unable to prepare interview.");
            if (!active.current)
                return;
            void clearInterviewSetupDraft().catch(() => {});
            setSession(data.session);
            setAnswers(Array(5).fill(""));
            setFile(null);
            setJd("");
            startId.current = null;
        }
        catch (e) {
            if (active.current)
                setError(e instanceof Error ? e.message : "Unable to prepare interview.");
        }
        finally {
            busyRef.current = false;
            if (active.current)
                setBusy(false);
        }
    }
    function advanceAnswer(text: string) {
        if (!text.trim())
            return;
        stopVoice();
        expiredPending.current = false;
        answerClock.current = null;
        setDeadline(null);
        setSeconds(300);
        const next = [...answers];
        next[index] = text.trim();
        setAnswers(next);
        if (index === 4) {
            setReviewing(true);
            setAnswer("");
        }
        else {
            setIndex(index + 1);
            setAnswer(next[index + 1] || "");
        }
    }
    function next() {
        if (listening) {
            advanceAfterRecording.current = true;
            void microphone();
            return;
        }
        if (!busyRef.current)
            advanceAnswer(answer);
    }
    async function evaluate() {
        if (!session || busyRef.current || (spoken && !reviewConfirmed))
            return;
        busyRef.current = true;
        setBusy(true);
        setError("");
        stopMicrophone();
        stopVoice();
        try {
            const response = await fetch("/api/practice-interviews/review", {
                method: "POST",
                headers: {
                    ...(await authHeaders()),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token: session.token, answers }),
            }), data = await response.json();
            if (!response.ok)
                throw Error(data.error || "Review failed.");
            if (active.current) {
                setReport(data.report);
                setCreditUsed(data.creditsUsed);
            }
        }
        catch (e) {
            if (active.current)
                setError(e instanceof Error
                    ? e.message
                    : "Review failed. Your answers remain in this tab.");
        }
        finally {
            busyRef.current = false;
            if (active.current)
                setBusy(false);
        }
    }
    async function save() {
        if (!session || !report || !userId || saving || saved)
            return;
        setSaving(true);
        setError("");
        try {
            const result = await saveToHistory("interview", {
                user_id: userId,
                profession: session.role,
                seniority: session.seniority,
                experience: `${session.seniority} Level`,
                score: report.overallScore,
                feedback_summary: report.summary,
                qa_transcript: session.questions.map((question, i) => ({
                    question,
                    answer: answers[i],
                })),
                report_data: report,
            });
            if (!result.saved) return;
            setSaved(true);
        }
        catch (error) {
            setError(error instanceof Error ? error.message : "Saving did not finish. Keep this tab open and try again.");
        }
        finally {
            setSaving(false);
        }
    }
    function leave() {
        if (session &&
            !saved &&
            !window.confirm("Leave this interview? Unsaved answers and feedback will be discarded."))
            return;
        stopMicrophone();
        stopVoice();
        onBack();
    }
    async function microphone() {
        if (listening) {
            if (audioTimer.current)
                clearTimeout(audioTimer.current);
            busyRef.current = true;
            setBusy(true);
            if (recorder.current && recorder.current.state !== "inactive")
                recorder.current.stop();
            setListening(false);
            return;
        }
        if (!consent || (transcriptionMode === "live" && !liveConsent)) {
            stopVoice();
            setError("");
            setShowAudioNotice(true);
            requestAnimationFrame(() => {
                audioNotice.current?.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                });
                acceptAudio.current?.focus();
            });
            return;
        }
        await startRecording();
    }
    async function startRecording() {
        if (!session || busyRef.current)
            return;
        busyRef.current = true;
        recordingIntent.current = true;
        setBusy(true);
        stopVoice();
        setError("");
        const captured = session, capturedIndex = index, recordingStarted = Date.now(), base = answer, epoch = captureEpoch.current;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!active.current || !recordingIntent.current || document.hidden) {
                stream.getTracks().forEach((t) => t.stop());
                busyRef.current = false;
                recordingIntent.current = false;
                if (active.current)
                    setBusy(false);
                return;
            }
            audioStream.current = stream;
            setVisualStream(stream);
            const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type));
            const r = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined), chunks: BlobPart[] = [];
            recorder.current = r;
            r.ondataavailable = (e) => {
                if (e.data.size)
                    chunks.push(e.data);
            };
            r.onerror = () => {
                busyRef.current = false;
                setBusy(false);
                setError("Recording stopped. Please try again or type.");
                stopMicrophone();
            };
            r.onstop = () => {
                recordingIntent.current = false;
                recorder.current = null;
                stream.getTracks().forEach((t) => t.stop());
                audioStream.current = null;
                setVisualStream(null);
                if (audioTimer.current)
                    clearTimeout(audioTimer.current);
                const recordedBlob = new Blob(chunks, { type: r.mimeType || mime || "audio/webm" });
                if (recordedBlob.size && active.current) {
                    const url = URL.createObjectURL(recordedBlob);
                    clipUrls.current.add(url);
                    setClips(old => ({ ...old, [capturedIndex]: [...(old[capturedIndex] || []), { url, seconds: Math.min(300, (Date.now() - recordingStarted) / 1000) }] }));
                }
                const live = liveTranscription.current;
                let upload: AbortController | null = null;
                if (!active.current) {
                    live?.abort();
                    return;
                }
                setListening(false);
                busyRef.current = true;
                setBusy(true);
                setInterim(live ? "Finishing live transcript…" : "Transcribing your answer…");
                void (async () => {
                    try {
                        const result = live ? await live.stop() : null;
                        if (result?.cancelled ||
                            !active.current ||
                            epoch !== captureEpoch.current)
                            return;
                        if (result?.usable) {
                            const text = appendTranscript(base, result.text);
                            setAnswer(text);
                            if (advanceAfterRecording.current || expiredPending.current)
                                advanceAnswer(text);
                            return;
                        }
                        // Use the complete recording if recognition was unavailable or interrupted.
                        // Replace the live suffix rather than adding the same words twice.
                        setInterim("Transcribing the recording…");
                        const { data: { session: auth }, } = await supabase.auth.getSession();
                        if (!auth)
                            throw Error("Sign in again.");
                        if (epoch !== captureEpoch.current || !active.current)
                            return;
                        const form = new FormData();
                        form.set("token", captured.token);
                        form.set("id", captured.id);
                        form.set("consent", "true");
                        form.set("version", String(captured.version));
                        const blob = recordedBlob;
                        form.set("audio", blob, "answer");
                        upload = new AbortController();
                        transcriptionRequest.current = upload;
                        const response = await fetch("/api/practice-interviews/transcribe", {
                            method: "POST",
                            signal: upload.signal,
                            headers: { Authorization: `Bearer ${auth.access_token}` },
                            body: form,
                        }), data = await response.json();
                        if (!response.ok)
                            throw Error(data.error || "Unable to transcribe.");
                        if (active.current && epoch === captureEpoch.current) {
                            const text = appendTranscript(base, data.transcript);
                            setAnswer(text);
                            if (advanceAfterRecording.current || expiredPending.current)
                                advanceAnswer(text);
                        }
                    }
                    catch (e) {
                        if (active.current &&
                            !(e instanceof Error && e.name === "AbortError"))
                            setError(e instanceof Error ? e.message : "Unable to transcribe.");
                        if (expiredPending.current && active.current)
                            advanceAnswer(base.trim() || "[Recording retained for review; transcription unavailable at the time limit]");
                    }
                    finally {
                        advanceAfterRecording.current = false;
                        if (liveTranscription.current === live)
                            liveTranscription.current = null;
                        if (transcriptionRequest.current === upload)
                            transcriptionRequest.current = null;
                        busyRef.current = false;
                        if (active.current) {
                            setBusy(false);
                            setInterim("");
                        }
                    }
                })();
            };
            if (transcriptionMode === "live") {
                const Constructor = speechRecognitionConstructor();
                if (Constructor) {
                    try {
                        liveTranscription.current = startLiveTranscription(Constructor, (text) => {
                            if (active.current &&
                                recorder.current === r &&
                                !busyRef.current)
                                setAnswer(appendTranscript(base, text));
                        }, () => {
                            if (active.current && recorder.current === r)
                                setInterim("Live speech recognition is unavailable in this browser. Recording continues; stop to transcribe it.");
                        });
                    }
                    catch {
                        setInterim("Live transcription is unavailable. Recording continues; stop to transcribe it.");
                    }
                }
            }
            r.start();
            beginAnswerClock();
            setListening(true);
            busyRef.current = false;
            setBusy(false);
            audioTimer.current = setTimeout(() => {
                if (r.state === "recording") {
                    expiredPending.current = true;
                    advanceAfterRecording.current = true;
                    setDeadline(null);
                    setSeconds(0);
                    busyRef.current = true;
                    setBusy(true);
                    setListening(false);
                    r.stop();
                }
            }, Math.max(0, (answerClock.current || Date.now()) + 300000 - Date.now()));
        }
        catch {
            busyRef.current = false;
            setBusy(false);
            setError("Microphone access is unavailable or was denied. Allow it in your browser, or type your answer.");
            stopMicrophone();
        }
    }
    const audioConsentNotice = showAudioNotice ? <div ref={audioNotice} role="region" aria-label="Microphone processing notice" className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs leading-6 dark:border-indigo-400/30 dark:bg-indigo-400/10">
    <strong>Before using your microphone</strong><p>Audio-only interview. No camera is needed or accessed. {transcriptionMode === "live" ? "Live transcription may process speech with your browser’s speech provider. If unavailable, Google Gemini transcribes the recording." : "Google Gemini processes the recording for transcription."} Temporary audio remains in this tab for your review and is never saved to Supabase.</p>
    <button ref={acceptAudio} className={primary} onClick={() => { setConsent(true); setLiveConsent(transcriptionMode === "live"); setShowAudioNotice(false); void startRecording(); }}>I agree — open mic</button><button className={button} onClick={() => { setShowAudioNotice(false); beginAnswerClock(); }}>Use my keyboard instead</button>
  </div> : null;
    if (spoken && session && !report && !reviewing)
        return <InterviewRoom role={session.role} questions={session.questions} index={index} answer={answer} seconds={seconds} timerStarted={deadline !== null || answerClock.current !== null} listening={listening} speaking={speaking} busy={busy} micSupported={micSupported} voice={voice} stream={visualStream} audio={speechAudio} interim={interim} error={error} flagged={flags[index]} notice={audioConsentNotice} handsFree={handsFree} onHandsFree={setHandsFree} liveSupported={liveSupported} transcriptionMode={transcriptionMode} onTranscriptionMode={setTranscriptionMode} onAnswer={text => { stopVoice(); beginAnswerClock(); setAnswer(text); }} onStart={() => { if (answer.trim() || !micSupported)
            beginAnswerClock();
        else
            void microphone(); }} onNext={next} onMic={() => void microphone()} onVoice={() => { setVoice(!voice); if (voice)
            stopVoice(); }} onReplay={() => void speak()} onFlag={() => setFlags(old => old.map((v, i) => i === index ? !v : v))} onLeave={leave}/>;
    return (<section className="mx-auto max-w-6xl space-y-7">
      <button type="button" onClick={leave} disabled={busy || saving} className={button}>
        <ArrowLeft size={16}/>
        Interview Prep
      </button>
      <header className="mx-auto max-w-2xl space-y-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
          <Sparkles size={14}/>
          {spoken ? "Your AI conversation" : "Your text interview"}
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
          {report
            ? "Your next step starts here."
            : session
                ? "One question. One step closer."
                : "An interview built around you."}
        </h1>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {session
            ? "Five tailored questions. One complete review."
            : "Add your CV, a job description, or both. AI creates five relevant questions for your target role."}
        </p>
      </header>
      {error && (<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>)}
      <div className={`grid gap-6 ${spoken && !report && !reviewing ? "lg:grid-cols-[300px_1fr]" : ""}`}>
        {spoken && !report && !reviewing && (<aside className="flex flex-col items-center rounded-[2rem] border border-indigo-100 bg-gradient-to-b from-indigo-50 via-white to-white p-7 text-center dark:border-slate-700 dark:from-[#393073] dark:via-[#292453] dark:to-[#19253D]">
            <InterviewOrb stream={visualStream} state={listening
                ? "listening"
                : speaking
                    ? "speaking"
                    : busy
                        ? "thinking"
                        : "idle"}/>
            <h2 className="text-xl font-bold">CVeat AI interviewer</h2>
            <p role="status" className="mt-3 min-h-10 text-sm text-slate-600 dark:text-slate-300">
              {listening
                ? "Listening · the orb follows your voice"
                : speaking
                    ? "Speaking your question"
                    : interim ||
                        (busy ? "Preparing your interview…" : "Ready when you are")}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button className={button} disabled={busy || listening} onClick={() => {
                setVoice(!voice);
                if (voice)
                    stopVoice();
            }}>
                {voice ? <Volume2 size={16}/> : <VolumeX size={16}/>}Voice{" "}
                {voice ? "on" : "off"}
              </button>
              {session && !reviewing && (<button className={button} disabled={busy ||
                    listening ||
                    !voice ||
                    interim === "Preparing natural voice…"} onClick={() => void speak()}>
                  Replay question
                </button>)}
            </div>
            <p className="mt-6 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Natural speech powered by Sarvam. AI practice coach; no camera
              needed.
            </p>
          </aside>)}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9 dark:border-slate-700 dark:bg-[#1B263B]">
          {!session ? (<form onSubmit={start} className="mx-auto max-w-2xl space-y-5">
              <h2 className="text-2xl font-bold">Make it your interview</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Target position
                  <input required maxLength={100} className={input} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Graphic Designer"/>
                </label>
                <label className="text-sm font-semibold">
                  Seniority
                  <select className={input} value={level} onChange={(e) => setLevel(e.target.value)}>
                    {PRACTICE_LEVELS.map((l) => (<option key={l}>{l}</option>))}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-semibold">
                Job description{" "}
                <span className="font-normal text-slate-500">
                  · optional with CV
                </span>
                <textarea rows={6} maxLength={15000} className={input} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the role description you want to practise for…"/>
              </label>
              <label className="block rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-5 text-sm font-semibold dark:border-indigo-400/30 dark:bg-indigo-400/5">
                <span className="flex items-center gap-2">
                  <FileText size={18}/>
                  {importedName ? "CV from your dashboard" : "Upload your CV · PDF or TXT"}
                </span>
                {file && !importedName && <p role="status" className="mt-2 text-xs font-normal text-indigo-600 dark:text-indigo-300">Attached: {file.name}</p>}
                {importedName && <p role="status" className="mt-2 text-xs font-normal text-indigo-600 dark:text-indigo-300">{importedName} is attached. Your current dashboard CV will be used. Choose a file below to replace it.</p>}
                <input className="mt-3 block w-full text-xs font-normal" type="file" accept="application/pdf,text/plain" onChange={(e) => { setFile(e.target.files?.[0] || null); setImportedName(""); }}/>
                <span className="mt-2 block text-xs font-normal text-slate-500 dark:text-slate-400">
                  Up to 2 MB / 10 PDF pages. Add both sources for more relevant
                  questions.
                </span>
              </label>
              <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                <strong>One final review · 1 Career Credit.</strong> No credit
                charge per question. CV/JD and interview text are processed by
                our AI provider. Nothing is added to My History unless you
                choose Save. Unsaved interviews stay in this tab and are lost on
                reload. Five new interviews per 24 hours.
              </div>
              <button disabled={busy || (!jd.trim() && !file)} className={`${primary} w-full`}>
                {busy
                ? "AI is preparing your questions…"
                : userId
                    ? "Create my interview"
                    : "Sign in to practise"}
                <ArrowRight size={17}/>
              </button>
              {error && (<button type="button" disabled={busy} onClick={() => {
                    startId.current = null;
                    setError("");
                }} className="text-xs underline">
                  Reset preparation attempt
                </button>)}
            </form>) : report ? (<div className="space-y-6">
              <h2 className="text-2xl font-bold">Your interview feedback</h2>
              <div data-feedback-score className={`rounded-2xl border p-6 sm:p-8 ${feedbackTone(report.overallScore)}`}>
                <p className="text-xs font-bold uppercase tracking-wider">Overall interview score</p>
                <p className="mt-3 flex items-baseline gap-2"><strong className="text-6xl font-extrabold sm:text-7xl">{report.overallScore}</strong><span className="text-2xl font-semibold">/ 10</span></p>
                <p className="mt-3 text-sm font-bold">{report.overallScore < 5 ? "Needs improvement" : report.overallScore < 8 ? "Making progress" : "Strong performance"}</p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{report.summary}</p>
              </div>
              <div aria-label="Score colour guide" className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold"><span className="text-red-700 dark:text-red-300">1–4 · Needs improvement</span><span className="text-yellow-800 dark:text-yellow-200">5–7 · Making progress</span><span className="text-emerald-700 dark:text-emerald-300">8–10 · Strong performance</span></div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Career Credits used: {creditUsed} for this complete interview.</p>
              {session.questions.map((q, i) => (<section key={i} data-question-feedback className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="border-b border-indigo-100 bg-indigo-50 px-5 py-4 text-sm font-bold text-indigo-900 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-100">Question {i + 1} · {q}</h3>
                  <div className="space-y-4 p-5">
                    <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Your answer</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">{answers[i] || "No answer provided."}</p></div>
                    <div className={`rounded-xl border p-4 ${feedbackTone(report.overallScore)}`}><h4 className="text-xs font-bold uppercase tracking-wider">AI feedback</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{report.breakdown[i]?.feedback || "Feedback is unavailable for this question."}</p></div>
                  </div>
                </section>))}
              <div className="rounded-2xl bg-indigo-50 p-5 dark:bg-indigo-400/10">
                <h3 className="font-bold">
                  Would you like to save this interview?
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Only your text answers and feedback will be saved to My
                  History. Audio is never saved in Supabase.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button disabled={saving || saved} onClick={() => void save()} className={primary}>
                    {saved ? <Check size={17}/> : <Save size={17}/>}{" "}
                    {saved
                ? "Saved to My History"
                : saving
                    ? "Saving…"
                    : "Save to My History"}
                  </button>
                  <button onClick={leave} disabled={saving} className={button}>
                    {saved ? "Finish" : "Finish without saving"}
                  </button>
                  {saved && (<Link className={button} href="/history?tab=interview">
                      View My History
                    </Link>)}
                </div>
              </div>
            </div>) : reviewing ? (<div className="space-y-6">
              <h2 className="text-2xl font-bold">
                Your answers. Ready for review.
              </h2>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                Check or edit your text below. All five answers will be sent
                together for one AI review.
              </p>
              {session.questions.map((q, i) => (<label key={i} className="block text-sm font-bold">
                  {i + 1}. {q} {flags[i] && <span className="ml-2 text-xs text-amber-600">⚑ Flagged for review</span>}
                  {spoken && clips[i]?.map((clip, n) => <span key={clip.url} className="my-3 block"><audio controls preload="metadata" src={clip.url} className="w-full" aria-label={`Answer ${i + 1}, recording ${n + 1}`}/><a href={clip.url} download={`cveat-answer-${i + 1}-${n + 1}`} className="mt-1 inline-block text-xs font-normal text-indigo-600 underline dark:text-indigo-300">Download audio · {Math.ceil(clip.seconds)} seconds</a></span>)}
                  <textarea rows={4} disabled={busy} maxLength={6000} className={`${input} font-normal`} value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))}/>
                </label>))}
              {spoken && <label className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={reviewConfirmed} onChange={e => setReviewConfirmed(e.target.checked)} className="mt-1 accent-indigo-600"/>I’ve reviewed my answers and I’m ready to submit for evaluation.</label>}
              <button disabled={busy || answers.some((a) => !a.trim()) || (spoken && !reviewConfirmed)} onClick={() => void evaluate()} className={`${primary} w-full`}>
                {busy
                ? "Reviewing all five answers…"
                : "Finish interview & get feedback · 1 Career Credit"}
              </button>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                No automatic history saving. Keep this tab open until your
                feedback arrives. Retrying this interview does not charge a
                second credit.
                <Link href="/pricing" className="ml-2 underline">
                  Need credits? View plans
                </Link>
              </p>
            </div>) : (<div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                  Question {index + 1} of 5
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {session.role} · {session.seniority}
                </span>
              </div>
              <div className="flex gap-2" aria-label={`Question ${index + 1} of 5`}>
                {session.questions.map((_, i) => (<div key={i} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-indigo-500" : "bg-slate-100 dark:bg-slate-700"}`}/>))}
              </div>
              <h2 className="text-xl font-bold leading-8 sm:text-2xl">
                {question}
              </h2>
              {spoken && (<div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {liveSupported && (<button type="button" disabled={busy || listening} aria-pressed={transcriptionMode === "live"} className={button} onClick={() => setTranscriptionMode("live")}>
                        Live text
                      </button>)}
                    <button type="button" disabled={busy || listening} aria-pressed={transcriptionMode === "record"} className={button} onClick={() => setTranscriptionMode("record")}>
                      Record & transcribe
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)}/>
                    After I accept microphone processing, listen automatically
                    when each question finishes.
                  </label>
                </div>)}
              {showAudioNotice && (<div ref={audioNotice} role="region" aria-label="Microphone processing notice" className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-400/30 dark:bg-indigo-400/10">
                  <h3 className="font-bold">Before using your microphone</h3>
                  <p className="mt-2 text-sm leading-6">
                    {transcriptionMode === "live"
                    ? "Live transcription may send speech to your browser’s speech provider. If unavailable, the temporary recording is sent to Google Gemini for transcription."
                    : "Your temporary recording is sent to Google Gemini for transcription."}{" "}
                    Audio is never saved in Supabase. The microphone stops while
                    the AI speaks. You can turn it off at any time.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button ref={acceptAudio} className={primary} onClick={() => {
                    setConsent(true);
                    setLiveConsent(transcriptionMode === "live");
                    setShowAudioNotice(false);
                    void startRecording();
                }}>
                      I agree — open mic
                    </button>
                    <button className={button} onClick={() => setShowAudioNotice(false)}>
                      Keep typing instead
                    </button>
                  </div>
                </div>)}
              <label className="block text-sm font-semibold">
                {spoken
                ? "Your answer · live transcript is editable after stopping"
                : "Your answer"}
                <textarea rows={8} disabled={busy || listening} className={`${input} font-normal`} maxLength={6000} value={answer} onChange={(e) => {
                stopVoice();
                setAnswer(e.target.value);
            }} placeholder={listening
                ? "Listening… your words will appear here."
                : "Share a specific example, your approach, and the result…"}/>
              </label>
              {spoken && (<div className="flex flex-wrap items-center gap-3">
                  <button type="button" disabled={busy || !micSupported} className={button} onClick={() => void microphone()}>
                    {listening ? <MicOff size={17}/> : <Mic size={17}/>}{" "}
                    {listening ? "Stop microphone" : "Speak my answer"}
                  </button>
                  {consent && (<button className="text-xs underline" disabled={busy} onClick={() => {
                        stopMicrophone();
                        setConsent(false);
                        setLiveConsent(false);
                    }}>
                      Turn off microphone consent
                    </button>)}
                  <span role="status" className="text-xs text-slate-500 dark:text-slate-400">
                    {listening ? "Listening now" : interim}
                  </span>
                </div>)}
              <div className="flex flex-wrap justify-between gap-3">
                <button disabled={busy || listening || index === 0} className={button} onClick={() => {
                stopVoice();
                const next = [...answers];
                next[index] = answer;
                setAnswers(next);
                setIndex(index - 1);
                setAnswer(next[index - 1]);
            }}>
                  Previous
                </button>
                <button disabled={busy || (!listening && !answer.trim())} className={primary} onClick={next}>
                  {listening ? "Stop & " : ""}
                  {index === 4 ? "Review all answers" : "Next question"}
                  <ArrowRight size={17}/>
                </button>
              </div>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                Answers stay in this tab. No AI review or Career Credit charge
                until you finish all questions.
                {spoken
                ? " Each answer has a five-minute limit. Temporary recordings stay in this tab for review."
                : ""}
              </p>
            </div>)}
        </div>
      </div>
    </section>);
}

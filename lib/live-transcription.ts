/** Browser speech recognition is optional; recording remains the reliable fallback. */
export type RecognitionResult = { isFinal: boolean; [index: number]: { transcript: string } }
export type BrowserRecognition = {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
export type RecognitionConstructor = new () => BrowserRecognition
export type LiveTranscript = { text: string; usable: boolean; cancelled: boolean }
export type LiveTranscription = { stop(): Promise<LiveTranscript>; abort(): void }
export function speechRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const browser = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return browser.SpeechRecognition || browser.webkitSpeechRecognition || null
}
const join = (...parts: string[]) => parts.map(p => p.trim()).filter(Boolean).join(' ')
export function appendTranscript(base: string, spoken: string): string { return join(base, spoken).slice(0, 6000) }

export function startLiveTranscription(
  Constructor: RecognitionConstructor,
  onText: (text: string) => void,
  onUnavailable: () => void,
): LiveTranscription {
  const recognition = new Constructor()
  recognition.lang = 'en-IN'
  recognition.continuous = true
  recognition.interimResults = true
  let prefix = '', text = '', failed = false, stopping = false, cancelled = false, running = false, restarts = 0
  let stopTimer: ReturnType<typeof setTimeout> | undefined
  let resolveStop: ((result: LiveTranscript) => void) | undefined
  let stopPromise: Promise<LiveTranscript> | undefined
  function result(): LiveTranscript { return { text, usable: !failed && !!text.trim(), cancelled } }
  function finish() {
    if (stopTimer) clearTimeout(stopTimer)
    if (stopping) {
      recognition.onresult = recognition.onerror = recognition.onend = null
      try { recognition.abort() } catch { /* Already stopped. */ }
      running = false
    }
    resolveStop?.(result()); resolveStop = undefined
  }
  function unavailable() { if (!failed && !cancelled) { failed = true; onUnavailable(); try { recognition.abort() } catch { /* Already stopped. */ } } }
  recognition.onresult = event => {
    if (cancelled) return
    // Rebuild the current recognition result list: interim words may be replaced,
    // so appending each event would duplicate the user's answer.
    const segments = Array.from(event.results).map(part => part[0]?.transcript || '')
    text = join(prefix, ...segments).slice(0, 6000)
    onText(text)
  }
  recognition.onerror = event => { if (!cancelled && event.error !== 'no-speech') unavailable() }
  recognition.onend = () => {
    running = false
    if (cancelled || stopping) { finish(); return }
    if (!failed && restarts < 2) {
      prefix = text
      restarts++
      try { recognition.start(); running = true } catch { unavailable() }
    } else unavailable()
  }
  try { recognition.start(); running = true } catch { unavailable() }
  return {
    stop() {
      if (stopPromise) return stopPromise
      stopping = true
      stopPromise = new Promise(resolve => {
        resolveStop = resolve
        if (!running) { finish(); return }
        // Wait briefly for the browser's last final result before falling back.
        stopTimer = setTimeout(finish, 1000)
        try { recognition.stop() } catch { finish() }
      })
      return stopPromise
    },
    abort() {
      cancelled = true
      stopping = true
      running = false
      recognition.onresult = recognition.onerror = recognition.onend = null
      try { recognition.abort() } catch { /* Already stopped. */ }
      finish()
    },
  }
}

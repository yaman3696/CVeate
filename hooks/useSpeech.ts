'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const join = (a: string, b: string) => [a, b].join(' ').replace(/\s+/g, ' ').trim()

export function useSpeechRecognition(onText: (text: string) => void, lang = 'en-US') {
  const recRef = useRef<any>(null)
  const wantRef = useRef(false)
  const baseRef = useRef('')
  const sessionRef = useRef('')
  const restartsRef = useRef<number[]>([])
  const waitersRef = useRef<Array<(t: string | null) => void>>([])
  const onTextRef = useRef(onText)

  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onTextRef.current = onText
  }, [onText])

  const emit = () => onTextRef.current(join(baseRef.current, sessionRef.current))

  const launch = useCallback(
    function run() {
      const w = window as any
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition
      const rec = new SR()
      rec.lang = lang
      rec.interimResults = true
      rec.continuous = !/Android/i.test(navigator.userAgent)
      rec.maxAlternatives = 1

      rec.onstart = () => setListening(true)

      rec.onresult = (e: any) => {
        let text = ''
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + ' '
        sessionRef.current = text
        emit()
      }

      rec.onerror = (e: any) => {
        switch (e.error) {
          case 'no-speech':
          case 'aborted':
            return
          case 'not-allowed':
          case 'service-not-allowed':
            wantRef.current = false
            setError('Microphone access is blocked. Allow it in your browser settings.')
            break
          case 'audio-capture':
            wantRef.current = false
            setError('No microphone was found.')
            break
          case 'network':
            wantRef.current = false
            setError('Speech recognition needs an internet connection.')
            break
          default:
            wantRef.current = false
            setError(`Speech recognition error: ${e.error}`)
        }
      }

      rec.onend = () => {
        baseRef.current = join(baseRef.current, sessionRef.current)
        sessionRef.current = ''
        recRef.current = null

        if (wantRef.current) {
          const now = Date.now()
          restartsRef.current = restartsRef.current.filter((t) => now - t < 5000)
          if (restartsRef.current.length >= 5) {
            wantRef.current = false
            setError('Speech recognition keeps stopping. Please type your answer instead.')
          } else {
            restartsRef.current.push(now)
            setTimeout(() => {
              if (wantRef.current && !recRef.current) {
                try {
                  run()
                } catch {
                  wantRef.current = false
                  setListening(false)
                }
              }
            }, 200)
            return
          }
        }
        setListening(false)
        waitersRef.current.splice(0).forEach((resolve) => resolve(baseRef.current))
      }

      recRef.current = rec
      rec.start()
    },
    [lang]
  )

  const start = useCallback(
    (existingText = '') => {
      const w = window as any
      if (!(w.SpeechRecognition || w.webkitSpeechRecognition)) {
        setSupported(false)
        setError('Speech recognition is not supported in this browser. Use Chrome or Edge.')
        return
      }
      if (wantRef.current) return
      setError(null)
      wantRef.current = true
      baseRef.current = existingText.trim()
      sessionRef.current = ''
      restartsRef.current = []
      try {
        launch()
      } catch {
        wantRef.current = false
        setError('Could not start the microphone.')
      }
    },
    [launch]
  )

  const stop = useCallback((): Promise<string | null> => {
    if (!wantRef.current && !recRef.current) return Promise.resolve(null)
    wantRef.current = false
    setListening(false)
    return new Promise((resolve) => {
      if (!recRef.current) return resolve(join(baseRef.current, sessionRef.current))
      waitersRef.current.push(resolve)
      try {
        recRef.current.stop()
      } catch {}
      setTimeout(() => resolve(join(baseRef.current, sessionRef.current)), 1200)
    })
  }, [])

  const abort = useCallback(() => {
    wantRef.current = false
    const rec = recRef.current
    if (rec) {
      rec.onend = rec.onresult = rec.onerror = null
      try {
        rec.abort()
      } catch {}
    }
    recRef.current = null
    baseRef.current = ''
    sessionRef.current = ''
    setListening(false)
    waitersRef.current.splice(0).forEach((resolve) => resolve(null))
  }, [])

  useEffect(() => {
    const w = window as any
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
    return () => abort()
  }, [abort])

  return { listening, supported, error, start, stop, abort }
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      voiceRef.current =
        voices.find((v) => v.lang === 'en-US' && /Google|Samantha|Natural/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        null
    }
    pickVoice()
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pickVoice)
      window.speechSynthesis.cancel()
    }
  }, [])

  const cancel = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    if (voiceRef.current) u.voice = voiceRef.current
    u.onstart = () => setSpeaking(true)
    u.onend = () => {
      setSpeaking(false)
      onDone?.()
    }
    u.onerror = () => setSpeaking(false)
    utterRef.current = u
    setTimeout(() => window.speechSynthesis.speak(u), 60)
  }, [])

  return { speaking, speak, cancel }
}
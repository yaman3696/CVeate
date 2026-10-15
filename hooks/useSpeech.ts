import { useState, useRef } from 'react'

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)

  const speak = (text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => {
      setSpeaking(false)
      if (onEnd) onEnd()
    }
    utterance.onerror = () => setSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  const cancel = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }

  return { speaking, speak, cancel }
}

export function useLiveAudioRecorder() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])

  const startRecording = async () => {
    audioChunksRef.current = []
    setAudioBlob(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      console.error('Microphone permission error:', err)
      alert('Microphone access is required for live voice answers. Please check your browser settings.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setRecording(false)
    }
  }

  return { recording, audioBlob, startRecording, stopRecording }
}
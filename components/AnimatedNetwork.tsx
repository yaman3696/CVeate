
'use client'

import { useEffect, useRef } from 'react'

export default function AnimatedNetwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId = 0
    let running = true

    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
    }[] = []

    let width = 0
    let height = 0

    const initialize = () => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      width = rect.width
      height = rect.height

      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      particles.length = 0

      // Distribute particles throughout the narrow toolbar.
      const count = Math.min(
        55,
        Math.max(18, Math.round(width / 28))
      )

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.25,
          radius: Math.random() * 1.2 + 0.8
        })
      }
    }

    const animate = () => {
      if (!running) return

      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y

          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 110) {
            ctx.strokeStyle =
              `rgba(255,255,255,${0.07 * (1 - distance / 110)})`

            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      for (const particle of particles) {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x <= 0 || particle.x >= width) {
          particle.vx *= -1
        }

        if (particle.y <= 0 || particle.y >= height) {
          particle.vy *= -1
        }

        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.beginPath()
        ctx.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    initialize()
    animate()

    const resizeObserver = new ResizeObserver(initialize)
    resizeObserver.observe(canvas)

    return () => {
      running = false
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}

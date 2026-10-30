'use client'

import { useEffect, useRef } from 'react'

type Props = { className?: string; tone?: 'auto' | 'light' }
/** One renderer for every dotted network background. Dimensions determine density. */
export default function AnimatedNetwork({ className = '', tone = 'auto' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let width = 0, height = 0, frame = 0, last = 0, visible = false, active = true
    let particles: { x: number; y: number; vx: number; vy: number; radius: number }[] = []
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const oldWidth = width, oldHeight = height
      width = rect.width; height = rect.height
      const dpr = Math.min(devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.max(18, Math.min(65, Math.round(width * height / 24000)))
      particles = particles.slice(0, count).map(p => ({ ...p, x: oldWidth ? p.x / oldWidth * width : p.x, y: oldHeight ? p.y / oldHeight * height : p.y }))
      while (particles.length < count) particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - .5) * 24, vy: (Math.random() - .5) * 24, radius: 1.2 + Math.random() * 1.3 })
      refresh()
    }
    const draw = (seconds: number) => {
      const rgb = tone === 'light' ? '255,255,255' : document.documentElement.classList.contains('dark') ? '165,180,252' : '99,102,241'
      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        p.x = Math.max(0, Math.min(width, p.x + p.vx * seconds))
        p.y = Math.max(0, Math.min(height, p.y + p.vy * seconds))
        if (p.x <= 0 || p.x >= width) p.vx *= -1
        if (p.y <= 0 || p.y >= height) p.vy *= -1
        ctx.fillStyle = `rgba(${rgb},0.32)`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill()
      }
      for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j], distance = Math.hypot(a.x - b.x, a.y - b.y)
        if (distance >= 120) continue
        ctx.strokeStyle = `rgba(${rgb},${.16 * (1 - distance / 120)})`; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      }
    }
    const tick = (now: number) => {
      frame = 0
      if (!active || !visible || document.hidden) { last = 0; return }
      if (!last || now - last >= 1000 / 30) {
        draw(motion.matches || !last ? 0 : Math.min((now - last) / 1000, .1))
        last = now
      }
      if (!motion.matches) frame = requestAnimationFrame(tick)
    }
    function refresh() {
      cancelAnimationFrame(frame); frame = 0; last = 0
      if (active && visible && !document.hidden) frame = requestAnimationFrame(tick)
    }
    const size = new ResizeObserver(resize)
    const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; refresh() })
    const theme = new MutationObserver(refresh)
    size.observe(canvas); intersection.observe(canvas)
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    document.addEventListener('visibilitychange', refresh)
    motion.addEventListener('change', refresh)
    resize()
    return () => {
      active = false; cancelAnimationFrame(frame)
      size.disconnect(); intersection.disconnect(); theme.disconnect()
      document.removeEventListener('visibilitychange', refresh); motion.removeEventListener('change', refresh)
    }
  }, [tone])
  return <canvas ref={ref} aria-hidden="true" data-network-background="shared" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />
}

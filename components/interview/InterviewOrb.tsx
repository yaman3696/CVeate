"use client";
import { useEffect, useRef } from "react";
import {
  speechMotion,
  particleRadius,
  idleOrbEnvelope,
} from "@/lib/interview-orb-motion";

type OrbState = "idle" | "speaking" | "listening" | "thinking";
/** A moving 3D point cloud projected onto canvas, with no asset downloads. */
export default function InterviewOrb({
  stream = null,
  state = "idle",
  small = false,
  displaySize,
}: {
  stream?: MediaStream | null;
  state?: OrbState;
  small?: boolean;
  displaySize?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    clock = useRef(0),
    idleCycle = useRef<{
      start: number;
      duration: number;
      seed: number;
      amount: number;
    } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const size = small ? 144 : 272,
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const count = small ? 900 : 2300,
      golden = Math.PI * (3 - Math.sqrt(5));
    const points = Array.from({ length: count }, (_, i) => {
      const y = 1 - (2 * (i + 0.5)) / count,
        r = Math.sqrt(1 - y * y),
        angle = i * golden;
      return {
        x: Math.cos(angle) * r,
        y,
        z: Math.sin(angle) * r,
        phase: angle,
        seed: i / count,
        emitter: Math.abs((Math.sin(i * 78.233) * 43758.5453) % 1) > 0.82,
        index: i,
      };
    });
    let context: AudioContext | undefined,
      analyser: AnalyserNode | undefined,
      data: Float32Array<ArrayBuffer> | undefined;
    if (stream)
      try {
        context = new AudioContext();
        analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        context.createMediaStreamSource(stream).connect(analyser);
        data = new Float32Array(analyser.fftSize);
        void context.resume().catch(() => {});
      } catch {
        /* Status text remains available if audio analysis is unsupported. */
      }
    let frame = 0,
      last = 0,
      visible = true,
      level = 0,
      pitchTone = 0.35;
    const draw = (now: number) => {
      frame=0;
      if (!visible || document.hidden) {last=0;return;}
      if (now - last < 1000 / 30 && !reduced) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const dt = last ? Math.min((now - last) / 1000, 0.07) : 0.033;
      last = now;
      if (!reduced) clock.current += dt;
      const t = clock.current;
      if (
        !idleCycle.current ||
        t - idleCycle.current.start >= idleCycle.current.duration
      ) {
        idleCycle.current = {
          start: t,
          duration: 6 + Math.random() * 3.5,
          seed: Math.random() * Math.PI * 2,
          amount: 0.18 + Math.random() * 0.06,
        };
      }
      const cycle = idleCycle.current;
      const idle =
        state === "idle" && !reduced
          ? {
              amount:
                cycle.amount * idleOrbEnvelope(t - cycle.start, cycle.duration),
              seed: cycle.seed,
            }
          : undefined;

      let target = 0;
      if (analyser && data && context) {
        analyser.getFloatTimeDomainData(data);
        const features = speechMotion(data, context.sampleRate);
        target = features.level;
        if (features.pitchHz)
          pitchTone +=
            (Math.max(0, Math.min(1, (features.pitchHz - 80) / 420)) -
              pitchTone) *
            0.16;
      }
      level += (target - level) * 0.24;
      const activity = reduced
        ? 0
        : state === "speaking"
          ? 0.16 + 0.07 * Math.sin(t * 9)
          : state === "thinking"
            ? 0.12
            : level;
      // Reassert drawing scale so a context reset cannot shrink or offset the orb.
      ctx.setTransform(canvas.width / size, 0, 0, canvas.height / size, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const dark = document.documentElement.classList.contains("dark");
      const halo = ctx.createRadialGradient(
        size / 2,
        size / 2,
        size * 0.08,
        size / 2,
        size / 2,
        size * 0.48,
      );
      halo.addColorStop(
        0,
        dark ? "rgba(99,102,241,.12)" : "rgba(99,102,241,.08)",
      );
      halo.addColorStop(1, "rgba(99,102,241,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size, size);
      const angle = t * 0.24,
        tilt = 0.35 + Math.sin(t * 0.22) * 0.22,
        ca = Math.cos(angle),
        sa = Math.sin(angle),
        ct = Math.cos(tilt),
        st = Math.sin(tilt),
        radius = size * 0.29;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius * 1.041, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${dark ? "165,180,252" : "99,102,241"},${Math.max(0.015, (dark ? 0.12 : 0.1) * (1 - (idle?.amount || 0) * 4))})`;
      ctx.lineWidth = 0.65;
      ctx.stroke();
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (const p of points) {
        const r = reduced
          ? 1
          : particleRadius(p.phase, t, p.emitter, activity, pitchTone, idle);
        const x0 = p.x * r,
          z0 = p.z * r;
        const x = x0 * ca + z0 * sa,
          z1 = z0 * ca - x0 * sa,
          y = p.y * r * ct - z1 * st,
          z = p.y * r * st + z1 * ct;
        const perspective = 3.6 / (3.6 - z),
          px = size / 2 + x * radius * perspective,
          py = size / 2 + y * radius * perspective;
        const depth = (z + 1.5) / 3,
          alpha = Math.max(
            0.12,
            Math.min(0.95, (dark ? 0.25 : 0.2) + depth * 0.65),
          );
        const hue =
          state === "listening"
            ? 225 + pitchTone * 25 + depth * 10
            : 235 + depth * 25;
        ctx.fillStyle = `hsla(${hue},${dark ? 85 : 75}%,${dark ? 76 : 48}%,${alpha})`;
        if (p.index % 7 === 0 && p.index + 34 < count) {
          const next = points[p.index + 34],
            nx = next.x * ca + next.z * sa,
            nz = next.z * ca - next.x * sa,
            ny = next.y * ct - nz * st,
            depthNext = next.y * st + nz * ct,
            scaleNext = 3.6 / (3.6 - depthNext),
            endX = size / 2 + nx * radius * scaleNext,
            endY = size / 2 + ny * radius * scaleNext;
          if (Math.hypot(endX - px, endY - py) < radius * 0.28) {
            ctx.strokeStyle = dark
              ? "rgba(165,180,252,.10)"
              : "rgba(99,102,241,.075)";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
        }
        if (p.emitter && r > 1.055) {
          const coreX = p.x * ca + p.z * sa,
            coreZ = p.z * ca - p.x * sa,
            coreY = p.y * ct - coreZ * st,
            depthZ = p.y * st + coreZ * ct,
            corePerspective = 3.6 / (3.6 - depthZ);
          ctx.strokeStyle = dark
            ? "rgba(165,180,252,.2)"
            : "rgba(99,102,241,.16)";
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(
            size / 2 + coreX * radius * corePerspective,
            size / 2 + coreY * radius * corePerspective,
          );
          ctx.lineTo(px, py);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(
          px,
          py,
          (small ? 0.52 : 0.65) * perspective * (0.65 + depth * 0.6),
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Sparse glints keep the cloud luminous without a large flat glow.
        if (p.seed < 0.035 && depth > 0.55) {
          ctx.fillStyle = `rgba(${dark ? "215,225,255" : "99,102,241"},${alpha * 0.14})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.3 * perspective, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    const schedule=()=>{if(visible&&!document.hidden&&!frame)frame=requestAnimationFrame(draw)};
    const visibility=()=>{cancelAnimationFrame(frame);frame=0;last=0;schedule()};
    document.addEventListener("visibilitychange",visibility);
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if(!visible){cancelAnimationFrame(frame);frame=0;last=0}else schedule();
    });
    observer.observe(canvas);
    const themeObserver = reduced
      ? new MutationObserver(() => {
          cancelAnimationFrame(frame);
          last = 0;
          frame=0;schedule();
        })
      : null;
    themeObserver?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange",visibility);
      themeObserver?.disconnect();
      void context?.close().catch(() => {});
    };
  }, [stream, state, small]);
  return (
    <div
      role="img"
      aria-label={`AI interview particle orb, ${state}`}
      className="relative mx-auto shrink-0"
      style={{
        width: displaySize ?? (small ? 144 : 272),
        maxWidth: "100%",
        aspectRatio: "1 / 1",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 block h-full w-full"
      />
    </div>
  );
}

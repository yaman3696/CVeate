/** Local-only visual speech features; not a diagnostic or a stored voice profile. */
export function speechMotion(
  samples: Float32Array,
  sampleRate: number,
): { level: number; pitchHz: number } {
  let sum = 0,
    power = 0;
  for (const v of samples) {
    sum += v;
    power += v * v;
  }
  const rms = Math.sqrt(power / Math.max(1, samples.length)),
    level = Math.min(1, Math.max(0, (rms - 0.006) * 8));
  if (rms < 0.008 || samples.length < 512 || sampleRate <= 0)
    return { level, pitchHz: 0 };
  const stride = 4,
    n = Math.floor(samples.length / stride),
    mean = sum / samples.length,
    rate = sampleRate / stride,
    minLag = Math.max(2, Math.floor(rate / 600)),
    maxLag = Math.min(Math.ceil(rate / 70), Math.floor(n / 2)),
    window = n - maxLag - 1;
  const scores = new Float32Array(maxLag + 2);
  let best = 0;
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    let dot = 0,
      a = 0,
      b = 0;
    for (let i = 0; i < window; i++) {
      const x = samples[i * stride] - mean,
        y = samples[(i + lag) * stride] - mean;
      dot += x * y;
      a += x * x;
      b += y * y;
    }
    const score = a * b > 0 ? dot / Math.sqrt(a * b) : 0;
    scores[lag] = score;
    if (lag >= minLag && lag <= maxLag) best = Math.max(best, score);
  }
  if (best < 0.7) return { level, pitchHz: 0 };
  for (let lag = minLag; lag <= maxLag; lag++)
    if (
      scores[lag] >= Math.max(0.7, best * 0.9) &&
      scores[lag] > scores[lag - 1] &&
      scores[lag] >= scores[lag + 1]
    ) {
      const denominator = scores[lag - 1] - 2 * scores[lag] + scores[lag + 1],
        shift = denominator
          ? Math.max(
              -0.5,
              Math.min(
                0.5,
                (0.5 * (scores[lag - 1] - scores[lag + 1])) / denominator,
              ),
            )
          : 0;
      return { level, pitchHz: rate / (lag + shift) };
    }
  return { level, pitchHz: 0 };
}
export function particleRadius(
  phase: number,
  time: number,
  emitter: boolean,
  level: number,
  pitchTone: number,
  idle?: { amount: number; seed: number },
) {
  const amount = Math.min(0.25, Math.max(0, idle?.amount || 0)),
    seed = idle?.seed || 0;
  const wave = 0.7 * Math.sin(phase + seed) + 0.3 * Math.sin(phase * 2 - seed);
  const core = 1 + 0.008 * Math.sin(phase + time * 0.45) + amount * wave * 0.45;
  if (!emitter) return core;
  const pulse =
    Math.max(0, Math.sin(phase * 1.37 - time * (1.15 + pitchTone * 1.6))) ** 6;
  const escape =
    amount * (0.4 + 0.9 * Math.max(0, Math.sin(phase - seed)) ** 4);
  return Math.min(
    1.45,
    core +
      escape +
      pulse *
        (0.035 + Math.min(1, Math.max(0, level)) * (0.12 + 0.15 * pitchTone)),
  );
}

/** One full calm → disperse → reform cycle, with a still interval at either end. */
export function idleOrbEnvelope(elapsed: number, duration: number) {
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  const smooth = (v: number) => v * v * (3 - 2 * v);
  if (progress < 0.12 || progress > 0.9) return 0;
  if (progress < 0.44) return smooth((progress - 0.12) / 0.32);
  if (progress < 0.56) return 1;
  return 1 - smooth((progress - 0.56) / 0.34);
}

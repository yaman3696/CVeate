export type InterviewMode = "text" | "conversation" | "unknown";
export type InterviewStage =
  | "preparation"
  | "speech"
  | "transcription"
  | "feedback";
export type RateSnapshot = {
  rates: Record<string, number>;
  usdToInr: number;
  source: string;
  verifiedAt: string;
};
export type TokenUsage = {
  input: number;
  audioInput: number | null;
  output: number;
  thinking: number;
  cached: number;
  cachedAudio: number | null;
};
const rate = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
export function geminiCost(
  snapshot: RateSnapshot | null,
  u: TokenUsage,
): number | null {
  if (
    !snapshot ||
    !rate(snapshot.usdToInr) ||
    snapshot.usdToInr === 0 ||
    u.audioInput === null ||
    u.cachedAudio === null
  )
    return null;
  const r = snapshot.rates;
  if (
    ![
      r.input_usd_per_million,
      r.audio_input_usd_per_million,
      r.output_usd_per_million,
      r.cached_input_usd_per_million,
      r.cached_audio_usd_per_million,
    ].every(rate)
  )
    return null;
  if (
    ![
      u.input,
      u.audioInput,
      u.output,
      u.thinking,
      u.cached,
      u.cachedAudio,
    ].every(rate) ||
    u.audioInput > u.input ||
    u.cachedAudio > u.audioInput ||
    u.cachedAudio > u.cached ||
    u.cached > u.input ||
    u.cached - u.cachedAudio > u.input - u.audioInput
  )
    return null;
  const audio = u.audioInput - u.cachedAudio,
    text = u.input - u.audioInput - (u.cached - u.cachedAudio);
  return (
    ((text * r.input_usd_per_million +
      audio * r.audio_input_usd_per_million +
      (u.cached - u.cachedAudio) * r.cached_input_usd_per_million +
      u.cachedAudio * r.cached_audio_usd_per_million +
      (u.output + u.thinking) * r.output_usd_per_million) /
      1e6) *
    snapshot.usdToInr
  );
}
export function sarvamCost(
  snapshot: RateSnapshot | null,
  characters: number,
): number | null {
  const r = snapshot?.rates.inr_per_10000_characters;
  return rate(r) && Number.isSafeInteger(characters) && characters >= 0
    ? (characters * r) / 10000
    : null;
}

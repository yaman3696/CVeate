import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { geminiCost, type RateSnapshot } from '@/lib/interview-cost-calculation'
export async function geminiRateSnapshot(model: string): Promise<RateSnapshot | null> {
  try {
    const [p,f] = await Promise.all([
      supabaseAdmin.from('interview_provider_rates').select('rates,source_url,verified_at').eq('provider','gemini').eq('model',model.replace(/^models\//,'')).maybeSingle(),
      supabaseAdmin.from('interview_cost_settings').select('usd_to_inr').eq('singleton',true).single(),
    ])
    if (p.error || f.error || !p.data || !f.data) return null
    return {rates:p.data.rates,usdToInr:Number(f.data.usd_to_inr),source:p.data.source_url,verifiedAt:p.data.verified_at}
  } catch { return null }
}
export function textUsageCost(snapshot: RateSnapshot | null, usage: {promptTokenCount?:number;candidatesTokenCount?:number;thoughtsTokenCount?:number;cachedContentTokenCount?:number}): number | null {
  if (typeof usage.promptTokenCount !== 'number' || typeof usage.candidatesTokenCount !== 'number') return null
  return geminiCost(snapshot,{input:usage.promptTokenCount,audioInput:0,output:usage.candidatesTokenCount,thinking:usage.thoughtsTokenCount||0,cached:usage.cachedContentTokenCount||0,cachedAudio:0})
}
/** Reconstruct planning estimates without overwriting the historical database rows. */
export function priceLegacyAts<T extends {feature?:string;model?:string;input_tokens?:number|null;output_tokens?:number|null;thinking_tokens?:number|null;estimated_cost_inr:number|null}>(rows:T[],snapshot:RateSnapshot|null):(T & {cost_estimate_basis?:string;cost_lower_inr?:number;cost_upper_inr?:number})[] {
  return rows.map(row => {
    if (row.estimated_cost_inr !== null || row.model?.replace(/^models\//,'') !== 'gemini-3.1-flash-lite') return row
    if (row.feature === 'ats_checker') return {...row,estimated_cost_inr:textUsageCost(snapshot,{promptTokenCount:row.input_tokens??undefined,candidatesTokenCount:row.output_tokens??undefined,thoughtsTokenCount:row.thinking_tokens??0})}
    if (!['interview_conversation','interview_evaluation'].includes(row.feature||'') || !snapshot) return row
    const input=row.input_tokens, output=row.output_tokens, thinking=row.thinking_tokens??0, fx=snapshot.usdToInr
    const r=snapshot.rates
    const rates=[r.input_usd_per_million,r.audio_input_usd_per_million,r.cached_input_usd_per_million,r.cached_audio_usd_per_million]
    if (![input,output,thinking,fx,r.output_usd_per_million,...rates].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0) || !fx) return row
    // Any text/audio/cache mix lies inside these token-price bounds. No modality is invented.
    const lower=((input! * Math.min(...rates)+(output!+thinking)*r.output_usd_per_million)/1e6)*fx
    const upper=((input! * Math.max(...rates)+(output!+thinking)*r.output_usd_per_million)/1e6)*fx
    return {...row,estimated_cost_inr:upper,cost_estimate_basis:'legacy_interview_range',cost_lower_inr:lower,cost_upper_inr:upper}
  })
}

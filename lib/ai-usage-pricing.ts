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
/** Current-rate planning estimate only for historical ATS text/document calls lacking a stored estimate. */
export function priceLegacyAts<T extends {feature?:string;model?:string;input_tokens?:number|null;output_tokens?:number|null;thinking_tokens?:number|null;estimated_cost_inr:number|null}>(rows:T[],snapshot:RateSnapshot|null):T[] {
  return rows.map(row=>row.estimated_cost_inr!==null || row.feature!=='ats_checker' || row.model?.replace(/^models\//,'')!=='gemini-3.1-flash-lite' ? row : {...row,estimated_cost_inr:textUsageCost(snapshot,{promptTokenCount:row.input_tokens??undefined,candidatesTokenCount:row.output_tokens??undefined,thoughtsTokenCount:row.thinking_tokens??0})})
}

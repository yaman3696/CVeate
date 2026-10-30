import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  type InterviewMode,
  type InterviewStage,
  type RateSnapshot,
} from "@/lib/interview-cost-calculation";
export type CostContext = {
  interviewId: string;
  mode: InterviewMode;
  stage: InterviewStage;
};
export async function costSession(
  userId: string,
  id: string,
  mode: InterviewMode,
) {
  try {
    const r = await supabaseAdmin
      .from("interview_cost_sessions")
      .upsert(
        { id, user_id: userId, mode },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .abortSignal(AbortSignal.timeout(2000));
    if (r.error)
      console.error("[interview_cost_session_unrecorded]", {
        code: r.error.code,
      });
  } catch {
    console.error("[interview_cost_session_unrecorded]");
  }
}
export async function costMilestone(
  id: string,
  kind: "prepared" | "reviewed",
  credits = 0,
) {
  try {
    const r = await supabaseAdmin
      .from("interview_cost_sessions")
      .update(
        kind === "prepared"
          ? { prepared_at: new Date().toISOString() }
          : { reviewed_at: new Date().toISOString(), credits_charged: credits },
      )
      .eq("id", id)
      .is(kind === "prepared" ? "prepared_at" : "reviewed_at", null)
      .abortSignal(AbortSignal.timeout(2000));
    if (r.error)
      console.error("[interview_cost_milestone_unrecorded]", {
        code: r.error.code,
      });
  } catch {
    console.error("[interview_cost_milestone_unrecorded]");
  }
}
export async function beginCost(
  userId: string,
  context: CostContext,
  provider: "gemini" | "sarvam",
  model: string,
) {
  const id = crypto.randomUUID();
  let snapshot: RateSnapshot | null = null;
  try {
    await costSession(userId, context.interviewId, context.mode);
    const [price, fx] = await Promise.all([
      supabaseAdmin
        .from("interview_provider_rates")
        .select("rates,source_url,verified_at")
        .eq("provider", provider)
        .eq("model", model.replace(/^models\//, ""))
        .abortSignal(AbortSignal.timeout(2000))
        .maybeSingle(),
      supabaseAdmin
        .from("interview_cost_settings")
        .select("usd_to_inr")
        .eq("singleton", true)
        .abortSignal(AbortSignal.timeout(2000))
        .single(),
    ]);
    if (!price.error && !fx.error && price.data && fx.data)
      snapshot = {
        rates: price.data.rates,
        usdToInr: Number(fx.data.usd_to_inr),
        source: price.data.source_url,
        verifiedAt: price.data.verified_at,
      };
    const r = await supabaseAdmin
      .from("interview_cost_events")
      .insert({
        id,
        session_id: context.interviewId,
        stage: context.stage,
        provider,
        model,
        status: "started",
        rate_snapshot: snapshot,
      })
      .abortSignal(AbortSignal.timeout(2000));
    if (r.error)
      console.error("[interview_cost_attempt_unrecorded]", {
        code: r.error.code,
      });
  } catch {
    console.error("[interview_cost_attempt_unrecorded]");
  }
  return { id, snapshot };
}
export async function finishCost(
  id: string,
  fields: {
    status: "generated" | "invalid_response" | "failed";
    input_tokens?: number;
    audio_input_tokens?: number | null;
    output_tokens?: number;
    thinking_tokens?: number;
    cached_tokens?: number;
    cached_audio_tokens?: number | null;
    characters?: number;
    estimated_cost_inr: number | null;
    resolved_model?: string;
    provider_request_id?: string;
  },
) {
  try {
    const r = await supabaseAdmin
      .from("interview_cost_events")
      .update({
        ...fields,
        provider_request_id: fields.provider_request_id?.slice(0, 120),
        finished_at: new Date().toISOString(),
      })
      .eq("id", id)
      .abortSignal(AbortSignal.timeout(2000));
    if (r.error)
      console.error("[interview_cost_finish_unrecorded]", {
        code: r.error.code,
      });
  } catch {
    console.error("[interview_cost_finish_unrecorded]");
  }
}

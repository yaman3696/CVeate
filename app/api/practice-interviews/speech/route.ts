import { NextRequest } from "next/server";
import {
  enterpriseUser,
  privateHeaders as headers,
} from "@/lib/enterprise-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyInterview } from "@/lib/private-interview";
import { beginCost, finishCost } from "@/lib/interview-costs";
import { sarvamCost } from "@/lib/interview-cost-calculation";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  let tracking: Awaited<ReturnType<typeof beginCost>> | null = null;
  let characters = 0;
  try {
    const user = await enterpriseUser(req.headers.get("authorization"));
    if (!user)
      return Response.json(
        { error: "Sign in first." },
        { status: 401, headers },
      );
    if (Number(req.headers.get("content-length") || 0) > 24000)
      return Response.json(
        { error: "Request too large." },
        { status: 413, headers },
      );
    const body = await req.json(),
      interview = verifyInterview(body.token, user.id);
    if (
      !interview ||
      !Number.isInteger(body.index) ||
      body.index < 0 ||
      body.index > 4
    )
      return Response.json(
        { error: "Invalid interview question." },
        { status: 400, headers },
      );
    if (!process.env.SARVAM_API_KEY)
      return Response.json(
        {
          error:
            "Natural voice is temporarily unavailable. You can continue with the question shown on screen.",
        },
        { status: 503, headers },
      );
    const quota = await supabaseAdmin.rpc("reserve_practice_audio", {
      p_user: user.id,
      p_id: interview.id,
      p_version: body.version,
    });
    if (quota.error)
      return Response.json(
        {
          error:
            "Speech allowance reached or session no longer active. You can continue with text.",
        },
        { status: 429, headers },
      );
    const model = process.env.SARVAM_TTS_MODEL || "bulbul:v3";
    const text = interview.questions[body.index];
    characters = Array.from(text).length;
    tracking = await beginCost(
      user.id,
      {
        interviewId: interview.id,
        mode: interview.mode || "unknown",
        stage: "speech",
      },
      "sarvam",
      model,
    );
    const result = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": process.env.SARVAM_API_KEY,
      },
      body: JSON.stringify({
        text,
        language_code: "en-IN",
        model,
        speaker:
          process.env.SARVAM_TTS_SPEAKER ||
          (model === "bulbul:v4-flash" ? "shubh_enhi_ads" : "ratan"),
        pace: 1,
        speech_sample_rate: 24000,
        output_audio_codec: "wav",
      }),
    });
    if (!result.ok) {
      await finishCost(tracking.id, {
        status: "failed",
        characters,
        estimated_cost_inr: null,
      });
      console.error("[interview_speech]", { status: result.status });
      return Response.json(
        {
          error:
            "The voice service is unavailable. Read the question or retry the voice.",
        },
        { status: 503, headers },
      );
    }
    const data = await result.json();
    const valid =
      Array.isArray(data.audios) &&
      typeof data.audios[0] === "string" &&
      !!data.audios[0];
    await finishCost(tracking.id, {
      status: valid ? "generated" : "invalid_response",
      characters,
      estimated_cost_inr: sarvamCost(tracking.snapshot, characters),
      provider_request_id:
        typeof data.request_id === "string" ? data.request_id : undefined,
    });
    tracking = null;
    if (
      !Array.isArray(data.audios) ||
      typeof data.audios[0] !== "string" ||
      !data.audios[0]
    )
      throw Error("No speech returned");
    // Playback only: never write generated speech or microphone audio to Storage.
    return new Response(Buffer.from(data.audios[0], "base64"), {
      headers: { ...headers, "Content-Type": "audio/wav" },
    });
  } catch {
    if (tracking)
      await finishCost(tracking.id, {
        status: "failed",
        characters,
        estimated_cost_inr: null,
      });
    return Response.json(
      { error: "Voice playback could not finish. You can continue with text." },
      { status: 503, headers },
    );
  }
}

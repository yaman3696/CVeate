import { signupAccess } from '@/lib/signup-server'
import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { generatePracticeResponse as generate } from "@/lib/practice-ai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  enterpriseUser,
  privateHeaders as headers,
} from "@/lib/enterprise-server";
import { PRACTICE_LEVELS, parsePracticePlan } from "@/lib/practice-interview";
import { signInterview } from "@/lib/private-interview";
import { costMilestone } from "@/lib/interview-costs";
export const maxDuration = 90;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers });
const failure = (error: unknown) => {
  if (
    error instanceof Error &&
    "digest" in error &&
    error.digest === "NEXT_PRERENDER_INTERRUPTED"
  )
    throw error;
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  const setup = ["42P01", "PGRST202", "PGRST205"].includes(code);
  const ai = [
    "AI_CONFIGURATION",
    "AI_UNAVAILABLE",
    "AI_INVALID_RESPONSE",
  ].includes(code);
  const message = setup
    ? "The interview database setup needs to be completed."
    : ai && error instanceof Error
      ? error.message
      : code === "40001"
        ? "This session changed or is processing. Recover it before retrying."
        : code === "54000"
          ? "Today’s practice allowance has been reached. Please try again tomorrow."
          : code === "P0002"
            ? "You need a Career Credit for the final evaluation."
            : code === "42501"
              ? "Session access denied."
              : error instanceof SyntaxError
                ? "The AI response was incomplete. Please retry preparation."
                : "This step could not be saved. Your draft is kept; please retry.";
  if (!ai)
    console.error("[practice_interview]", {
      code: code || "UNEXPECTED",
      setup,
    });
  return json(
    { error: message, code: code || "PRACTICE_FAILED" },
    code === "40001"
      ? 409
      : code === "54000"
        ? 429
        : code === "P0002"
          ? 402
          : code === "42501"
            ? 403
            : 503,
  );
};

export async function GET() {
  return json(
    {
      error:
        "Private interviews stay in the current tab. Start a new interview after a reload.",
    },
    410,
  );
}
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization");
  let id: string | null = null,
    userId: string | null = null,
    preparationVersion: number | null = null;
  try {
    const user = await enterpriseUser(token);
    if (!user)
      return json({ error: "Sign in to personalise an interview." }, 401);
    const signupDenied = await signupAccess(user.id);
    if (signupDenied) return signupDenied;
    userId = user.id;
    if (Number(req.headers.get("content-length") || 0) > 3 * 1024 * 1024)
      return json({ error: "Use a PDF or TXT CV up to 2 MB." }, 413);
    const form = await req.formData(),
      role = String(form.get("role") || "").trim(),
      seniority = String(form.get("seniority") || ""),
      jd = String(form.get("jd") || "").trim(),
      file = form.get("cv"),
      requestId = String(form.get("requestId") || "");
    if (
      !uuid.test(requestId) ||
      role.length < 2 ||
      role.length > 100 ||
      !PRACTICE_LEVELS.includes(seniority) ||
      jd.length > 15000 ||
      (!jd && !(file instanceof File && file.size))
    )
      return json(
        { error: "Add a target role and a job description or CV." },
        400,
      );
    let inline: { mimeType: string; data: string } | undefined;
    if (file instanceof File && file.size) {
      if (
        file.size > 2 * 1024 * 1024 ||
        !["application/pdf", "text/plain"].includes(file.type)
      )
        return json({ error: "Choose a PDF or TXT CV up to 2 MB." }, 400);
      const bytes = Buffer.from(await file.arrayBuffer());
      if (
        file.type === "application/pdf" &&
        bytes.subarray(0, 5).toString() !== "%PDF-"
      )
        return json({ error: "This is not a valid PDF." }, 400);
      if (file.type === "application/pdf") {
        try {
          const pdf = await PDFDocument.load(bytes);
          if (pdf.getPageCount() > 10)
            return json({ error: "Use a CV with at most 10 pages." }, 400);
        } catch {
          return json(
            {
              error:
                "This PDF could not be read. Try a different PDF or TXT file.",
            },
            400,
          );
        }
      } else if (bytes.toString("utf8").length > 30000)
        return json({ error: "Use a TXT CV up to 30,000 characters." }, 400);
      inline = { mimeType: file.type, data: bytes.toString("base64") };
    }
    const reserved = await supabaseAdmin.rpc("reserve_practice_interview", {
      p_user: user.id,
      p_id: requestId,
      p_role: "Private AI interview",
      p_seniority: "Private",
    });
    if (reserved.error) throw reserved.error;
    let row = reserved.data;
    if (row.existing) {
      const expiredGeneration =
        row.status === "generating" &&
        Date.parse(row.updated_at) < Date.now() - 120000;
      if (row.status !== "failed" && !expiredGeneration)
        return json(
          {
            error:
              "Preparation is already running or finished. Please keep the original tab open.",
          },
          409,
        );
      if (Date.parse(row.created_at) < Date.now() - 86400000)
        return json(
          { error: "This session expired. Start a new interview." },
          410,
        );
      if (row.version >= 3)
        return json(
          {
            error:
              "Preparation has failed repeatedly. Keep your CV/JD and try a new session later.",
          },
          429,
        );
      const profile = await supabaseAdmin
        .from("profiles")
        .select("role,career_credits")
        .eq("id", user.id)
        .single();
      if (profile.error) throw profile.error;
      if (profile.data.role !== "admin" && profile.data.career_credits < 1)
        return json(
          { error: "You need a Career Credit for the final evaluation." },
          402,
        );
      const retry = await supabaseAdmin
        .from("practice_interviews")
        .update({
          status: "generating",
          version: row.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("user_id", user.id)
        .eq("status", row.status)
        .eq("version", row.version)
        .select("id,version")
        .maybeSingle();
      if (retry.error) throw retry.error;
      if (!retry.data)
        return json(
          {
            error: "Preparation is already being retried. Recover the session.",
          },
          409,
        );
      row = { ...row, version: retry.data.version };
    }
    id = requestId;
    preparationVersion = row.version;
    const selectedMode = form.get("mode");
    const mode =
      selectedMode === "text" || selectedMode === "conversation"
        ? selectedMode
        : "unknown";
    const plan = parsePracticePlan(
      await generate(
        user.id,
        id,
        `Create a short five-question practice interview for ${JSON.stringify({ role, seniority, jd })}. A CV may be attached. Use only relevant skills/work evidence from these sources; do not include names or contact details. Return JSON {"context":"brief anonymous role/skills context for follow-ups","questions":[five different questions as strings]}. Questions should fit ${seniority}, cover relevant competencies, and avoid unsupported assumptions.`,
        inline,
        "interview_conversation",
        { interviewId: requestId, mode, stage: "preparation" },
      ),
    );
    // The database keeps only session/quota metadata. CV/JD, questions and answers stay out of it.
    const saved = await supabaseAdmin
      .from("practice_interviews")
      .update({
        context: "",
        plan: [],
        questions: [],
        answers: [],
        pending_answer: null,
        acknowledgement: "",
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "generating")
      .eq("version", preparationVersion!)
      .select("id,version,created_at")
      .single();
    if (saved.error) throw saved.error;
    await costMilestone(requestId, "prepared");
    const interview: Parameters<typeof signInterview>[0] = {
      mode,
      id: requestId,
      user: user.id,
      role,
      seniority,
      questions: plan.questions,
      expires: Date.now() + 86400000,
    };
    return json(
      {
        session: {
          id: requestId,
          role,
          seniority,
          questions: plan.questions,
          answers: [],
          status: "active",
          version: saved.data.version,
          created_at: saved.data.created_at,
          token: signInterview(interview),
        },
      },
      201,
    );
  } catch (e) {
    if (id && userId)
      await supabaseAdmin
        .from("practice_interviews")
        .update({ status: "failed" })
        .eq("id", id)
        .eq("user_id", userId)
        .eq("status", "generating")
        .eq("version", preparationVersion!);
    return failure(e);
  }
}
export async function PATCH() {
  return json(
    {
      error: "Answers are collected locally and reviewed together at the end.",
    },
    410,
  );
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization");
  try {
    const user = await enterpriseUser(token);
    if (!user) return json({ error: "Sign in first." }, 401);
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!uuid.test(id)) return json({ error: "Invalid session." }, 400);
    const { error } = await supabaseAdmin
      .from("practice_interviews")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    return json({ session: null });
  } catch (e) {
    return failure(e);
  }
}

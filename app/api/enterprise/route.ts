import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  enterpriseUser,
  employerMembership,
  privateHeaders as headers,
  enterpriseError,
} from "@/lib/enterprise-server";
import { JOB_FIELDS, validateJob } from "@/lib/enterprise";
import { enterpriseAccess } from "@/lib/enterprise-access";
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers });
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization");
  try {
    const user = await enterpriseUser(token);
    if (!user) return json({ error: "Sign in to open your workspace." }, 401);
    const access = await enterpriseAccess(user.id, token);
    if (!access.allowed)
      return json({ error: "Enterprise access is by invitation only." }, 403);
    const members = await supabaseAdmin
      .from("organization_members")
      .select("role,organizations(id,name,website,status,created_at)")
      .eq("user_id", user.id);
    if (members.error) throw members.error;
    const orgs = (members.data || []).flatMap((m) => {
      const company = Array.isArray(m.organizations)
        ? m.organizations[0]
        : m.organizations;
      return company ? [{ ...company, role: m.role }] : [];
    });
    const requested = req.nextUrl.searchParams.get("organizationId");
    const org = requested
      ? orgs.find((o) => (o as unknown as { id: string }).id === requested)
      : orgs[0];
    if (requested && !org)
      return json({ error: "Workspace access denied." }, 403);
    if (!org) return json({ organizations: [], jobs: [] });
    const id = (org as unknown as { id: string }).id;
    const jobs = await supabaseAdmin
      .from("enterprise_jobs")
      .select(JOB_FIELDS)
      .eq("organization_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (jobs.error) throw jobs.error;
    return json({ organizations: orgs, organization: org, jobs: jobs.data });
  } catch (e) {
    return enterpriseError(e);
  }
}
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization");
  try {
    const user = await enterpriseUser(token);
    if (!user) return json({ error: "Sign in first." }, 401);
    const access = await enterpriseAccess(user.id, token);
    if (!access.allowed)
      return json({ error: "Enterprise access is by invitation only." }, 403);
    if (!user.email_confirmed_at)
      return json(
        { error: "Verify your email before creating a company workspace." },
        403,
      );
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "",
      website = typeof body?.website === "string" ? body.website.trim() : "";
    if (name.length < 2 || name.length > 100 || website.length > 300)
      return json({ error: "Enter a company name and HTTPS website." }, 400);
    let url: URL;
    try {
      url = new URL(website);
    } catch {
      return json({ error: "Enter a full HTTPS company website." }, 400);
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !url.hostname.includes(".")
    )
      return json({ error: "Enter a valid HTTPS company website." }, 400);
    const { data, error } = await supabaseAdmin.rpc(
      "create_enterprise_workspace",
      { p_user: user.id, p_name: name, p_website: url.origin },
    );
    if (error)
      return json(
        {
          error:
            error.code === "23505"
              ? "You already have an owner workspace. Open it above."
              : "Unable to create workspace. Check Enterprise database setup.",
        },
        error.code === "23505" ? 409 : 503,
      );
    return json({ organization: data }, 201);
  } catch (e) {
    return enterpriseError(e);
  }
}
export async function PATCH(req: NextRequest) {
  const token = req.headers.get("authorization");
  try {
    const user = await enterpriseUser(token);
    if (!user) return json({ error: "Sign in first." }, 401);
    const access = await enterpriseAccess(user.id, token);
    if (!access.allowed)
      return json({ error: "Enterprise access is by invitation only." }, 403);
    const body = await req.json().catch(() => null);
    if (
      !body ||
      typeof body.organizationId !== "string" ||
      !["draft", "published", "paused", "closed"].includes(body.status)
    )
      return json({ error: "Invalid job action." }, 400);
    const member = await employerMembership(user.id, body.organizationId);
    if (member.error) throw member.error;
    if (
      !member.data ||
      !["owner", "admin", "recruiter"].includes(member.data.role)
    )
      return json({ error: "Job management access is required." }, 403);
    let job;
    try {
      job = validateJob(body.job);
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : "Check job fields." },
        400,
      );
    }
    if (
      body.status === "published" &&
      job.deadline &&
      job.deadline <
        new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
    )
      return json(
        { error: "Choose a future deadline before publishing." },
        400,
      );
    const result = await supabaseAdmin.rpc("save_enterprise_job", {
      p_user: user.id,
      p_org: body.organizationId,
      p_job: body.id || null,
      p_data: job,
      p_status: body.status,
      p_version: body.version ?? 0,
    });
    if (result.error)
      return json(
        {
          error:
            result.error.code === "42501"
              ? "Only verified companies can publish jobs."
              : result.error.code === "40001"
                ? "This job changed. Refresh before saving."
                : "Unable to save the job.",
        },
        result.error.code === "42501"
          ? 403
          : result.error.code === "40001"
            ? 409
            : 503,
      );
    return json({ job: result.data });
  } catch (e) {
    return enterpriseError(e);
  }
}

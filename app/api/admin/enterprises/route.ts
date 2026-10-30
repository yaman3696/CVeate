import { NextRequest } from "next/server";
import { employeeOwner } from "@/lib/admin-employees";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  enterpriseError,
  privateHeaders as headers,
} from "@/lib/enterprise-server";
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization");
  try {
    const access = await employeeOwner(token);
    if (access.error) return access.error;
    const page = Number(req.nextUrl.searchParams.get("page") || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
      return Response.json(
        { error: "Invalid page." },
        { status: 400, headers },
      );
    const { data, error, count } = await supabaseAdmin
      .from("organizations")
      .select("id,name,website,status,owner_id,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * 25, page * 25 - 1);
    if (error) throw error;
    const grants = await supabaseAdmin.rpc("admin_list_enterprise_access", {
      p_actor: access.admin!.id,
    });
    return Response.json(
      {
        organizations: data,
        total: count || 0,
        accessGrants: grants.error ? [] : grants.data,
        accessSetupRequired: !!grants.error,
      },
      { headers },
    );
  } catch (e) {
    return enterpriseError(e);
  }
}
export async function PATCH(req: NextRequest) {
  const token = req.headers.get("authorization");
  try {
    const access = await employeeOwner(token);
    if (access.error) return access.error;
    const body = await req.json().catch(() => null);
    if (
      !body ||
      typeof body.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.id) ||
      !["verified", "pending_verification", "suspended"].includes(body.status)
    )
      return Response.json(
        { error: "Invalid verification action." },
        { status: 400, headers },
      );
    const { error } = await supabaseAdmin.rpc("verify_enterprise_workspace", {
      p_actor: access.admin!.id,
      p_org: body.id,
      p_status: body.status,
    });
    if (error) throw error;
    return Response.json({ success: true }, { headers });
  } catch (e) {
    return enterpriseError(e);
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization");
  try {
    const access = await employeeOwner(token);
    if (access.error) return access.error;
    const body = await req.json().catch(() => null);
    if (
      !body ||
      typeof body.email !== "string" ||
      body.email.length > 254 ||
      typeof body.enabled !== "boolean"
    )
      return Response.json(
        { error: "Enter an existing company user email and an access action." },
        { status: 400, headers },
      );
    const { data, error } = await supabaseAdmin.rpc(
      "admin_set_enterprise_access",
      {
        p_actor: access.admin!.id,
        p_email: body.email.trim(),
        p_enabled: body.enabled,
      },
    );
    if (error)
      return Response.json(
        {
          error:
            error.code === "22023"
              ? "Use an existing verified company account. Administrators already have access."
              : error.code === "42501"
                ? "Owner access is required."
                : "Enterprise invitation setup is required.",
        },
        {
          status:
            error.code === "22023" ? 400 : error.code === "42501" ? 403 : 503,
          headers,
        },
      );
    return Response.json({ access: data }, { headers });
  } catch (e) {
    return enterpriseError(e);
  }
}

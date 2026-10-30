import { geminiRateSnapshot, priceLegacyAts } from "@/lib/ai-usage-pricing";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin-permissions";
import { requireAdmin } from "@/lib/require-admin";
import { requireAdminMfa } from "@/lib/require-admin-mfa";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  const admin = await requireAdmin(authorization);

  if (!admin) {
    return NextResponse.json(
      { error: "ACCESS_DENIED" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const mfaVerified = await requireAdminMfa(authorization);

  if (!mfaVerified) {
    return NextResponse.json(
      { error: "MFA_REQUIRED" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const permissionDenied = await checkAdminPermission(
      admin.id,
      "overview.read",
    );
    if (permissionDenied) return permissionDenied;

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [
      usersResult,
      newUsersResult,
      purchasesResult,
      aiUsageResult,
      interviewCostResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true }),

      supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),

      supabaseAdmin
        .from("cveate_credit_purchases")
        .select("amount_paise")
        .eq("status", "completed")
        .eq("currency", "INR"),

      supabaseAdmin
        .from("cveate_ai_usage")
        .select("feature,model,input_tokens,output_tokens,thinking_tokens,estimated_cost_inr")
        .eq("status", "generated"),
      supabaseAdmin.rpc("interview_cost_lifetime"),
    ]);

    if (
      usersResult.error ||
      newUsersResult.error ||
      purchasesResult.error ||
      aiUsageResult.error
    ) {
      throw new Error("Unable to retrieve dashboard metrics");
    }

    const revenuePaise = (purchasesResult.data ?? []).reduce(
      (total, purchase) => total + (purchase.amount_paise ?? 0),
      0,
    );

    const pricedUsage = priceLegacyAts(aiUsageResult.data ?? [], await geminiRateSnapshot("gemini-3.1-flash-lite"));
    const aiCost =
      Number(interviewCostResult.data?.knownCostInr || 0) +
      pricedUsage.reduce(
        (total, usage) => total + Number(usage.estimated_cost_inr ?? 0),
        0,
      );

    // Retrieve dated records for monthly analytics
    const [registrationsResult, revenueTrendsResult] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: true }),

      supabaseAdmin
        .from("cveate_credit_purchases")
        .select("created_at, amount_paise")
        .eq("status", "completed")
        .eq("currency", "INR")
        .order("created_at", { ascending: true }),
    ]);

    if (registrationsResult.error || revenueTrendsResult.error) {
      throw new Error("Unable to retrieve chart data");
    }

    const monthlyData = new Map<
      string,
      { month: string; users: number; revenue: number }
    >();

    const getMonth = (date: string) => new Date(date).toISOString().slice(0, 7);

    for (const user of registrationsResult.data ?? []) {
      if (!user.created_at) continue;

      const month = getMonth(user.created_at);

      if (!monthlyData.has(month)) {
        monthlyData.set(month, { month, users: 0, revenue: 0 });
      }

      monthlyData.get(month)!.users += 1;
    }

    for (const purchase of revenueTrendsResult.data ?? []) {
      if (!purchase.created_at) continue;

      const month = getMonth(purchase.created_at);

      if (!monthlyData.has(month)) {
        monthlyData.set(month, { month, users: 0, revenue: 0 });
      }

      monthlyData.get(month)!.revenue += (purchase.amount_paise ?? 0) / 100;
    }

    const trends = Array.from(monthlyData.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    return NextResponse.json(
      {
        totalUsers: usersResult.count ?? 0,
        newUsers7d: newUsersResult.count ?? 0,
        revenueINR: revenuePaise / 100,
        aiCostINR: aiCost,
        aiCostIncomplete:
          !!interviewCostResult.error ||
          Number(interviewCostResult.data?.unknownAttempts || 0) > 0 ||
          pricedUsage.some(
            (row) => row.estimated_cost_inr === null || row.cost_estimate_basis === "legacy_interview_range",
          ),
        trends,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Admin overview error:", error);

    return NextResponse.json(
      { error: "OVERVIEW_UNAVAILABLE" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

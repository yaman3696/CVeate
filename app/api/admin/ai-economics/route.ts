import { geminiRateSnapshot, priceLegacyAts } from "@/lib/ai-usage-pricing";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin-permissions";
import { requireAdmin } from "@/lib/require-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminMfa } from "@/lib/require-admin-mfa";

export async function GET(request: NextRequest) {
  // Keep request-specific access outside try for Next.js 16.
  const authorizationHeader = request.headers.get("authorization");

  try {
    const admin = await requireAdmin(authorizationHeader);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const mfaVerified = await requireAdminMfa(authorizationHeader);

    if (!mfaVerified) {
      return NextResponse.json(
        { error: "MFA_REQUIRED" },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const permissionDenied = await checkAdminPermission(
      admin.id,
      "ai_economics.read",
    );
    if (permissionDenied) return permissionDenied;

    const interviewDays = Number(
      request.nextUrl.searchParams.get("interviewDays") || 30,
    );
    if (![7, 30, 90, 365].includes(interviewDays))
      return NextResponse.json(
        { error: "Choose a valid interview reporting period." },
        { status: 400 },
      );
    const until = new Date(),
      since = new Date(until.getTime() - interviewDays * 86400000);
    const interviewResult = await supabaseAdmin.rpc("interview_cost_report", {
      p_since: since.toISOString(),
      p_until: until.toISOString(),
    });
    const interviewCosts = interviewResult.error ? null : interviewResult.data;
    const [usageResult, purchasesResult, grantsResult, transactionsResult] =
      await Promise.all([
        supabaseAdmin
          .from("cveate_ai_usage")
          .select(
            "id, feature, model, input_tokens, output_tokens, thinking_tokens, estimated_cost_inr, status, transaction_id, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(10000),

        supabaseAdmin
          .from("cveate_credit_purchases")
          .select("amount_paise, credits, status").eq("currency", "INR"),

        supabaseAdmin
          .from("cveate_credit_grants")
          .select("grant_type, original_credits, remaining_credits"),

        supabaseAdmin
          .from("career_credit_transactions")
          .select("id, status")
          .limit(10000),
      ]);

    if (usageResult.error) throw usageResult.error;
    if (purchasesResult.error) throw purchasesResult.error;
    if (grantsResult.error) throw grantsResult.error;
    if (transactionsResult.error) {
      throw transactionsResult.error;
    }

    const originalUsage = usageResult.data ?? [];
    const usage = priceLegacyAts(originalUsage, await geminiRateSnapshot("gemini-3.1-flash-lite"));
    const historicalInterviewRanges = usage.filter(row => row.cost_estimate_basis === "legacy_interview_range").length;
    const historicalAtsEstimates = usage.filter((row,i) => row.feature === "ats_checker" && originalUsage[i].estimated_cost_inr === null && row.estimated_cost_inr !== null).length;
    const purchases = purchasesResult.data ?? [];
    const grants = grantsResult.data ?? [];
    const transactions = transactionsResult.data ?? [];

    const estimatedAiCostInr =
      Number(interviewCosts?.lifetime?.knownCostInr || 0) +
      usage.reduce((sum, row) => sum + Number(row.estimated_cost_inr ?? 0), 0);

    const totalInputTokens =
      Number(interviewCosts?.lifetime?.inputTokens || 0) +
      usage.reduce((sum, row) => sum + Number(row.input_tokens ?? 0), 0);

    const totalOutputTokens =
      Number(interviewCosts?.lifetime?.outputTokens || 0) +
      usage.reduce(
        (sum, row) =>
          sum +
          Number(row.output_tokens ?? 0) +
          Number(row.thinking_tokens ?? 0),
        0,
      );

    const completedPurchases = purchases.filter(
      (row) => row.status === "completed",
    );

    const revenueInr = completedPurchases.reduce(
      (sum, row) => sum + Number(row.amount_paise ?? 0) / 100,
      0,
    );

    const outstandingCredits = grants.reduce(
      (sum, row) => sum + Number(row.remaining_credits ?? 0),
      0,
    );

    const freeCreditsIssued = grants
      .filter((row) => row.grant_type === "trial")
      .reduce((sum, row) => sum + Number(row.original_credits ?? 0), 0);

    const estimatedContributionInr = revenueInr - estimatedAiCostInr;

    const contributionMarginPercent =
      revenueInr > 0 ? (estimatedContributionInr / revenueInr) * 100 : null;

    // Preserve the existing feature summary.
    const featureMap: Record<
      string,
      {
        feature: string;
        requests: number;
        inputTokens: number;
        outputTokens: number;
        estimatedCostInr: number;
      }
    > = {};

    for (const row of usage) {
      const feature = row.feature || "unknown";

      if (!featureMap[feature]) {
        featureMap[feature] = {
          feature,
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostInr: 0,
        };
      }

      featureMap[feature].requests += 1;

      featureMap[feature].inputTokens += Number(row.input_tokens ?? 0);

      featureMap[feature].outputTokens +=
        Number(row.output_tokens ?? 0) + Number(row.thinking_tokens ?? 0);

      featureMap[feature].estimatedCostInr += Number(
        row.estimated_cost_inr ?? 0,
      );
    }

    for (const stage of interviewCosts?.lifetimeStages || []) {
      const key = `interview_${stage.stage}`;
      const previous = featureMap[key] || {
        feature: key,
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostInr: 0,
      };
      featureMap[key] = {
        feature: key,
        requests: previous.requests + Number(stage.requests),
        inputTokens: previous.inputTokens + Number(stage.input_tokens),
        outputTokens: previous.outputTokens + Number(stage.output_tokens),
        estimatedCostInr: previous.estimatedCostInr + Number(stage.known_cost),
      };
    }

    // Map ATS credit transaction IDs to their final status.
    const transactionStatusMap = new Map(
      transactions.map((row) => [row.id, row.status]),
    );

    const completedTransactions = transactions.filter(
      (row) => row.status === "completed",
    );

    const refundedTransactions = transactions.filter(
      (row) => row.status === "refunded",
    );

    const completedIds = new Set(completedTransactions.map((row) => row.id));

    const refundedIds = new Set(refundedTransactions.map((row) => row.id));

    const atsUsage = usage.filter((row) => row.feature === "ats_checker");

    const completedAtsUsage = atsUsage.filter(
      (row) => row.transaction_id && completedIds.has(row.transaction_id),
    );

    const refundedAtsUsage = atsUsage.filter(
      (row) => row.transaction_id && refundedIds.has(row.transaction_id),
    );

    const completedAiCostInr = completedAtsUsage.reduce(
      (sum, row) => sum + Number(row.estimated_cost_inr ?? 0),
      0,
    );

    const refundedAiCostInr = refundedAtsUsage.reduce(
      (sum, row) => sum + Number(row.estimated_cost_inr ?? 0),
      0,
    );

    const linkedCompletedTransactionCount = new Set(
      completedAtsUsage.map((row) => row.transaction_id),
    ).size;

    const linkedRefundedTransactionCount = new Set(
      refundedAtsUsage.map((row) => row.transaction_id),
    ).size;

    const totalRecordedAtsAiCostInr = atsUsage.reduce(
      (sum, row) => sum + Number(row.estimated_cost_inr ?? 0),
      0,
    );

    const averageCostPerLinkedCompletedReportInr =
      linkedCompletedTransactionCount > 0
        ? completedAiCostInr / linkedCompletedTransactionCount
        : null;

    // Preserve recentUsage, but show final ATS credit
    // status when a matching transaction exists.
    const recentUsage = usage.slice(0, 20).map((row) => {
      const transactionStatus =
        row.feature === "ats_checker" && row.transaction_id
          ? transactionStatusMap.get(row.transaction_id)
          : undefined;

      return {
        ...row,
        generation_status: row.status,
        status: transactionStatus ?? row.status,
        transaction_status: transactionStatus ?? null,
      };
    });

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        interviewCosts,
        interviewCostSetupRequired: !!interviewResult.error,
        unpricedLegacyOnlyRequests: usage.filter(
          (row) => row.estimated_cost_inr === null,
        ).length,
        unpricedInterviewAttempts: Number(
          interviewCosts?.lifetime?.unknownAttempts || 0,
        ),
        unpricedLegacyRequests:
          usage.filter((row) => row.estimated_cost_inr === null).length +
          Number(interviewCosts?.lifetime?.unknownAttempts || 0),

        summary: {
          totalRequests:
            usage.length + Number(interviewCosts?.lifetime?.attempts || 0),
          totalInputTokens,
          totalOutputTokens,
          estimatedAiCostInr,
          interviewCostInr: Number(interviewCosts?.lifetime?.knownCostInr || 0) + usage.filter(row => row.feature?.startsWith("interview_")).reduce((sum,row)=>sum+Number(row.estimated_cost_inr??0),0),
          otherAiCostInr: usage.filter(row => !row.feature?.startsWith("interview_")).reduce((sum,row)=>sum+Number(row.estimated_cost_inr??0),0),
          revenueInr,
          estimatedContributionInr,
          contributionMarginPercent,
          outstandingCredits,
          freeCreditsIssued,
        },

        features: Object.values(featureMap),

        atsRefundTracking: {
          completedTransactions: completedTransactions.length,

          refundedTransactions: refundedTransactions.length,

          completedAiUsageRecords: completedAtsUsage.length,

          refundedAiUsageRecords: refundedAtsUsage.length,

          linkedCompletedTransactions: linkedCompletedTransactionCount,

          linkedRefundedTransactions: linkedRefundedTransactionCount,

          completedAiCostInr,
          refundedAiCostInr,

          totalRecordedAtsAiCostInr,

          averageCostPerLinkedCompletedReportInr,
        },

        recentUsage,

        warnings: [
          ...(historicalInterviewRanges ? [`${historicalInterviewRanges} older interview calls lack modality/cache detail. Their displayed ranges use current configured rates; planning totals use the upper end, not a claimed invoice charge.`] : []),
          ...(historicalAtsEstimates ? [`${historicalAtsEstimates} historical ATS calls use current configured 3.1 Flash-Lite rates and no cache discount; these are planning estimates, not invoices.`] : []),
          "AI costs are modeled paid-tier estimates, not actual provider invoices.",
          "The financial summary combines lifetime interview costs and the legacy ledger, capped at 10,000 legacy entries. The interview section uses the selected start-date cohort.",
          "Interview provider estimates exclude free credits, tax and negotiated discounts; the USD/INR rate is a configurable planning assumption, not a live FX quote.",
          "Unknown or interrupted interview attempts have unknown cost, not zero. Complete-cost averages exclude these sessions.",
          ...(interviewResult.error
            ? [
                "Interview costing setup is unavailable. Apply the interview cost tracking SQL update.",
              ]
            : []),
          ...(usage.some((row) => row.estimated_cost_inr === null) ||
          Number(interviewCosts?.lifetime?.unknownAttempts || 0) > 0
            ? [
                "Some usage entries have no cost estimate. Totals and contribution are incomplete.",
              ]
            : []),
          "Contribution excludes hosting, payment fees, taxes, and other expenses.",
          "Usage and transaction metrics are limited to 10,000 records each.",
          "Purchase revenue assumes successful purchases use status completed.",
          "Outstanding credits are credit units, not a monetary liability.",
          "ATS credit transaction counts can differ from recorded Gemini usage counts.",
          "Average ATS cost includes recorded refund overhead and uses linked completed transactions as its denominator.",
        ],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "digest" in error &&
      error.digest === "NEXT_PRERENDER_INTERRUPTED"
    ) {
      throw error;
    }

    console.error("AI Economics API error:", error);

    return NextResponse.json(
      { error: "Failed to load AI economics data" },
      { status: 500 },
    );
  }
}

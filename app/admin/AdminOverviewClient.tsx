"use client";

import LiveVisitorCounts from '@/components/admin/LiveVisitorCounts';
import { getAdminMfaHref } from "@/lib/admin-navigation";

import ExportExcelButton from "@/components/admin/ExportExcelButton";
import type { ExcelSheet } from "@/lib/exports/excel";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type OverviewMetrics = {
  totalUsers: number;
  newUsers7d: number;
  revenueINR: number;
  aiCostIncomplete?: boolean;
  aiCostINR: number;
  trends: {
    month: string;
    users: number;
    revenue: number;
  }[];
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [metricsError, setMetricsError] = useState(false);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/");
          return;
        }

        const headers = {
          Authorization: `Bearer ${session.access_token}`,
        };

        const response = await fetch("/api/admin/access", {
          headers,
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/");
          return;
        }

        const access = await response.json();

        if (!access.authorized) {
          router.replace("/");
          return;
        }

        if (!access.mfaVerified) {
          router.replace(
            getAdminMfaHref(
              window.location.pathname +
                window.location.search +
                window.location.hash,
            ),
          );
          return;
        }

        if (!active) return;
        setAuthorized(true);

        const overviewResponse = await fetch("/api/admin/overview", {
          headers,
          cache: "no-store",
        });

        if (!active) return;

        if (!overviewResponse.ok) {
          if (overviewResponse.status === 403) {
            const errorData = await overviewResponse.json().catch(() => ({}));

            if (errorData.error === "MFA_REQUIRED") {
              router.replace(
                getAdminMfaHref(
                  window.location.pathname +
                    window.location.search +
                    window.location.hash,
                ),
              );
            } else {
              router.replace("/");
            }
            return;
          }

          setMetricsError(true);
          return;
        }

        const overviewData: OverviewMetrics = await overviewResponse.json();

        if (active) {
          setMetrics(overviewData);
        }
      } catch (error) {
        console.error("Admin dashboard error:", error);

        if (active) {
          setMetricsError(true);
        }
      }
    };

    checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  const getOverviewExcelSheets = (): ExcelSheet[] => {
    if (!metrics) {
      throw new Error("Dashboard metrics are not available");
    }

    return [
      {
        name: "Overview",
        headers: ["Metric", "Value"],
        rows: [
          ["Total Users", metrics.totalUsers],
          ["New Users (7 Days)", metrics.newUsers7d],
          ["Completed Revenue (INR)", metrics.revenueINR],
          ["AI Usage Cost (INR)", metrics.aiCostINR],
        ],
      },
      {
        name: "User Growth",
        headers: ["Month", "Registrations"],
        rows: (metrics.trends ?? []).map((row) => [row.month, row.users]),
      },
      {
        name: "Revenue Trends",
        headers: ["Month", "Revenue (INR)"],
        rows: (metrics.trends ?? []).map((row) => [row.month, row.revenue]),
      },
    ];
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Verifying admin access...
      </div>
    );
  }

  const formatINR = (amount: number) =>
    `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const cards = metrics
    ? [
        {
          label: "Total Users",
          value: metrics.totalUsers.toLocaleString("en-IN"),
          description: "Registered users",
        },
        {
          label: "New Users (7 Days)",
          value: metrics.newUsers7d.toLocaleString("en-IN"),
          description: "Registrations in the last 7 days",
        },
        {
          label: "Completed Revenue",
          value: formatINR(metrics.revenueINR),
          description: "Completed credit purchases",
        },
        {
          label: "AI Usage Cost",
          value: formatINR(metrics.aiCostINR),
          description: metrics.aiCostIncomplete
            ? "Known estimates only; some costs are missing. See AI Economics."
            : "Paid-tier estimates including tracked interviews",
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-slate-900">
            CVeat Admin
          </h1>

          <Link
            href="/"
            aria-label="Go to homepage"
            title="Go to homepage"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m3 10 9-7 9 7" />
              <path d="M5 9v12h14V9" />
              <path d="M9 21v-7h6v7" />
            </svg>
          </Link>
        </div>

        <p className="mt-2 text-slate-600">
          Manage users, enterprises, revenue and platform operations.
        </p>

        <LiveVisitorCounts />

        {/* Live Overview Metrics */}
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Platform Overview
            </h2>

            <ExportExcelButton
              sheets={async () => getOverviewExcelSheets()}
              fileName={`CVeat_Overview_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`}
              disabled={!metrics}
            />
          </div>

          {metricsError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Unable to load dashboard metrics. Please refresh the page.
            </div>
          )}

          {!metrics && !metricsError && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading live dashboard metrics...
            </div>
          )}

          {metrics && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {card.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* User Growth and Revenue Charts */}
        {metrics && (
          <section className="mt-10">
            <h2 className="mb-5 text-xl font-bold text-slate-900">
              Platform Analytics
            </h2>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* User Growth */}
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  User Growth
                </h3>

                <p className="mb-6 mt-1 text-sm text-slate-500">
                  Monthly new registrations
                </p>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.trends ?? []}>
                      <defs>
                        <linearGradient
                          id="userGrowthGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#6366f1"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#6366f1"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" vertical={false} />

                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Area
                        type="monotone"
                        dataKey="users"
                        name="Registrations"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fill="url(#userGrowthGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue Trends */}
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  Revenue Trends
                </h3>

                <p className="mb-6 mt-1 text-sm text-slate-500">
                  Monthly completed purchase revenue
                </p>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.trends ?? []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />

                      <XAxis dataKey="month" />

                      <YAxis tickFormatter={(value) => `₹${value}`} />

                      <Tooltip
                        formatter={(value) =>
                          `₹${Number(value ?? 0).toFixed(2)}`
                        }
                      />

                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="#6366f1"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={55}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Existing Admin Pages */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Management</h2>

          <div className="grid gap-5 md:grid-cols-2">
            <Link
              href="/admin/ai-economics"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-400"
            >
              <h3 className="text-lg font-bold text-slate-900">AI Economics</h3>
              <p className="mt-2 text-sm text-slate-600">
                View AI usage, costs and financial analytics.
              </p>
            </Link>

            <Link
              href="/admin/blog"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-400"
            >
              <h3 className="text-lg font-bold text-slate-900">
                Blog Management
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Create and manage CVeat articles.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

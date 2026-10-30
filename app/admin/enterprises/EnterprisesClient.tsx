"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAdminMfaHref } from "@/lib/admin-navigation";
import type { Organization } from "@/lib/enterprise";
export default function EnterprisesClient() {
  const router = useRouter(),
    lock = useRef(false);
  const [rows, setRows] = useState<Organization[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [accessEmail, setAccessEmail] = useState(""),
    [grants, setGrants] = useState<
      { user_id: string; email: string; full_name: string; enabled: boolean }[]
    >([]),
    [setupRequired, setSetupRequired] = useState(false);
  const api = useCallback(
    async (options: RequestInit = {}) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        throw Error("Sign in first.");
      }
      const r = await fetch(`/api/admin/enterprises?page=${page}`, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }),
        d = await r.json();
      if (r.status === 403) {
        router.replace(
          d.error === "MFA_REQUIRED"
            ? getAdminMfaHref("/admin/enterprises")
            : "/admin/denied",
        );
        throw Error("Owner access required.");
      }
      if (!r.ok) throw Error(d.error || "Unable to load companies.");
      return d;
    },
    [page, router],
  );
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      await api()
        .then((d) => {
          if (active) {
            setRows(d.organizations);
            setTotal(d.total);
            setGrants(d.accessGrants || []);
            setSetupRequired(!!d.accessSetupRequired);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    void load();
    return () => {
      active = false;
    };
  }, [api, refresh]);
  async function change(org: Organization, status: string) {
    if (
      lock.current ||
      !window.confirm(
        `${status === "verified" ? "Approve this company after reviewing its identity and website" : status === "suspended" ? "Suspend this company and pause published jobs" : "Return this company to verification and pause published jobs"}: ${org.name}?`,
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: org.id, status }),
      });
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update company.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function grantAccess(email: string, enabled: boolean) {
    if (lock.current) return;
    if (
      !enabled &&
      !window.confirm(`Remove Enterprise workspace access for ${email}?`)
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, enabled }),
      });
      setAccessEmail("");
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to change access.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      <h1 className="text-3xl font-extrabold">
        Enterprise access & verification
      </h1>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]">
        <h2 className="text-xl font-bold">Invite-only company access</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Only company accounts you enable here can open Enterprise. The person
          must already have a verified CVeat account. Enabling access does not
          give administrator access or approve public job publishing.
        </p>
        {setupRequired ? (
          <p
            role="alert"
            className="text-sm text-amber-600 dark:text-amber-300"
          >
            Run the Enterprise invitation SQL update to enable these controls.
            Ordinary users are blocked until access is configured.
          </p>
        ) : (
          <>
            <form
              className="flex flex-wrap gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void grantAccess(accessEmail, true);
              }}
            >
              <input
                aria-label="Company account email"
                type="email"
                required
                maxLength={254}
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
                placeholder="person@company.com"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-transparent px-4 py-2 text-sm dark:border-slate-700"
              />
              <button
                disabled={busy || loading}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                Enable Enterprise
              </button>
            </form>
            <p className="text-xs text-slate-500">
              Showing the 100 most recently updated access records. Use the
              email form to re-enable any account.
            </p>
            {grants.map((g) => (
              <div
                key={g.user_id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-700"
              >
                <div>
                  <p className="font-semibold">{g.full_name || g.email}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {g.email} · {g.enabled ? "Enabled" : "Access removed"}
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={() => void grantAccess(g.email, !g.enabled)}
                  className="rounded-xl border px-3 py-2 text-xs dark:border-slate-700"
                >
                  {g.enabled ? "Remove access" : "Enable access"}
                </button>
              </div>
            ))}
          </>
        )}
      </section>
      <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        Review each organisation’s identity before approving it. Website
        ownership alone is not proof of a legitimate employer. Approval permits
        public job listings; suspension pauses those listings. All changes are
        recorded in Enterprise events.
      </p>
      {error && (
        <p role="alert" className="text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
      <button
        disabled={busy || loading}
        onClick={() => setRefresh((n) => n + 1)}
        className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700"
      >
        Refresh
      </button>
      {loading ? (
        <p>Loading companies…</p>
      ) : rows.length === 0 ? (
        <p>No companies have registered yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((o) => (
            <article
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]"
            >
              <div>
                <h2 className="font-bold">{o.name}</h2>
                <a
                  href={o.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-sm text-indigo-600 dark:text-indigo-300"
                >
                  {o.website}
                </a>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {o.status} ·{" "}
                  {new Date(o.created_at).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["verified", "pending_verification", "suspended"].map((s) => (
                  <button
                    key={s}
                    disabled={busy || s === o.status}
                    onClick={() => void change(o, s)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40 dark:border-slate-700"
                  >
                    {s === "verified"
                      ? "Approve"
                      : s === "suspended"
                        ? "Suspend"
                        : "Pending review"}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 text-sm">
        <button
          disabled={page === 1 || busy}
          onClick={() => setPage((n) => n - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} · {total} companies
        </span>
        <button
          disabled={page * 25 >= total || busy}
          onClick={() => setPage((n) => n + 1)}
        >
          Next
        </button>
      </div>
    </main>
  );
}

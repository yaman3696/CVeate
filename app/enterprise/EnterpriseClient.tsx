"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  BriefcaseBusiness,
  Users,
  MessageSquare,
  CalendarDays,
  FileCheck2,
  ChartNoAxesCombined,
  ArrowUpRight,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  INDIAN_STATES,
  SENIORITIES,
  WORK_MODES,
  EMPLOYMENT_TYPES,
  type Organization,
  type Job,
} from "@/lib/enterprise";
const input =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-[#111C30] dark:text-slate-100";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800";
const blank = {
  title: "",
  description: "",
  state: "Delhi",
  city: "",
  seniority: "Entry level",
  work_mode: "On-site",
  employment_type: "Full-time",
  salary_min: "",
  salary_max: "",
  experience_min: "0",
  skills: "",
  deadline: "",
};
type Draft = typeof blank;
type Org = Organization & { role: string };
const modules = [
  {
    title: "Jobs",
    icon: BriefcaseBusiness,
    copy: "Draft roles and publish verified company listings.",
    live: true,
  },
  {
    title: "Applicants",
    icon: Users,
    copy: "Review applications and move candidates through stages.",
  },
  {
    title: "AI interviews",
    icon: MessageSquare,
    copy: "Configure structured questions and evidence rubrics.",
  },
  {
    title: "Scheduling",
    icon: CalendarDays,
    copy: "Coordinate human interview rounds.",
  },
  {
    title: "Offers",
    icon: FileCheck2,
    copy: "Prepare offers and track hiring outcomes.",
  },
  {
    title: "Hiring insights",
    icon: ChartNoAxesCombined,
    copy: "Understand your recruitment funnel.",
  },
];
export default function EnterpriseClient() {
  const [userId, setUserId] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [orgs, setOrgs] = useState<Org[]>([]),
    [org, setOrg] = useState<Org | null>(null),
    [jobs, setJobs] = useState<Job[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );
  const [name, setName] = useState(""),
    [website, setWebsite] = useState(""),
    [form, setForm] = useState<Draft>(blank),
    [editing, setEditing] = useState<Job | null>(null),
    [editor, setEditor] = useState(false);
  const busyRef = useRef(false),
    sequence = useRef(0);
  const api = useCallback(
    async (options: RequestInit = {}, organizationId?: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw Error("Please sign in again.");
      const response = await fetch(
        `/api/enterprise${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ""}`,
        {
          ...options,
          cache: "no-store",
          headers: {
            ...options.headers,
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );
      const result = await response.json();
      if (response.status === 403) {
        setAccess("denied");
        throw Error("Enterprise access is by invitation only.");
      }
      if (!response.ok)
        throw Error(result.error || "Unable to open workspace.");
      setAccess("allowed");
      return result;
    },
    [],
  );
  const load = useCallback(
    async (id?: string) => {
      const n = ++sequence.current;
      setLoading(true);
      setError("");
      try {
        const data = await api({}, id);
        if (n !== sequence.current) return;
        setOrgs(data.organizations);
        setOrg(data.organization || null);
        setJobs(data.jobs || []);
      } catch (e) {
        if (n === sequence.current)
          setError(
            e instanceof Error ? e.message : "Unable to open workspace.",
          );
      } finally {
        if (n === sequence.current) setLoading(false);
      }
    },
    [api],
  );
  useEffect(() => {
    let active = true;
    let previous: string | null | undefined;
    const requests = sequence;
    const sync = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      const next = session?.user.id || null;
      if (previous === next) return;
      previous = next;
      requests.current++;
      setAccess("checking");
      setUserId(next);
      setOrg(null);
      setOrgs([]);
      setJobs([]);
      if (session) void load();
      else {
        setOrg(null);
        setOrgs([]);
        setJobs([]);
        setAccess("denied");
        setLoading(false);
      }
    };
    void sync();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        if (active) void sync();
      }, 0);
    });
    return () => {
      active = false;
      requests.current++;
      subscription.unsubscribe();
    };
  }, [load]);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await api({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, website }),
      });
      setMessage(
        "Company workspace created. CVeat will review the company before public job publishing.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create company.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function edit(job: Job | null) {
    setEditing(job);
    setForm(
      job
        ? {
            title: job.title,
            description: job.description,
            state: job.state,
            city: job.city,
            seniority: job.seniority,
            work_mode: job.work_mode,
            employment_type: job.employment_type,
            salary_min: job.salary_min === null ? "" : String(job.salary_min),
            salary_max: job.salary_max === null ? "" : String(job.salary_max),
            experience_min: String(job.experience_min),
            skills: job.skills.join(", "),
            deadline: job.deadline || "",
          }
        : blank,
    );
    setEditor(true);
    setError("");
    requestAnimationFrame(() =>
      document
        .getElementById("job-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  async function save(status: string) {
    if (!org || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: org.id,
          id: editing?.id || null,
          version: editing?.version || 0,
          status,
          job: {
            ...form,
            salary_min: form.salary_min === "" ? null : Number(form.salary_min),
            salary_max: form.salary_max === "" ? null : Number(form.salary_max),
            experience_min: Number(form.experience_min),
            skills: form.skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            deadline: form.deadline || null,
          },
        }),
      });
      setMessage(
        `Job ${status === "published" ? "published" : status === "draft" ? "saved as draft" : status}.`,
      );
      setEditor(false);
      setEditing(null);
      await load(org.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save job.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const canEdit = !!org && ["owner", "admin", "recruiter"].includes(org.role);
  if (access !== "allowed")
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-24 text-center text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
        <h1 className="text-3xl font-bold">
          {access === "checking"
            ? "Checking workspace access…"
            : "Enterprise is invitation-only"}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm text-slate-500 dark:text-slate-400">
          {access === "checking"
            ? error || "Please wait while we verify your access."
            : "This workspace is available to company accounts approved by CVeat. Sign in with your approved account to continue."}
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/jobs" className={button}>
            Browse jobs
          </Link>
          {!userId && (
            <button
              className={button}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("open-auth-modal", { detail: "signin" }),
                )
              }
            >
              Sign in
            </button>
          )}
          <button className={button} onClick={() => void load()}>
            Check access again
          </button>
        </div>
      </main>
    );
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6 rounded-3xl bg-indigo-950 p-5 text-indigo-100 lg:sticky lg:top-28 lg:h-fit">
          <Link
            href="/enterprise"
            className="flex items-center gap-2 text-lg font-black text-white"
          >
            <Building2 size={22} />
            CVeat Enterprise
          </Link>
          <div className="space-y-1">
            <a
              href="#workspace"
              className="block rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold text-white"
            >
              Workspace overview
            </a>
            <a
              href="#company-jobs"
              className="block rounded-xl px-3 py-2.5 text-sm hover:bg-white/10"
            >
              Job management
            </a>
            <Link
              href="/jobs"
              className="block rounded-xl px-3 py-2.5 text-sm hover:bg-white/10"
            >
              Public job board ↗
            </Link>
            <Link
              href="/interview-prep"
              className="block rounded-xl px-3 py-2.5 text-sm hover:bg-white/10"
            >
              Try the AI practice host ↗
            </Link>
          </div>
          <div className="border-t border-white/10 pt-4 text-xs leading-5 text-indigo-200">
            Your hiring workspace starts here. Applications, employer interviews
            and offers will be added in the next milestones.
          </div>
        </aside>
        <div id="workspace" className="space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600 dark:text-indigo-300">
                A clearer way to hire
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {org
                  ? `Welcome to ${org.name}.`
                  : "Your team. Your next great hire."}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                One place to organise roles, build a candidate pipeline and
                bring evidence into your hiring conversations.
              </p>
            </div>
            <Link href="/jobs" className={button}>
              Explore job board <ArrowUpRight size={16} />
            </Link>
          </header>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
            >
              {error}
              <button
                onClick={() => void load(org?.id)}
                className="ml-3 underline"
              >
                Retry
              </button>
            </p>
          )}
          {message && (
            <p
              role="status"
              className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
            >
              {message}
            </p>
          )}
          {loading ? (
            <p className="py-6 text-sm text-slate-500">
              Opening your workspace…
            </p>
          ) : !userId ? (
            <section className="rounded-3xl border border-indigo-100 bg-white p-7 dark:border-slate-700 dark:bg-[#1B263B]">
              <Building2 size={28} className="text-indigo-500" />
              <h2 className="mt-4 text-2xl font-bold">
                A workspace built around your company.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                Sign in to create a company profile, draft your first role and
                submit your organisation for verification.
              </p>
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("open-auth-modal", { detail: "signin" }),
                  )
                }
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
              >
                Sign in to start
              </button>
            </section>
          ) : !org && !error ? (
            <form
              onSubmit={create}
              className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1B263B]"
            >
              <h2 className="text-xl font-bold">
                Create your company workspace
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Use your company’s actual name and website. Your account becomes
                its workspace owner. Verification is reviewed by CVeat before
                jobs can be published.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold">
                  Company name
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    className={input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold">
                  Company website
                  <input
                    required
                    type="url"
                    maxLength={300}
                    placeholder="https://company.com"
                    className={input}
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>
              <button
                disabled={busy}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create workspace"}
              </button>
            </form>
          ) : (
            org && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#1B263B]">
                  <div className="flex items-center gap-3">
                    <ShieldCheck
                      className={
                        org.status === "verified"
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }
                      size={22}
                    />
                    <div>
                      <p className="text-sm font-bold">
                        {org.status === "verified"
                          ? "Verified company"
                          : org.status === "suspended"
                            ? "Workspace suspended"
                            : "Company verification pending"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {org.status === "verified"
                          ? "Your company can publish jobs."
                          : "Public publishing is unavailable until CVeat approves the company."}
                      </p>
                    </div>
                  </div>
                  {orgs.length > 1 ? (
                    <select
                      aria-label="Choose company"
                      className={input + " max-w-52"}
                      value={org.id}
                      onChange={(e) => {
                        setEditor(false);
                        void load(e.target.value);
                      }}
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      {org.role}
                    </span>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    [
                      "Draft roles",
                      jobs.filter((j) => j.status === "draft").length,
                    ],
                    [
                      "Published roles",
                      jobs.filter((j) => j.status === "published").length,
                    ],
                    [
                      "Paused / closed",
                      jobs.filter((j) =>
                        ["paused", "closed"].includes(j.status),
                      ).length,
                    ],
                  ].map(([label, n]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {label}
                      </p>
                      <p className="mt-2 text-3xl font-extrabold">{n}</p>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map(({ title, icon: Icon, copy, live }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]"
              >
                <div className="flex items-center justify-between">
                  <Icon
                    size={22}
                    className="text-indigo-600 dark:text-indigo-300"
                  />
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${live ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"}`}
                  >
                    {live ? "Available" : "Next milestone"}
                  </span>
                </div>
                <h2 className="mt-4 font-bold">{title}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {copy}
                </p>
                {live && (
                  <a
                    href="#company-jobs"
                    className="mt-4 inline-block text-xs font-bold text-indigo-600 dark:text-indigo-300"
                  >
                    Manage roles →
                  </a>
                )}
              </div>
            ))}
          </section>
          <section
            id="company-jobs"
            className="scroll-mt-28 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-[#1B263B]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Your job listings</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Published listings appear on the job board. Direct
                  applications arrive in a later milestone.
                </p>
              </div>
              {canEdit && (
                <button
                  disabled={busy || org?.status === "suspended"}
                  className={button}
                  onClick={() => edit(null)}
                >
                  <Plus size={15} />
                  New role
                </button>
              )}
            </div>
            {!org ? (
              <p className="py-6 text-sm text-slate-500">
                Create or open a company workspace to manage jobs.
              </p>
            ) : jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
                <BriefcaseBusiness
                  className="mx-auto text-indigo-400"
                  size={30}
                />
                <p className="mt-3 font-bold">Your first role starts here</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Draft a clear position while company verification is in
                  progress.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {jobs.map((j) => (
                  <div
                    key={j.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="text-sm font-bold">{j.title}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {j.city}, {j.state} · {j.seniority} · {j.status}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() => edit(j)}
                      >
                        Manage role
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
          {editor && org && (
            <form
              id="job-editor"
              className="scroll-mt-28 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1B263B]"
              onSubmit={(e) => {
                e.preventDefault();
                void save("draft");
              }}
            >
              <h2 className="text-xl font-bold">
                {editing ? "Edit job" : "Create a role"}
              </h2>
              <fieldset disabled={busy} className="space-y-4">
                <label className="block text-xs font-bold">
                  Position title
                  <input
                    required
                    maxLength={150}
                    className={input}
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-bold">
                  Job description
                  <textarea
                    required
                    rows={7}
                    maxLength={15000}
                    className={input}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["state", "State / union territory", INDIAN_STATES],
                      ["seniority", "Seniority", SENIORITIES],
                      ["work_mode", "Work mode", WORK_MODES],
                      ["employment_type", "Employment type", EMPLOYMENT_TYPES],
                    ] as const
                  ).map(([key, label, values]) => (
                    <label key={key} className="text-xs font-bold">
                      {label}
                      <select
                        className={input}
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                      >
                        {values.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label className="text-xs font-bold">
                    City
                    <input
                      maxLength={100}
                      className={input}
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Required experience · years
                    <input
                      type="number"
                      min={0}
                      max={50}
                      className={input}
                      value={form.experience_min}
                      onChange={(e) =>
                        setForm({ ...form, experience_min: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Annual minimum salary · INR
                    <input
                      type="number"
                      min={0}
                      className={input}
                      value={form.salary_min}
                      onChange={(e) =>
                        setForm({ ...form, salary_min: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Annual maximum salary · INR
                    <input
                      type="number"
                      min={0}
                      className={input}
                      value={form.salary_max}
                      onChange={(e) =>
                        setForm({ ...form, salary_max: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Application deadline (optional)
                    <input
                      type="date"
                      className={input + " dark:[color-scheme:dark]"}
                      value={form.deadline}
                      onChange={(e) =>
                        setForm({ ...form, deadline: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Skills · comma separated
                    <input
                      maxLength={1000}
                      className={input}
                      placeholder="Figma, Research, Prototyping"
                      value={form.skills}
                      onChange={(e) =>
                        setForm({ ...form, skills: e.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className={button}>Save draft</button>
                  <button
                    type="button"
                    disabled={org.status !== "verified"}
                    onClick={() => void save("published")}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                  >
                    Publish listing
                  </button>
                  {editing && (
                    <>
                      <button
                        type="button"
                        className={button}
                        onClick={() => void save("paused")}
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        className={button}
                        onClick={() => void save("closed")}
                      >
                        Close role
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={button}
                    onClick={() => setEditor(false)}
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-indigo-50 p-5 text-indigo-900 dark:bg-indigo-400/10 dark:text-indigo-200">
            <div className="flex gap-3">
              <MessageSquare size={23} />
              <div>
                <h2 className="text-sm font-bold">
                  Meet the conversational interview host
                </h2>
                <p className="mt-1 text-xs">
                  Try CV/JD-based voice practice on the candidate side before
                  employer assessments arrive.
                </p>
              </div>
            </div>
            <Link href="/interview-prep" className="text-sm font-bold">
              Try practice interview →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

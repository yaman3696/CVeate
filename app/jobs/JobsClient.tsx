"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MapPin,
  BriefcaseBusiness,
  Search,
  SlidersHorizontal,
  X,
  Building2,
} from "lucide-react";
import {
  INDIAN_STATES,
  SENIORITIES,
  WORK_MODES,
  EMPLOYMENT_TYPES,
  salaryLabel,
  type Job,
} from "@/lib/enterprise";
type Filters = {
  q: string;
  state: string;
  city: string;
  seniority: string;
  mode: string;
  type: string;
  experience: string;
  salary: string;
  skill: string;
};
const empty: Filters = {
  q: "",
  state: "",
  city: "",
  seniority: "",
  mode: "",
  type: "",
  experience: "",
  salary: "",
  skill: "",
};
const control =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-[#111C30] dark:text-slate-100";
export default function JobsClient() {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const params = useSearchParams(),
    initial = Object.fromEntries(
      Object.keys(empty).map((k) => [k, params.get(k) || ""]),
    ) as Filters;
  const [draft, setDraft] = useState(initial),
    [filters, setFilters] = useState(initial),
    [page, setPage] = useState(1),
    [rows, setRows] = useState<Job[]>([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Job | null>(null),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const p = new URLSearchParams({ page: String(page) });
        for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
        const response = await fetch(`/api/jobs?${p}`, {
            cache: "no-store",
            signal: c.signal,
          }),
          data = await response.json();
        if (!response.ok) throw Error(data.error || "Unable to load jobs.");
        if (c.signal.aborted) return;
        const last = Math.max(1, Math.ceil(data.total / 12));
        if (page > last) {
          setPage(last);
          return;
        }
        setRows(data.jobs);
        setTotal(data.total);
      } catch (e) {
        if (!c.signal.aborted) {
          setError(e instanceof Error ? e.message : "Unable to load jobs.");
          setRows([]);
        }
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => c.abort();
  }, [filters, page, refresh]);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "Tab") {
        const nodes =
          dialogRef.current?.querySelectorAll<HTMLElement>("button,a[href]");
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialogRef.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", close);
      previous?.focus();
    };
  }, [selected]);
  function apply(next: Filters) {
    setFilters(next);
    setDraft(next);
    setPage(1);
    setSelected(null);
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    window.history.replaceState(null, "", `/jobs${p.size ? `?${p}` : ""}`);
  }
  const active = Object.values(filters).filter(Boolean).length;
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600 dark:text-indigo-300">
              Your next chapter
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Find work that fits you.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Explore roles from verified companies. Narrow your search,
              understand the role and prepare with your AI interview host.
            </p>
          </div>
        </header>
        <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply({
                ...draft,
                q: draft.q.trim(),
                city: draft.city.trim(),
                skill: draft.skill.trim(),
              });
            }}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#1B263B]"
          >
            <h2 className="flex items-center gap-2 font-bold">
              <SlidersHorizontal size={17} />
              Refine your search
            </h2>
            <label className="block text-xs font-bold">
              Position / job title
              <input
                className={control}
                maxLength={100}
                value={draft.q}
                onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                placeholder="e.g. Graphic Designer"
              />
            </label>
            {(
              [
                ["state", "State / union territory", INDIAN_STATES],
                ["seniority", "Seniority", SENIORITIES],
                ["mode", "Work mode", WORK_MODES],
                ["type", "Employment type", EMPLOYMENT_TYPES],
              ] as const
            ).map(([key, label, options]) => (
              <label className="block text-xs font-bold" key={key}>
                {label}
                <select
                  className={control}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                >
                  <option value="">All</option>
                  {options.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
            <label className="block text-xs font-bold">
              City
              <input
                className={control}
                maxLength={100}
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                placeholder="e.g. Bengaluru"
              />
            </label>
            <label className="block text-xs font-bold">
              Skill (exact name)
              <input
                className={control}
                maxLength={60}
                value={draft.skill}
                onChange={(e) => setDraft({ ...draft, skill: e.target.value })}
                placeholder="e.g. Figma"
              />
            </label>
            <label className="block text-xs font-bold">
              Your experience · years
              <input
                className={control}
                type="number"
                min={0}
                max={50}
                value={draft.experience}
                onChange={(e) =>
                  setDraft({ ...draft, experience: e.target.value })
                }
                placeholder="Any"
              />
            </label>
            <label className="block text-xs font-bold">
              Minimum annual salary · INR
              <input
                className={control}
                type="number"
                min={0}
                max={1000000000}
                value={draft.salary}
                onChange={(e) => setDraft({ ...draft, salary: e.target.value })}
                placeholder="e.g. 600000"
              />
            </label>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white">
              <Search size={16} />
              Search jobs
            </button>
            <button
              type="button"
              className="w-full text-xs font-semibold text-slate-500 dark:text-slate-400"
              onClick={() => apply(empty)}
            >
              Clear all filters
            </button>
          </form>
          <section className="space-y-4" aria-live="polite">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold">
                {loading
                  ? "Finding opportunities…"
                  : `${total} ${total === 1 ? "opportunity" : "opportunities"}`}
                {active > 0 && ` · ${active} filters applied`}
              </p>
              <button
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-300"
                disabled={loading}
                onClick={() => setRefresh((n) => n + 1)}
              >
                Refresh
              </button>
            </div>
            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-white p-8 text-sm text-red-700 dark:border-red-400/20 dark:bg-[#1B263B] dark:text-red-300"
              >
                {error}
              </div>
            ) : loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-64 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-[#1B263B]">
                <BriefcaseBusiness
                  className="mx-auto text-indigo-400"
                  size={34}
                />
                <h2 className="mt-4 text-xl font-bold">
                  {active
                    ? "No matching roles yet"
                    : "Your next opportunity is on its way"}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {active
                    ? "Try fewer filters or a broader job title."
                    : "This board shows real published jobs from verified employers. Check back as companies join CVeat."}
                </p>
                <Link
                  href="/interview-prep"
                  className="mt-6 inline-block text-sm font-bold text-indigo-600 dark:text-indigo-300"
                >
                  Practise for your next interview →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {rows.map((job) => (
                  <article
                    key={job.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-indigo-300 dark:border-slate-700 dark:bg-[#1B263B] dark:hover:border-indigo-400/60"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
                        <Building2 size={22} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {job.organizations?.name} · Verified employer
                        </p>
                        <h2 className="mt-1 text-lg font-bold">{job.title}</h2>
                      </div>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin size={14} />
                      {[job.city, job.state].filter(Boolean).join(", ")} ·{" "}
                      {job.work_mode}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        job.seniority,
                        job.employment_type,
                        `${job.experience_min}+ years`,
                      ].map((v) => (
                        <span
                          key={v}
                          className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold dark:bg-slate-700/50"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm font-bold">{salaryLabel(job)}</p>
                    <p className="line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {job.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {job.deadline
                          ? `Closes ${new Date(job.deadline + "T12:00:00").toLocaleDateString("en-IN")}`
                          : "Open until filled"}
                      </span>
                      <button
                        onClick={() => setSelected(job)}
                        className="text-sm font-bold text-indigo-600 dark:text-indigo-300"
                      >
                        View role →
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {!loading && !error && total > 12 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((n) => n - 1)}
                  className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40 dark:border-slate-700"
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {page} of {Math.ceil(total / 12)}
                </span>
                <button
                  disabled={page * 12 >= total}
                  onClick={() => setPage((n) => n + 1)}
                  className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40 dark:border-slate-700"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>
        {selected && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelected(null);
            }}
          >
            <div
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="job-title"
              className="max-h-[85vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 dark:bg-[#1B263B]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-indigo-600 dark:text-indigo-300">
                    {selected.organizations?.name}
                  </p>
                  <h2 id="job-title" className="mt-1 text-2xl font-bold">
                    {selected.title}
                  </h2>
                </div>
                <button
                  aria-label="Close role"
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selected.city}, {selected.state} · {selected.work_mode} ·{" "}
                {selected.seniority}
              </p>
              <p className="font-bold">{salaryLabel(selected)}</p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
                {selected.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-lg bg-indigo-50 px-3 py-1 text-xs text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                Direct applications are being prepared for the next Enterprise
                milestone. This listing does not collect applications yet.
              </div>
              <Link
                href={`/interview-prep?job=${selected.id}`}
                className="inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
              >
                Practise for this role
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

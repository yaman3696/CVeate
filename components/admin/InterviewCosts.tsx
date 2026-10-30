"use client";
export type InterviewCostReport = {
  since: string;
  until: string;
  usdToInr: number;
  summary: {
    started: number;
    prepared: number;
    reviewed: number;
    expiredUnreviewed: number;
    knownCostInr: number;
    unknownAttempts: number;
    attempts: number;
    careerCreditsCharged: number;
    sessionsWithoutAttempts: number;
    incompleteSessions: number;
  };
  stages: {
    stage: string;
    provider: string;
    attempts: number;
    unknown_attempts: number;
    known_cost: number;
    input_tokens: number;
    output_tokens: number;
    thinking_tokens: number;
    characters: number;
  }[];
  modes: {
    mode: string;
    started: number;
    reviewed: number;
    known_cost: number;
    unknown_attempts: number;
    average_complete_cost: number | null;
    effective_cost_per_review: number | null;
  }[];
  sessions: {
    id: string;
    mode: string;
    created_at: string;
    reviewed_at: string | null;
    prepared_at: string | null;
    credits_charged: number;
    attempts: number;
    unknown_attempts: number;
    coverage_complete: boolean;
    known_cost: number;
    preparation_cost: number;
    speech_cost: number;
    transcription_cost: number;
    feedback_cost: number;
  }[];
  rates: {
    provider: string;
    model: string;
    rates: Record<string, number>;
    source_url: string;
    verified_at: string;
  }[];
};
const money = (n: number | string | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }).format(Number(n));
export default function InterviewCosts({
  data,
  days,
  onDaysChange,
  unavailable,
}: {
  data: InterviewCostReport | null;
  days: number;
  onDaysChange: (days: number) => void;
  unavailable: boolean;
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Interview cost tracking</h2>
          <p className="mt-2 text-sm text-slate-500">
            Preparation → speech → transcription → final feedback. Metadata
            only.
          </p>
        </div>
        <label className="text-xs font-semibold">
          Interviews started in
          <select
            value={days}
            onChange={(e) => onDaysChange(Number(e.target.value))}
            className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            {[7, 30, 90, 365].map((n) => (
              <option key={n} value={n}>
                Last {n} days
              </option>
            ))}
          </select>
        </label>
      </div>
      {unavailable || !data ? (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
        >
          Interview costing is not available yet. Apply the interview cost
          tracking SQL update. Existing reports remain available.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Interviews started", data.summary.started],
              ["Final reviews completed", data.summary.reviewed],
              ["Known provider cost", money(data.summary.knownCostInr)],
              ["Career Credits charged", data.summary.careerCreditsCharged],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs leading-6 text-slate-500">
            Paid-tier list-price estimates, not invoices. Includes retries and
            unfinished sessions. Browser live transcription has no CVeat
            provider API charge; Gemini fallback transcription is included when
            used. USD/INR planning rate: {Number(data.usdToInr).toFixed(2)}. No
            historical costs are reconstructed.
          </p>
          {(data.summary.unknownAttempts > 0 ||
            data.summary.sessionsWithoutAttempts > 0 ||
            data.summary.incompleteSessions > 0) && (
            <p
              role="alert"
              className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
            >
              Partial totals: {data.summary.unknownAttempts} attempts have
              unknown cost; {data.summary.sessionsWithoutAttempts} sessions have
              no recorded attempt; {data.summary.incompleteSessions} sessions
              have incomplete stage coverage. Missing cost is not free usage.
              Check rates, provider usage metadata and server logging before
              using these totals for pricing.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  {[
                    "Stage",
                    "Provider",
                    "Attempts",
                    "Tokens in / out + thinking",
                    "Speech characters",
                    "Known cost",
                    "Unknown cost attempts",
                  ].map((h) => (
                    <th key={h} className="p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.stages.map((s) => (
                  <tr
                    key={`${s.provider}:${s.stage}`}
                    className="border-b border-slate-100"
                  >
                    <td className="p-3 capitalize">{s.stage}</td>
                    <td className="p-3 capitalize">{s.provider}</td>
                    <td className="p-3">{s.attempts}</td>
                    <td className="p-3">
                      {s.provider === "gemini"
                        ? `${s.input_tokens} / ${Number(s.output_tokens) + Number(s.thinking_tokens)}`
                        : "—"}
                    </td>
                    <td className="p-3">
                      {s.provider === "sarvam" ? s.characters : "—"}
                    </td>
                    <td className="p-3">{money(s.known_cost)}</td>
                    <td className="p-3">{s.unknown_attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {data.modes.map((m) => (
              <div
                key={m.mode}
                className="rounded-xl border border-slate-200 p-4"
              >
                <h3 className="font-bold capitalize">
                  {m.mode === "conversation"
                    ? "Conversational AI"
                    : m.mode === "text"
                      ? "Text interview"
                      : "Mode not recorded"}
                </h3>
                <p className="mt-2 text-xs text-slate-500">
                  {m.started} started · {m.reviewed} reviewed
                </p>
                <p className="mt-3 text-sm">
                  Average fully priced review:{" "}
                  <strong>{money(m.average_complete_cost)}</strong>
                </p>
                <p className="mt-2 text-sm">
                  Known spend per completed review, including overhead:{" "}
                  <strong>{money(m.effective_cost_per_review)}</strong>
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {m.unknown_attempts} unknown-cost attempts; overhead ratio is
                  a lower bound when costs are missing.
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {data.summary.expiredUnreviewed} sessions older than 24 hours have
            no completed review. Prepared interviews: {data.summary.prepared}.
            Attempts: {data.summary.attempts}.
          </p>
          <details>
            <summary className="font-semibold">
              Recent 50 interview cost breakdowns
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50">
                  <tr>
                    {[
                      "Interview / mode",
                      "State",
                      "Preparation",
                      "Speech",
                      "Transcription",
                      "Feedback",
                      "Known total",
                      "Credits",
                      "Coverage",
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100">
                      <td className="p-3">
                        <span className="font-mono">{s.id}</span>
                        <br />
                        {s.mode} · {new Date(s.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        {s.reviewed_at
                          ? "Reviewed"
                          : s.prepared_at
                            ? "Prepared"
                            : "Preparation attempted"}
                      </td>
                      {[
                        s.preparation_cost,
                        s.speech_cost,
                        s.transcription_cost,
                        s.feedback_cost,
                        s.known_cost,
                      ].map((n, i) => (
                        <td key={i} className="p-3">
                          {s.attempts ? money(n) : "—"}
                        </td>
                      ))}
                      <td className="p-3">{s.credits_charged}</td>
                      <td className="p-3">
                        {s.unknown_attempts ||
                        !s.attempts ||
                        !s.coverage_complete
                          ? "Partial"
                          : "Known recorded costs"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <details>
            <summary className="font-semibold">
              Provider rates used for new requests
            </summary>
            <div className="mt-3 space-y-3 text-xs text-slate-500">
              {data.rates.map((r) => (
                <div key={`${r.provider}:${r.model}`}>
                  <p className="font-semibold text-slate-800">
                    {r.provider} · {r.model}
                  </p>
                  <p className="mt-1 break-words">
                    {Object.entries(r.rates)
                      .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v}`)
                      .join(" · ")}
                  </p>
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 underline"
                  >
                    Pricing source
                  </a>
                  <span>
                    {" "}
                    · Verified {new Date(r.verified_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
              <p>
                Each attempt stores its own rate and conversion snapshot. Update
                the rates/settings tables for future calls. Sarvam characters
                count submitted Unicode code points; provider billing
                normalization may differ.
              </p>
            </div>
          </details>
          {data.summary.started === 0 && (
            <p className="text-sm text-slate-500">
              No interviews recorded in this period. Tracking starts after the
              SQL update is applied.
            </p>
          )}
        </>
      )}
    </section>
  );
}

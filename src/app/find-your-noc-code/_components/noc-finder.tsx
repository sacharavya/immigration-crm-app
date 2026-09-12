"use client";

import { ApplyForm } from "./apply-form";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
  Search,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SowpData = {
  status: "eligible" | "not_eligible_standard";
  basis: string;
  listed: boolean | null;
  conditions: string[];
  alternatives: string[];
};

export type NocResult = {
  code: string;
  title: string;
  teer: number;
  broadCategory: string;
  leadStatement: string;
  mainDuties: string[];
  employmentRequirements: string;
  exampleTitles: string[];
  exclusions: string[];
  matchScore: number;
  rationale?: string;
  sowpListed: boolean;
  sowp: SowpData;
};

export type NocFinderProps = {
  /** Parent callback when the user selects a result. */
  onSelect?: (result: NocResult) => void;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 300;
const NOC_SITE = "https://noc.esdc.gc.ca/";

function teerLabel(teer: number): string {
  switch (teer) {
    case 0: return "TEER 0 — Management";
    case 1: return "TEER 1 — University degree";
    case 2: return "TEER 2 — College diploma / apprenticeship";
    case 3: return "TEER 3 — College / vocational training";
    case 4: return "TEER 4 — High school / on-the-job training";
    case 5: return "TEER 5 — Short work demonstration";
    default: return `TEER ${teer}`;
  }
}

function isEligible(teer: number): boolean {
  return teer <= 3;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NocFinder({ onSelect }: NocFinderProps) {
  const [titleQuery, setTitleQuery] = useState("");
  const [duties, setDuties] = useState("");
  const [results, setResults] = useState<NocResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [sowpLastVerified, setSowpLastVerified] = useState<string | null>(null);
  const [checkedDuties, setCheckedDuties] = useState<
    Record<string, Set<number>>
  >({});

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasInput = titleQuery.trim().length > 0 || duties.trim().length > 0;

  // Fetch results
  const fetchResults = useCallback(
    async (title: string, duty: string) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      if (!title.trim() && !duty.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/noc/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titleQuery: title.trim() || undefined,
            duties: duty.trim() || undefined,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("search_failed");
        const data = await res.json();
        if (!ctrl.signal.aborted) {
          setResults(data.results ?? []);
          if (data.sowpLastVerified) setSowpLastVerified(data.sowpLastVerified);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Search failed. Please try again.");
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    },
    [],
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(titleQuery, duties);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [titleQuery, duties, fetchResults]);

  // Auto-select first result when results change. Deferred: setState directly
  // in an effect body triggers cascading renders.
  useEffect(() => {
    queueMicrotask(() => {
      if (results.length === 0) {
        setSelectedCode(null);
        return;
      }
      const stillPresent =
        selectedCode && results.some((r) => r.code === selectedCode);
      if (!stillPresent) {
        setSelectedCode(results[0].code);
      }
    });
  }, [results, selectedCode]);

  // Notify parent on selection
  const selected = useMemo(
    () => results.find((r) => r.code === selectedCode) ?? null,
    [results, selectedCode],
  );

  useEffect(() => {
    if (selected && onSelect) onSelect(selected);
  }, [selected, onSelect]);

  // Duty checklist helpers
  function toggleDuty(code: string, index: number) {
    setCheckedDuties((prev) => {
      const set = new Set(prev[code] ?? []);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      return { ...prev, [code]: set };
    });
  }
  const checkedSet = selected ? (checkedDuties[selected.code] ?? new Set()) : new Set<number>();

  return (
    <div>
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-xs text-[#5A6A85]">
          Uses the full NOC 2021 dataset from Statistics Canada.
        </p>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ── LEFT: Search inputs ─────────────────────── */}
          <div className="lg:w-[40%] lg:shrink-0">
            <div className="border border-stone-200 bg-white p-5">
              <h2 className="text-base font-semibold text-stone-900">
                Find your occupation
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="noc-title"
                    className="block text-sm font-medium text-stone-700"
                  >
                    Job title or keywords
                  </label>
                  <div className="relative mt-1.5">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      id="noc-title"
                      type="text"
                      value={titleQuery}
                      onChange={(e) => setTitleQuery(e.target.value)}
                      placeholder="e.g. Software engineer, accountant, chef"
                      className="h-10 w-full border border-stone-200 bg-white pl-9 pr-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="noc-duties"
                    className="block text-sm font-medium text-stone-700"
                  >
                    Your day-to-day duties
                  </label>
                  <textarea
                    id="noc-duties"
                    value={duties}
                    onChange={(e) => setDuties(e.target.value)}
                    rows={6}
                    placeholder="Describe what you actually do at work — review code, manage team standups, prepare financial reports..."
                    className="mt-1.5 w-full border border-stone-200 bg-white px-3 py-2 text-sm"
                  />
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
                    IRCC matches your occupation on duties, not job title. The
                    more accurately you describe your real tasks, the better the
                    match. Results update as you type.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Results + Detail ─────────────────── */}
          <div className="min-w-0 flex-1 space-y-4">
            {/* Results list */}
            <div className="border border-stone-200 bg-white p-5">
              <p
                className="text-xs font-semibold uppercase tracking-wider text-stone-400"
                aria-live="polite"
              >
                {loading
                  ? "Searching…"
                  : results.length > 0
                    ? `${results.length} match${results.length === 1 ? "" : "es"} found`
                    : hasInput
                      ? "No matches"
                      : "Results"}
              </p>

              <div className="mt-3 space-y-2">
                {/* Loading skeleton */}
                {loading && results.length === 0 && (
                  <>
                    {Array.from({ length: 4 }, (_, i) => (
                      <div
                        key={i}
                        className="animate-pulse border border-stone-100 p-3"
                      >
                        <div className="h-3 w-24 rounded bg-stone-200" />
                        <div className="mt-2 h-3 w-48 rounded bg-stone-100" />
                      </div>
                    ))}
                  </>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Empty — no input */}
                {!loading && !error && !hasInput && (
                  <p className="py-6 text-center text-sm text-stone-400">
                    Start typing a job title or describe your duties to find
                    matching NOC codes.
                  </p>
                )}

                {/* Empty — no results */}
                {!loading && !error && hasInput && results.length === 0 && (
                  <p className="py-6 text-center text-sm text-stone-400">
                    No matches found. Try different keywords or describe your
                    duties in more detail.
                  </p>
                )}

                {/* Result cards */}
                {results.map((r) => {
                  const isSelected = r.code === selectedCode;
                  const eligible = isEligible(r.teer);
                  return (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => setSelectedCode(r.code)}
                      className={`flex w-full items-center gap-3 border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-[var(--navy)] bg-[var(--navy)]/[0.04]"
                          : "border-stone-100 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm font-semibold text-stone-800">
                            {r.code}
                          </code>
                          <span className="text-sm text-stone-700">
                            {r.title}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-400">
                          {r.broadCategory}
                        </p>
                        <p
                          className={`mt-0.5 text-[11px] ${
                            r.sowp.status === "eligible"
                              ? "text-emerald-600"
                              : "text-stone-400"
                          }`}
                        >
                          {r.sowp.status === "eligible"
                            ? "Spouse/partner may qualify for open work permit"
                            : "Spouse/partner not eligible under standard stream"}
                        </p>
                      </div>
                      <TeerBadge teer={r.teer} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail card */}
            {selected && (
              <div className="border border-stone-200 bg-white p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-lg font-bold text-stone-900">
                        {selected.code}
                      </code>
                      <TeerBadge teer={selected.teer} />
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-stone-900">
                      {selected.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {selected.broadCategory}
                    </p>
                  </div>
                </div>

                {/* Eligibility banner */}
                <EligibilityBanner teer={selected.teer} />

                {/* SOWP section */}
                <SowpSection
                  sowp={selected.sowp}
                  lastVerified={sowpLastVerified}
                />

                {/* Apply with Big Bang: the verdict just landed - this is the
                    conversion moment. Keyed so a new selection resets state. */}
                <div className="mt-4">
                  <ApplyForm
                    key={selected.code}
                    nocCode={selected.code}
                    nocTitle={selected.title}
                    teer={selected.teer}
                    sowpStatus={selected.sowp.status}
                  />
                </div>

                {/* Lead statement */}
                {selected.leadStatement && (
                  <div className="mt-4">
                    <SectionLabel>Lead statement</SectionLabel>
                    <p className="mt-1 text-sm leading-relaxed text-stone-700">
                      {selected.leadStatement}
                    </p>
                  </div>
                )}

                {/* Main duties (checklist) */}
                {selected.mainDuties.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                      <SectionLabel>Main duties</SectionLabel>
                      <span className="text-xs tabular-nums text-stone-500">
                        {checkedSet.size} of{" "}
                        {selected.mainDuties.filter((d) => !/^this group performs/i.test(d.trim())).length}{" "}
                        match
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-stone-400">
                      IRCC compares reference letters against this list. Aim to
                      match most duties.
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {selected.mainDuties.map((duty, i) => {
                        // Preamble lines like "This group performs some or all
                        // of the following duties:" are not checkable duties.
                        const isPreamble = /^this group performs/i.test(duty.trim());
                        if (isPreamble) {
                          return (
                            <p key={i} className="text-sm italic text-stone-500">
                              {duty}
                            </p>
                          );
                        }
                        return (
                          <label
                            key={i}
                            className="flex items-start gap-2.5 text-sm text-stone-700"
                          >
                            <input
                              type="checkbox"
                              checked={checkedSet.has(i)}
                              onChange={() => toggleDuty(selected.code, i)}
                              className="mt-1 h-4 w-4 shrink-0 accent-[var(--navy)]"
                            />
                            <span className="leading-relaxed">{duty}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Employment requirements */}
                {selected.employmentRequirements && (
                  <div className="mt-4">
                    <SectionLabel>Employment requirements</SectionLabel>
                    <p className="mt-1 text-sm leading-relaxed text-stone-700">
                      {selected.employmentRequirements}
                    </p>
                  </div>
                )}

                {/* Example titles */}
                {selected.exampleTitles.length > 0 && (
                  <div className="mt-4">
                    <SectionLabel>Example titles</SectionLabel>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selected.exampleTitles.map((t, i) => (
                        <span
                          key={i}
                          className="border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exclusions */}
                {selected.exclusions.length > 0 && (
                  <div className="mt-4">
                    <SectionLabel>Exclusions</SectionLabel>
                    <ul className="mt-1 space-y-0.5 text-sm text-stone-600">
                      {selected.exclusions.map((ex, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Official link */}
                <div className="mt-5 border-t border-stone-100 pt-4">
                  <a
                    href={NOC_SITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--navy)] hover:underline"
                  >
                    Verify NOC {selected.code} on the official site
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-stone-400">
              This tool is for guidance only. Always confirm your NOC code and
              read the full duty list on the{" "}
              <a
                href={NOC_SITE}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                official NOC website
              </a>{" "}
              before relying on it for any immigration application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TeerBadge({ teer }: { teer: number }) {
  const eligible = isEligible(teer);
  return (
    <span
      className={`inline-flex shrink-0 items-center px-2 py-0.5 text-[11px] font-medium ${
        eligible
          ? "bg-[var(--navy)] text-white"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      TEER {teer}
    </span>
  );
}

function EligibilityBanner({ teer }: { teer: number }) {
  const eligible = isEligible(teer);

  const eeConditions: string[] = [];

  const eeAlternatives = !eligible
    ? [
        "Provincial Nominee Programs (PNPs) may accept TEER 4 and 5 occupations depending on the province.",
        "Atlantic Immigration Program accepts occupations at all TEER levels with a valid job offer.",
        "Rural and Northern Immigration Pilot and community-specific programs may apply.",
        "Some TEER 4/5 occupations qualify for specific caregiver or agri-food pilot streams.",
      ]
    : [];

  return (
    <div
      className={`mt-3 px-4 py-3 text-sm ${
        eligible
          ? "border border-[var(--navy)]/20 bg-[var(--navy)]/[0.04]"
          : "border border-amber-200 bg-amber-50/60"
      }`}
    >
      <div className="flex items-start gap-2">
        {eligible ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--navy)]" />
        ) : (
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        )}
        <div>
          <p className="font-medium text-stone-800">Express Entry eligibility</p>
          <p className="mt-0.5 text-xs text-stone-600">
            {eligible
              ? "This occupation is eligible for Express Entry programs (Federal Skilled Worker, Canadian Experience Class, Federal Skilled Trades)."
              : "This occupation is not eligible for Express Entry. Other immigration pathways may be available."}
            {" "}
            <span className="text-stone-400">
              {teerLabel(teer)}.
            </span>
          </p>
        </div>
      </div>

      {eeConditions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-stone-500">Key requirements</p>
          <ul className="mt-1 space-y-1">
            {eeConditions.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs leading-relaxed text-stone-600"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-300" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {eeAlternatives.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-stone-500">
            Alternative pathways
          </p>
          <ul className="mt-1 space-y-1">
            {eeAlternatives.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs leading-relaxed text-stone-600"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-300" />
                {a}
              </li>
            ))}
          </ul>
          <a
            href="/book-an-appointment"
            className="mt-2 inline-flex text-xs font-medium text-[var(--navy)] hover:underline"
          >
            Book a consultation to explore your options
          </a>
        </div>
      )}
    </div>
  );
}

function SowpSection({
  sowp,
  lastVerified,
}: {
  sowp: SowpData;
  lastVerified: string | null;
}) {
  const eligible = sowp.status === "eligible";
  const IRCC_SOWP_URL =
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/special-instructions/spouses-dependent-children/eligibility.html";

  return (
    <div
      className={`mt-3 px-4 py-3 text-sm ${
        eligible
          ? "border border-emerald-200 bg-emerald-50/60"
          : "border border-stone-200 bg-stone-50"
      }`}
    >
      {/* Status heading */}
      <div className="flex items-start gap-2">
        {eligible ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
        )}
        <div>
          <p className="font-medium text-stone-800">
            Spousal open work permit
          </p>
          <p className="mt-0.5 text-xs text-stone-600">
            {eligible
              ? "A worker in this occupation can make their spouse or partner eligible for an open work permit."
              : "The standard stream does not qualify a spouse or partner based on this occupation."}
            {" "}
            <span className="text-stone-400">
              Basis: {sowp.basis}.
            </span>
          </p>
        </div>
      </div>

      {/* Conditions (eligible) */}
      {sowp.conditions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-stone-500">Conditions</p>
          <ul className="mt-1 space-y-1">
            {sowp.conditions.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs leading-relaxed text-stone-600"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-300" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternatives (not eligible) */}
      {sowp.alternatives.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-stone-500">
            Other pathways to explore
          </p>
          <ul className="mt-1 space-y-1">
            {sowp.alternatives.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs leading-relaxed text-stone-600"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-300" />
                {a}
              </li>
            ))}
          </ul>
          <a
            href="/book-an-appointment"
            className="mt-2 inline-flex text-xs font-medium text-[var(--navy)] hover:underline"
          >
            Book a consultation to discuss your options
          </a>
        </div>
      )}

      {/* Footer: verified date + IRCC link */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-200/60 pt-2 text-[11px] text-stone-400">
        {lastVerified && (
          <span>Rules current as of {lastVerified}</span>
        )}
        <a
          href={IRCC_SOWP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-stone-600 hover:underline"
        >
          IRCC eligibility page
        </a>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
      {children}
    </p>
  );
}

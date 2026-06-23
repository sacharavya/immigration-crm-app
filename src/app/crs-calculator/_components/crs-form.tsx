"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  calculateCRS,
  celpipToCLB,
  ieltsToCLB,
  type CrsInput,
  type EducationLevel,
  type LanguageScores,
} from "@/lib/crs-calculator";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_INPUT: CrsInput = {
  hasSpouse: false,
  age: 29,
  education: "secondary",
  firstOfficialLanguage: "english",
  canadianWorkYears: 0,
  foreignWorkYears: 0,
  hasTradeCertificate: false,
  additional: {
    provincialNomination: false,
    siblingInCanada: false,
    canadianEducation: "none",
  },
};

const EDUCATION_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: "lessThanSecondary", label: "Less than secondary school" },
  { value: "secondary", label: "Secondary school (high school)" },
  { value: "oneYear", label: "One-year post-secondary program" },
  { value: "twoYear", label: "Two-year post-secondary program" },
  { value: "bachelorOrThreeYear", label: "Bachelor's degree (3+ years)" },
  { value: "twoOrMoreCredentials", label: "Two or more post-secondary credentials" },
  { value: "masters", label: "Master's degree" },
  { value: "doctoral", label: "Doctoral degree (PhD)" },
];

type TestType = "ielts" | "celpip" | "tef" | "tcf";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function convertToClb(
  test: TestType,
  ability: "reading" | "writing" | "speaking" | "listening",
  raw: number,
): number {
  if (test === "ielts") return ieltsToCLB(ability, raw);
  if (test === "celpip") return celpipToCLB(raw);
  // TEF / TCF: accept CLB/NCLC directly
  return Math.max(0, Math.round(raw));
}

function d(detail: Record<string, number>, key: string): number {
  return detail[key] ?? 0;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CrsForm() {
  const [input, setInput] = useState<CrsInput>(DEFAULT_INPUT);

  // Language test state (UI-level, not in CrsInput)
  const [firstTest, setFirstTest] = useState<TestType>("ielts");
  const [firstRaw, setFirstRaw] = useState({ reading: 0, writing: 0, speaking: 0, listening: 0 });
  const [hasSecond, setHasSecond] = useState(false);
  const [secondTest, setSecondTest] = useState<TestType>("tef");
  const [secondRaw, setSecondRaw] = useState({ reading: 0, writing: 0, speaking: 0, listening: 0 });

  // Spouse language
  const [spouseTest, setSpouseTest] = useState<TestType>("ielts");
  const [spouseRaw, setSpouseRaw] = useState({ reading: 0, writing: 0, speaking: 0, listening: 0 });
  const [hasSpouseLang, setHasSpouseLang] = useState(false);

  // Marital sub-questions
  const [isMarried, setIsMarried] = useState(false);
  const [spouseComing, setSpouseComing] = useState(false);
  const [spouseIsCitizenPR, setSpouseIsCitizenPR] = useState(false);

  // Compute hasSpouse from marital sub-questions
  const hasSpouse = isMarried && spouseComing && !spouseIsCitizenPR;

  // Build CLB scores from raw test scores
  function buildClb(test: TestType, raw: typeof firstRaw): LanguageScores {
    return {
      reading: convertToClb(test, "reading", raw.reading),
      writing: convertToClb(test, "writing", raw.writing),
      speaking: convertToClb(test, "speaking", raw.speaking),
      listening: convertToClb(test, "listening", raw.listening),
    };
  }

  // Determine which language gets which scores
  const firstIsEnglish =
    input.firstOfficialLanguage === "english"
      ? true
      : false;

  const firstClb = buildClb(firstTest, firstRaw);
  const secondClb = hasSecond ? buildClb(secondTest, secondRaw) : undefined;

  const englishScores = firstIsEnglish ? firstClb : secondClb;
  const frenchScores = firstIsEnglish ? secondClb : firstClb;

  // Build the full input for the engine
  const fullInput: CrsInput = {
    ...input,
    hasSpouse,
    english: englishScores,
    french: frenchScores,
    spouse: hasSpouse
      ? {
          education: input.spouse?.education ?? "lessThanSecondary",
          firstLanguage: hasSpouseLang
            ? buildClb(spouseTest, spouseRaw)
            : undefined,
          canadianWorkYears: input.spouse?.canadianWorkYears ?? 0,
        }
      : undefined,
  };

  const result = useMemo(() => calculateCRS(fullInput), [
    fullInput.hasSpouse,
    fullInput.age,
    fullInput.education,
    fullInput.firstOfficialLanguage,
    fullInput.english?.reading, fullInput.english?.writing,
    fullInput.english?.speaking, fullInput.english?.listening,
    fullInput.french?.reading, fullInput.french?.writing,
    fullInput.french?.speaking, fullInput.french?.listening,
    fullInput.canadianWorkYears,
    fullInput.foreignWorkYears,
    fullInput.hasTradeCertificate,
    fullInput.spouse?.education,
    fullInput.spouse?.firstLanguage?.reading,
    fullInput.spouse?.firstLanguage?.writing,
    fullInput.spouse?.firstLanguage?.speaking,
    fullInput.spouse?.firstLanguage?.listening,
    fullInput.spouse?.canadianWorkYears,
    fullInput.additional?.provincialNomination,
    fullInput.additional?.siblingInCanada,
    fullInput.additional?.canadianEducation,
  ]);

  // Updaters
  function patch(p: Partial<CrsInput>) {
    setInput((prev) => ({ ...prev, ...p }));
  }
  function patchAdditional(p: Partial<NonNullable<CrsInput["additional"]>>) {
    setInput((prev) => ({
      ...prev,
      additional: { ...prev.additional, ...p },
    }));
  }
  function patchSpouse(p: Partial<NonNullable<CrsInput["spouse"]>>) {
    setInput((prev) => ({
      ...prev,
      spouse: {
        education: prev.spouse?.education ?? "lessThanSecondary",
        canadianWorkYears: prev.spouse?.canadianWorkYears ?? 0,
        ...p,
      },
    }));
  }

  return (
    <div className="min-h-dvh bg-stone-50">
      {/* ── Mobile sticky total ─────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-2 lg:hidden">
        <span className="text-sm font-medium text-stone-600">CRS Score</span>
        <span
          className="text-2xl font-bold tabular-nums text-[var(--navy)]"
          aria-live="polite"
        >
          {result.total}
        </span>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ── LEFT: Questions ────────────────────────── */}
          <div className="min-w-0 flex-1 space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
                CRS Score Calculator
              </h1>
              <p className="mt-1 text-sm text-stone-600">
                Estimate your Comprehensive Ranking System score for Express
                Entry. All calculations update in real time.
              </p>
            </div>

            {/* ── 1. About you ─────────────────────────── */}
            <Section title="About you">
              <Field label="Marital status">
                <RadioRow
                  name="marital"
                  options={[
                    { value: "single", label: "Single" },
                    { value: "married", label: "Married or common-law" },
                  ]}
                  value={isMarried ? "married" : "single"}
                  onChange={(v) => {
                    setIsMarried(v === "married");
                    if (v === "single") {
                      setSpouseComing(false);
                      setSpouseIsCitizenPR(false);
                    }
                  }}
                />
              </Field>

              {isMarried && (
                <>
                  <Field label="Is your spouse or partner immigrating with you?">
                    <RadioRow
                      name="spouse-coming"
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ]}
                      value={spouseComing ? "yes" : "no"}
                      onChange={(v) => setSpouseComing(v === "yes")}
                    />
                  </Field>
                  {spouseComing && (
                    <Field label="Are they already a Canadian citizen or permanent resident?">
                      <RadioRow
                        name="spouse-pr"
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                        value={spouseIsCitizenPR ? "yes" : "no"}
                        onChange={(v) => setSpouseIsCitizenPR(v === "yes")}
                      />
                    </Field>
                  )}
                </>
              )}

              <Field label="Age">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={17}
                    max={45}
                    value={clamp(input.age, 17, 45)}
                    onChange={(e) => patch({ age: Number(e.target.value) })}
                    className="flex-1 accent-[var(--navy)]"
                  />
                  <span className="w-12 text-center text-sm font-semibold tabular-nums text-stone-800">
                    {input.age >= 45 ? "45+" : input.age}
                  </span>
                </div>
              </Field>

              <Field label="Level of education">
                <Select
                  options={EDUCATION_OPTIONS}
                  value={input.education}
                  onChange={(v) => patch({ education: v as EducationLevel })}
                />
              </Field>
            </Section>

            {/* ── 2. Language skills ────────────────────── */}
            <Section title="Language skills">
              <Field label="First official language">
                <RadioRow
                  name="first-lang"
                  options={[
                    { value: "english", label: "English" },
                    { value: "french", label: "French" },
                  ]}
                  value={input.firstOfficialLanguage}
                  onChange={(v) =>
                    patch({ firstOfficialLanguage: v as "english" | "french" })
                  }
                />
              </Field>

              <Field label="Test taken">
                <Select
                  options={
                    input.firstOfficialLanguage === "english"
                      ? [
                          { value: "ielts", label: "IELTS General" },
                          { value: "celpip", label: "CELPIP General" },
                        ]
                      : [
                          { value: "tef", label: "TEF Canada (enter NCLC)" },
                          { value: "tcf", label: "TCF Canada (enter NCLC)" },
                        ]
                  }
                  value={firstTest}
                  onChange={(v) => setFirstTest(v as TestType)}
                />
              </Field>

              <LanguageBandInputs
                test={firstTest}
                raw={firstRaw}
                onChange={setFirstRaw}
              />

              <div className="border-t border-stone-100 pt-4">
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={hasSecond}
                    onChange={(e) => setHasSecond(e.target.checked)}
                    className="h-4 w-4 accent-[var(--navy)]"
                  />
                  I have scores for a second official language
                </label>
              </div>

              {hasSecond && (
                <>
                  <Field label="Second language test">
                    <Select
                      options={
                        input.firstOfficialLanguage === "english"
                          ? [
                              { value: "tef", label: "TEF Canada (enter NCLC)" },
                              { value: "tcf", label: "TCF Canada (enter NCLC)" },
                            ]
                          : [
                              { value: "ielts", label: "IELTS General" },
                              { value: "celpip", label: "CELPIP General" },
                            ]
                      }
                      value={secondTest}
                      onChange={(v) => setSecondTest(v as TestType)}
                    />
                  </Field>
                  <LanguageBandInputs
                    test={secondTest}
                    raw={secondRaw}
                    onChange={setSecondRaw}
                  />
                </>
              )}
            </Section>

            {/* ── 3. Work experience ───────────────────── */}
            <Section title="Work experience">
              <Field label="Canadian skilled work experience (years)">
                <NumberSelect max={5} value={input.canadianWorkYears} onChange={(v) => patch({ canadianWorkYears: v })} />
              </Field>
              <Field label="Foreign skilled work experience (years)">
                <NumberSelect max={5} value={input.foreignWorkYears} onChange={(v) => patch({ foreignWorkYears: v })} />
              </Field>
              <Field label="Certificate of qualification in a trade (Canadian authority)">
                <RadioRow
                  name="trade"
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Yes" },
                  ]}
                  value={input.hasTradeCertificate ? "yes" : "no"}
                  onChange={(v) => patch({ hasTradeCertificate: v === "yes" })}
                />
              </Field>
            </Section>

            {/* ── 4. Spouse details ────────────────────── */}
            {hasSpouse && (
              <Section title="Spouse or partner details">
                <Field label="Spouse's level of education">
                  <Select
                    options={EDUCATION_OPTIONS}
                    value={input.spouse?.education ?? "lessThanSecondary"}
                    onChange={(v) =>
                      patchSpouse({ education: v as EducationLevel })
                    }
                  />
                </Field>

                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={hasSpouseLang}
                    onChange={(e) => setHasSpouseLang(e.target.checked)}
                    className="h-4 w-4 accent-[var(--navy)]"
                  />
                  Spouse has language test scores
                </label>

                {hasSpouseLang && (
                  <>
                    <Field label="Spouse's language test">
                      <Select
                        options={[
                          { value: "ielts", label: "IELTS General" },
                          { value: "celpip", label: "CELPIP General" },
                          { value: "tef", label: "TEF Canada (NCLC)" },
                          { value: "tcf", label: "TCF Canada (NCLC)" },
                        ]}
                        value={spouseTest}
                        onChange={(v) => setSpouseTest(v as TestType)}
                      />
                    </Field>
                    <LanguageBandInputs
                      test={spouseTest}
                      raw={spouseRaw}
                      onChange={setSpouseRaw}
                    />
                  </>
                )}

                <Field label="Spouse's Canadian work experience (years)">
                  <NumberSelect
                    max={5}
                    value={input.spouse?.canadianWorkYears ?? 0}
                    onChange={(v) => patchSpouse({ canadianWorkYears: v })}
                  />
                </Field>
              </Section>
            )}

            {/* ── 5. Additional points ─────────────────── */}
            <Section title="Additional points">
              <Field label="Provincial or territorial nomination">
                <RadioRow
                  name="pnp"
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Yes" },
                  ]}
                  value={input.additional?.provincialNomination ? "yes" : "no"}
                  onChange={(v) =>
                    patchAdditional({ provincialNomination: v === "yes" })
                  }
                />
              </Field>
              <Field label="Post-secondary education in Canada">
                <Select
                  options={[
                    { value: "none", label: "None" },
                    { value: "oneOrTwoYears", label: "One or two year credential" },
                    { value: "threeYearsOrMore", label: "Three years or more" },
                  ]}
                  value={input.additional?.canadianEducation ?? "none"}
                  onChange={(v) =>
                    patchAdditional({
                      canadianEducation: v as "none" | "oneOrTwoYears" | "threeYearsOrMore",
                    })
                  }
                />
              </Field>
              <Field label="Sibling in Canada (citizen/PR, 18+)">
                <RadioRow
                  name="sibling"
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Yes" },
                  ]}
                  value={input.additional?.siblingInCanada ? "yes" : "no"}
                  onChange={(v) =>
                    patchAdditional({ siblingInCanada: v === "yes" })
                  }
                />
              </Field>
            </Section>
          </div>

          {/* ── RIGHT: Scorecard ───────────────────────── */}
          <div className="hidden lg:block lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6">
            <Scorecard result={result} hasSpouse={hasSpouse} />
          </div>
        </div>

        {/* ── Mobile scorecard (below questions) ───────── */}
        <div className="mt-6 lg:hidden">
          <Scorecard result={result} hasSpouse={hasSpouse} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

function Scorecard({
  result,
  hasSpouse,
}: {
  result: ReturnType<typeof calculateCRS>;
  hasSpouse: boolean;
}) {
  return (
    <div className="border border-stone-200 bg-white">
      {/* Total */}
      <div className="border-b border-stone-100 px-5 py-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
          Your CRS score
        </p>
        <p
          className="mt-1 text-5xl font-bold tabular-nums text-[var(--navy)] transition-all duration-200"
          aria-live="polite"
        >
          {result.total}
        </p>
        <p className="mt-1 text-xs text-stone-400">out of 1,200</p>
      </div>

      <div className="divide-y divide-stone-100 px-5 py-3 text-sm">
        {/* Core */}
        <ScorecardSection
          title="Core / Human capital"
          subtotal={result.coreHumanCapital}
        >
          <Row label="Age" value={d(result.detail, "core.age")} />
          <Row label="Education" value={d(result.detail, "core.education")} />
          <Row label="First official language" value={d(result.detail, "core.firstLanguage")} />
          <Row label="Second official language" value={d(result.detail, "core.secondLanguage")} />
          <Row label="Canadian work experience" value={d(result.detail, "core.canadianWork")} />
        </ScorecardSection>

        {/* Spouse */}
        {hasSpouse && (
          <ScorecardSection
            title="Spouse factors"
            subtotal={result.spouseFactors}
          >
            <Row label="Spouse education" value={d(result.detail, "spouse.education")} />
            <Row label="Spouse language" value={d(result.detail, "spouse.language")} />
            <Row label="Spouse Canadian work" value={d(result.detail, "spouse.canadianWork")} />
          </ScorecardSection>
        )}

        {/* Skill transferability */}
        <ScorecardSection
          title="Skill transferability"
          subtotal={result.skillTransferability}
          note="max 100"
        >
          <Row label="Education combination" value={d(result.detail, "skill.education")} />
          <Row label="Foreign work combination" value={d(result.detail, "skill.foreignWork")} />
          <Row label="Trade certificate" value={d(result.detail, "skill.tradeCertificate")} />
        </ScorecardSection>

        {/* Additional */}
        <ScorecardSection
          title="Additional points"
          subtotal={result.additionalPoints}
        >
          <Row label="Provincial nomination" value={d(result.detail, "add.pnp")} />
          <Row label="French bonus" value={d(result.detail, "add.french")} />
          <Row label="Canadian education" value={d(result.detail, "add.canadianEducation")} />
          <Row label="Sibling in Canada" value={d(result.detail, "add.sibling")} />
        </ScorecardSection>
      </div>
    </div>
  );
}

function ScorecardSection({
  title,
  subtotal,
  note,
  children,
}: {
  title: string;
  subtotal: number;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {title}
        </span>
        <span className="text-sm font-bold tabular-nums text-stone-800">
          {subtotal}
          {note && (
            <span className="ml-1 text-[10px] font-normal text-stone-400">
              ({note})
            </span>
          )}
        </span>
      </div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${value > 0 ? "text-stone-600" : "text-stone-400"}`}>
        {label}
      </span>
      <span
        className={`text-xs tabular-nums ${value > 0 ? "font-medium text-stone-800" : "text-stone-300"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Language band inputs
// ---------------------------------------------------------------------------

function LanguageBandInputs({
  test,
  raw,
  onChange,
}: {
  test: TestType;
  raw: { reading: number; writing: number; speaking: number; listening: number };
  onChange: (v: typeof raw) => void;
}) {
  const isIelts = test === "ielts";
  const step = isIelts ? 0.5 : 1;
  const max = isIelts ? 9 : 12;
  const abilities: ("reading" | "writing" | "speaking" | "listening")[] = [
    "reading", "writing", "speaking", "listening",
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {abilities.map((ab) => {
        const clb = convertToClb(test, ab, raw[ab]);
        return (
          <div key={ab}>
            <label className="block text-xs font-medium capitalize text-stone-600">
              {ab}
            </label>
            <input
              type="number"
              min={0}
              max={max}
              step={step}
              value={raw[ab] || ""}
              onChange={(e) =>
                onChange({ ...raw, [ab]: Number(e.target.value) || 0 })
              }
              className="mt-1 h-9 w-full border border-stone-200 bg-white px-2 text-sm tabular-nums"
            />
            {raw[ab] > 0 && (
              <span className="mt-0.5 block text-[10px] text-stone-400">
                CLB {clb}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared form primitives
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-stone-200 bg-white p-5">
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Select<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-10 w-full border border-stone-200 bg-white px-3 text-sm text-stone-800"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function RadioRow({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer border px-3 py-1.5 text-sm ${
            value === o.value
              ? "border-[var(--navy)] bg-[var(--navy)] text-white"
              : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function NumberSelect({
  max,
  value,
  onChange,
}: {
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const options = Array.from({ length: max + 1 }, (_, i) => ({
    value: String(i),
    label: i === max ? `${i}+` : i === 0 ? "None" : `${i} year${i > 1 ? "s" : ""}`,
  }));
  return (
    <select
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-10 w-full border border-stone-200 bg-white px-3 text-sm text-stone-800"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

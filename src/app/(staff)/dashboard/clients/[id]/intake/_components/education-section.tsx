"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";

import { addEducation, removeEducation, updateEducation } from "../actions";
import { SelectField, TextField } from "./fields";
import { AddRowButton } from "./saving-indicator";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type EducationRow =
  Database["crm"]["Tables"]["client_education_history"]["Row"];
type CountryOption = { code: string; name: string };

const LEVEL_VALUES = [
  "elementary",
  "secondary",
  "post_secondary",
  "trade_other",
] as const;
type EducationLevel = (typeof LEVEL_VALUES)[number];

const LEVEL_LABEL: Record<EducationLevel, string> = {
  elementary: "Elementary",
  secondary: "Secondary",
  post_secondary: "Post-secondary",
  trade_other: "Trade / Other",
};

const LEVEL_OPTIONS: { value: EducationLevel; label: string }[] = LEVEL_VALUES.map(
  (v) => ({ value: v, label: LEVEL_LABEL[v] }),
);

export function EducationSection({
  education,
  countries,
  canEdit,
  client,
}: {
  client: ClientRow;
  education: EducationRow[];
  countries: CountryOption[];
  canEdit: boolean;
}) {
  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name,
  }));

  const summary = computeYearsByLevel(education);

  return (
    <div className="space-y-4">
      <YearsSummary summary={summary} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-stone-700">
          Education
        </h3>
        {education.length === 0 ? (
          <p className="text-sm text-stone-500">No education entries yet.</p>
        ) : (
          <div className="space-y-3">
            {education.map((row) => (
              <EducationRowEditor
                key={row.id}
                row={row}
                countries={countryOptions}
                canEdit={canEdit}
                clientId={client.id}
              />
            ))}
          </div>
        )}
        {canEdit && (
          <AddRowButton
            label="Add education"
            className="mt-3"
            onAdd={() =>
              addEducation({
                clientId: client.id,
                institution: "New institution",
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function YearsSummary({
  summary,
}: {
  summary: Record<EducationLevel, { years: number; entries: number }>;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-stone-700">
        Years of study
      </h3>
      <p className="mb-2 text-xs text-stone-500">
        Auto-calculated from the date ranges below. Add an education entry
        with a level + dates to populate.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LEVEL_VALUES.map((lvl) => {
          const { years, entries } = summary[lvl];
          return (
            <div
              key={lvl}
              className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {LEVEL_LABEL[lvl]}
              </div>
              <div className="mt-0.5 text-base font-semibold tabular-nums text-stone-900">
                {years > 0
                  ? `${years.toFixed(1)} yr${years >= 2 ? "s" : ""}`
                  : "—"}
              </div>
              <div className="text-[11px] text-stone-500">
                {entries === 0
                  ? "no entries"
                  : `${entries} entr${entries === 1 ? "y" : "ies"}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EducationRowEditor({
  row,
  countries,
  canEdit,
  clientId,
}: {
  row: EducationRow;
  countries: { value: string; label: string }[];
  canEdit: boolean;
  clientId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function save<K extends keyof EducationRow>(key: K) {
    return async (value: EducationRow[K] | null) =>
      updateEducation({
        clientId,
        id: row.id,
        patch: { [key]: value } as never,
      });
  }

  function doDelete() {
    startTransition(async () => {
      await removeEducation(clientId, row.id);
    });
  }

  const rowYears = yearsBetween(row.date_from, row.date_to);

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField<EducationLevel>
          label="Level"
          initial={(row.level as EducationLevel | null) ?? null}
          options={LEVEL_OPTIONS}
          save={save("level") as never}
          disabled={!canEdit}
        />
        <TextField
          label="Institution"
          initial={row.institution}
          save={(v) => save("institution")(v ?? "")}
          disabled={!canEdit}
        />
        <TextField
          label="Field of study"
          initial={row.field_of_study}
          save={save("field_of_study")}
          disabled={!canEdit}
        />
        <TextField
          label="From"
          type="date"
          initial={row.date_from}
          save={save("date_from")}
          disabled={!canEdit}
        />
        <TextField
          label="To"
          type="date"
          initial={row.date_to}
          save={save("date_to")}
          disabled={!canEdit}
          helper={
            rowYears !== null ? `${rowYears.toFixed(1)} yrs` : undefined
          }
        />
        <TextField
          label="City"
          initial={row.city}
          save={save("city")}
          disabled={!canEdit}
        />
        <TextField
          label="Province / State"
          initial={row.province_state}
          save={save("province_state")}
          disabled={!canEdit}
        />
        <SelectField
          label="Country"
          initial={row.country_code}
          options={countries}
          save={save("country_code")}
          disabled={!canEdit}
        />
        <TextField
          label="Notes"
          initial={row.notes}
          save={save("notes")}
          disabled={!canEdit}
        />
      </div>
      {canEdit && (
        <div className="mt-3 flex justify-end border-t border-stone-100 pt-3">
          {confirm ? (
            <span className="inline-flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={doDelete}
                disabled={pending}
              >
                Confirm delete
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirm(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirm(true)}
              className="text-destructive hover:bg-red-50 hover:text-destructive"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Years computation. Rounds to one decimal; unknown level + bad ranges
// produce 0. Same logic is used by completeness.ts so move there once a
// second consumer appears.
// ---------------------------------------------------------------------------

function yearsBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return (b - a) / (365.25 * 24 * 60 * 60 * 1000);
}

function computeYearsByLevel(
  rows: EducationRow[],
): Record<EducationLevel, { years: number; entries: number }> {
  const acc: Record<EducationLevel, { years: number; entries: number }> = {
    elementary: { years: 0, entries: 0 },
    secondary: { years: 0, entries: 0 },
    post_secondary: { years: 0, entries: 0 },
    trade_other: { years: 0, entries: 0 },
  };
  for (const row of rows) {
    if (!row.level || !(LEVEL_VALUES as readonly string[]).includes(row.level)) {
      continue;
    }
    const lvl = row.level as EducationLevel;
    acc[lvl].entries += 1;
    const yrs = yearsBetween(row.date_from, row.date_to);
    if (yrs !== null) acc[lvl].years += yrs;
  }
  return acc;
}

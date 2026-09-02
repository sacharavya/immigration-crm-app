"use client";


import type { Database } from "@/lib/supabase/types";

import {
  addEmployment,
  removeEmployment,
  updateEmployment,
} from "../actions";
import { SelectField, TextField } from "./fields";
import { AddRowButton, DeleteRowButton } from "./saving-indicator";

type EmploymentRow =
  Database["crm"]["Tables"]["client_employment_history"]["Row"];
type CountryOption = { code: string; name: string };

const ACTIVITY_OPTIONS = [
  { value: "employment", label: "Employment" },
  { value: "study", label: "Study" },
  { value: "unemployed", label: "Unemployed" },
  { value: "travel", label: "Travel" },
  { value: "detention", label: "Detention" },
  { value: "other", label: "Other" },
];

export function EmploymentSection({
  clientId,
  employment,
  countries,
  canEdit,
}: {
  clientId: string;
  employment: EmploymentRow[];
  countries: CountryOption[];
  canEdit: boolean;
}) {
  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name,
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Cover the past 10 years or since age 18 with no gaps.
      </p>
      {employment.length === 0 ? (
        <p className="text-sm text-stone-500">No entries yet.</p>
      ) : (
        <div className="space-y-3">
          {employment.map((row) => (
            <EmploymentRowEditor
              key={row.id}
              row={row}
              countries={countryOptions}
              canEdit={canEdit}
              clientId={clientId}
            />
          ))}
        </div>
      )}
      {canEdit && (
        <AddRowButton
          label="Add entry"
          onAdd={() => addEmployment({ clientId, occupation: "New entry" })}
        />
      )}
    </div>
  );
}

function EmploymentRowEditor({
  row,
  countries,
  canEdit,
  clientId,
}: {
  row: EmploymentRow;
  countries: { value: string; label: string }[];
  canEdit: boolean;
  clientId: string;
}) {
  function save<K extends keyof EmploymentRow>(key: K) {
    return async (value: EmploymentRow[K] | null) =>
      updateEmployment({
        clientId,
        id: row.id,
        patch: { [key]: value } as never,
      });
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          label="Date from"
          type="date"
          initial={row.date_from}
          save={save("date_from")}
          disabled={!canEdit}
        />
        <TextField
          label="Date to"
          type="date"
          initial={row.date_to}
          save={save("date_to")}
          disabled={!canEdit || row.is_ongoing}
        />
        <SelectField
          label="Activity type"
          initial={row.activity_type}
          options={ACTIVITY_OPTIONS}
          save={save("activity_type")}
          disabled={!canEdit}
        />
        <TextField
          label="Occupation / Title"
          initial={row.occupation}
          save={(v) => save("occupation")(v ?? "")}
          disabled={!canEdit}
        />
        <TextField
          label="Employer / Company"
          initial={row.employer}
          save={save("employer")}
          disabled={!canEdit}
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
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={row.is_ongoing}
            onChange={(e) =>
              save("is_ongoing")(e.target.checked as never)
            }
            disabled={!canEdit}
          />
          Ongoing (no end date)
        </label>
        {canEdit && (
          <div className="ml-auto">
            <DeleteRowButton
              onConfirm={() => removeEmployment(clientId, row.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

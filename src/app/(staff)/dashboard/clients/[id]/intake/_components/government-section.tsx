"use client";

import { useTransition } from "react";

import type { Database } from "@/lib/supabase/types";

import {
  addGovernmentPosition,
  removeGovernmentPosition,
  updateClientCore,
  updateGovernmentPosition,
} from "../actions";
import { SelectField, TextField, YesNoField } from "./fields";
import { AddRowButton, DeleteRowButton } from "./saving-indicator";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type GovRow =
  Database["crm"]["Tables"]["client_government_positions"]["Row"];
type CountryOption = { code: string; name: string };

const JURISDICTION_OPTIONS = [
  { value: "Federal", label: "Federal" },
  { value: "Provincial/State", label: "Provincial / State" },
  { value: "Municipal", label: "Municipal" },
];

export function GovernmentSection({
  client,
  government,
  countries,
  canEdit,
}: {
  client: ClientRow;
  government: GovRow[];
  countries: CountryOption[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name,
  }));

  function setGate(v: boolean) {
    return new Promise<{ ok: true } | { error: string }>((resolve) => {
      startTransition(async () => {
        resolve(
          await updateClientCore({
            clientId: client.id,
            patch: { government_position_held: v } as never,
          }),
        );
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
        <div className="mb-2 text-sm font-medium text-stone-800">
          Has this client held any government positions (civil servant,
          judge, elected official, etc.)?
        </div>
        <YesNoField
          name="gate-gov"
          initial={client.government_position_held}
          onChange={setGate}
          disabled={!canEdit || pending}
        />
        {client.government_position_held === true && government.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Add at least one position.
          </p>
        )}
      </div>

      {client.government_position_held === true && (
        <>
          {government.length === 0 ? (
            <p className="text-sm text-stone-500">No positions yet.</p>
          ) : (
            <div className="space-y-3">
              {government.map((row) => (
                <GovRowEditor
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
              label="Add position"
              onAdd={() => addGovernmentPosition({ clientId: client.id })}
            />
          )}
        </>
      )}
    </div>
  );
}

function GovRowEditor({
  row,
  countries,
  canEdit,
  clientId,
}: {
  row: GovRow;
  countries: { value: string; label: string }[];
  canEdit: boolean;
  clientId: string;
}) {
  function save<K extends keyof GovRow>(key: K) {
    return async (value: GovRow[K] | null) =>
      updateGovernmentPosition({
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
          label="Level of jurisdiction"
          initial={row.level_of_jurisdiction}
          options={JURISDICTION_OPTIONS}
          save={save("level_of_jurisdiction")}
          disabled={!canEdit}
        />
        <TextField
          label="Department"
          initial={row.department}
          save={save("department")}
          disabled={!canEdit}
        />
        <TextField
          label="Position held"
          initial={row.position_held}
          save={save("position_held")}
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
            onChange={(e) => save("is_ongoing")(e.target.checked as never)}
            disabled={!canEdit}
          />
          Ongoing
        </label>
        {canEdit && (
          <div className="ml-auto">
            <DeleteRowButton
              onConfirm={() => removeGovernmentPosition(clientId, row.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

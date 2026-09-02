"use client";

import { useTransition } from "react";

import type { Database } from "@/lib/supabase/types";

import {
  addMilitaryService,
  removeMilitaryService,
  updateClientCore,
  updateMilitaryService,
} from "../actions";
import { SelectField, TextField, TextareaField, YesNoField } from "./fields";
import { AddRowButton, DeleteRowButton } from "./saving-indicator";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type MilRow = Database["crm"]["Tables"]["client_military_services"]["Row"];
type CountryOption = { code: string; name: string };

export function MilitarySection({
  client,
  military,
  countries,
  canEdit,
}: {
  client: ClientRow;
  military: MilRow[];
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
            patch: { military_service_held: v } as never,
          }),
        );
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
        <div className="mb-2 text-sm font-medium text-stone-800">
          Has this client served in any military, militia, or armed group?
        </div>
        <YesNoField
          name="gate-mil"
          initial={client.military_service_held}
          onChange={setGate}
          disabled={!canEdit || pending}
        />
        {client.military_service_held === true && military.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Add at least one service entry.
          </p>
        )}
      </div>

      {client.military_service_held === true && (
        <>
          {military.length === 0 ? (
            <p className="text-sm text-stone-500">No entries yet.</p>
          ) : (
            <div className="space-y-3">
              {military.map((row) => (
                <MilRowEditor
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
              label="Add service entry"
              onAdd={() => addMilitaryService({ clientId: client.id })}
            />
          )}
        </>
      )}
    </div>
  );
}

function MilRowEditor({
  row,
  countries,
  canEdit,
  clientId,
}: {
  row: MilRow;
  countries: { value: string; label: string }[];
  canEdit: boolean;
  clientId: string;
}) {
  function save<K extends keyof MilRow>(key: K) {
    return async (value: MilRow[K] | null) =>
      updateMilitaryService({
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
          label="Country"
          initial={row.country_code}
          options={countries}
          save={save("country_code")}
          disabled={!canEdit}
        />
        <TextField
          label="Branch / Force name"
          initial={row.branch_name}
          save={save("branch_name")}
          disabled={!canEdit}
        />
        <TextField
          label="Commanding officer"
          initial={row.commanding_officer}
          save={save("commanding_officer")}
          disabled={!canEdit}
        />
        <TextField
          label="Rank"
          initial={row.military_rank}
          save={save("military_rank")}
          disabled={!canEdit}
        />
        <TextField
          label="Reason for end of service"
          initial={row.reason_for_end_of_service}
          save={save("reason_for_end_of_service")}
          disabled={!canEdit}
        />
      </div>

      <div className="mt-3">
        <TextareaField
          label="Active combat details (dates and places)"
          initial={row.active_combat_details}
          save={save("active_combat_details")}
          disabled={!canEdit}
          rows={3}
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
              onConfirm={() => removeMilitaryService(clientId, row.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Plus } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";

import {
  addOrganisation,
  removeOrganisation,
  updateClientCore,
  updateOrganisation,
} from "../actions";
import { SelectField, TextField, YesNoField } from "./fields";
import { DeleteRowButton } from "./saving-indicator";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type OrgRow = Database["crm"]["Tables"]["client_organisations"]["Row"];
type CountryOption = { code: string; name: string };

export function OrganisationSection({
  client,
  organisations,
  countries,
  canEdit,
}: {
  client: ClientRow;
  organisations: OrgRow[];
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
            patch: { organisations_member: v } as never,
          }),
        );
      });
    });
  }

  function add() {
    startTransition(async () => {
      await addOrganisation({
        clientId: client.id,
        organisation_name: "New organisation",
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
        <div className="mb-2 text-sm font-medium text-stone-800">
          Is this client a member of any organisations (trade union,
          professional association, political, social, etc.)?
        </div>
        <YesNoField
          name="gate-orgs"
          initial={client.organisations_member}
          onChange={setGate}
          disabled={!canEdit || pending}
        />
        {client.organisations_member === true && organisations.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Add at least one organisation.
          </p>
        )}
      </div>

      {client.organisations_member === true && (
        <>
          {organisations.length === 0 ? (
            <p className="text-sm text-stone-500">No entries yet.</p>
          ) : (
            <div className="space-y-3">
              {organisations.map((row) => (
                <OrgRowEditor
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
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={add}
              disabled={pending}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add organisation
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function OrgRowEditor({
  row,
  countries,
  canEdit,
  clientId,
}: {
  row: OrgRow;
  countries: { value: string; label: string }[];
  canEdit: boolean;
  clientId: string;
}) {
  function save<K extends keyof OrgRow>(key: K) {
    return async (value: OrgRow[K] | null) =>
      updateOrganisation({
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
        <TextField
          label="Organisation name"
          initial={row.organisation_name}
          save={(v) => save("organisation_name")(v ?? "")}
          disabled={!canEdit}
        />
        <TextField
          label="Type"
          initial={row.organisation_type}
          save={save("organisation_type")}
          disabled={!canEdit}
          placeholder="trade union, association, political…"
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
              onConfirm={() => removeOrganisation(clientId, row.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

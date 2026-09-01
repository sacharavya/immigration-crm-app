"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Database } from "@/lib/supabase/types";

import {
  addTravel,
  removeTravel,
  updateClientCore,
  updateTravel,
} from "../actions";
import { SelectField, TextField } from "./fields";
import { YesNoField } from "./fields";
import { DeleteRowButton } from "./saving-indicator";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type TravelRow = Database["crm"]["Tables"]["client_travel_history"]["Row"];
type CountryOption = { code: string; name: string };

export function TravelSection({
  client,
  travel,
  countries,
  canEdit,
}: {
  client: ClientRow;
  travel: TravelRow[];
  countries: CountryOption[];
  canEdit: boolean;
}) {
  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name,
  }));
  const [pending, startTransition] = useTransition();

  function setGate(v: boolean) {
    return new Promise<{ ok: true } | { error: string }>((resolve) => {
      startTransition(async () => {
        resolve(
          await updateClientCore({
            clientId: client.id,
            patch: { travel_completed: v } as never,
          }),
        );
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
        <div className="mb-2 text-sm font-medium text-stone-800">
          Has this client travelled outside their country of residence?
        </div>
        <YesNoField
          initial={client.travel_completed}
          onChange={setGate}
          disabled={!canEdit || pending}
          name="gate-travel"
        />
        {client.travel_completed === true && travel.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">Add at least one trip.</p>
        )}
      </div>

      {client.travel_completed === true && (
        <>
          {travel.length === 0 ? (
            <p className="text-sm text-stone-500">No trips yet.</p>
          ) : (
            <div className="space-y-3">
              {travel.map((row) => (
                <TravelRowEditor
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
            <AddTravelTrigger clientId={client.id} disabled={pending} />
          )}
        </>
      )}
    </div>
  );
}

// Travel rows have NOT NULL date_from and date_to columns, so the row must
// be created with valid dates upfront — unlike the other sections that
// can stub a row with placeholder text.
function AddTravelTrigger({
  clientId,
  disabled,
}: {
  clientId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    if (!from || !to) {
      setError("Pick a start and end date.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await addTravel({ clientId, date_from: from, date_to: to });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setFrom("");
      setTo("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add trip
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Date from
          </label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Date to
          </label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            size="sm"
            onClick={add}
            disabled={pending || !from || !to}
          >
            Add
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function TravelRowEditor({
  row,
  countries,
  canEdit,
  clientId,
}: {
  row: TravelRow;
  countries: { value: string; label: string }[];
  canEdit: boolean;
  clientId: string;
}) {
  function save<K extends keyof TravelRow>(key: K) {
    return async (value: TravelRow[K] | null) =>
      updateTravel({
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
          save={(v) => save("date_from")(v ?? "")}
          disabled={!canEdit}
        />
        <TextField
          label="Date to"
          type="date"
          initial={row.date_to}
          save={(v) => save("date_to")(v ?? "")}
          disabled={!canEdit}
        />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Days
          </label>
          <p className="mt-1 text-sm tabular-nums text-stone-700">
            {row.days ?? "—"}
          </p>
        </div>
        <TextField
          label="City"
          initial={row.city}
          save={save("city")}
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
          label="Purpose"
          initial={row.purpose}
          save={save("purpose")}
          disabled={!canEdit}
        />
      </div>
      {canEdit && (
        <div className="mt-3 flex justify-end border-t border-stone-100 pt-3">
          <DeleteRowButton onConfirm={() => removeTravel(clientId, row.id)} />
        </div>
      )}
    </div>
  );
}

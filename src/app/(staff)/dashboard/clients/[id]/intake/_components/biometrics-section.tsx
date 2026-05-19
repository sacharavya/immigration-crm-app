"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Database } from "@/lib/supabase/types";

import {
  addBiometricRecord,
  removeBiometricRecord,
  updateBiometricRecord,
  updateClientCore,
} from "../actions";
import { TextField, YesNoField } from "./fields";
import { DeleteRowButton } from "./saving-indicator";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type BiometricRow =
  Database["crm"]["Tables"]["client_biometric_records"]["Row"];

export function BiometricsSection({
  client,
  records,
  canEdit,
}: {
  client: ClientRow;
  records: BiometricRow[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function setGate(v: boolean) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        await updateClientCore({
          clientId: client.id,
          patch: { has_prior_biometrics: v } as never,
        });
        resolve();
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
        <div className="mb-2 text-sm font-medium text-stone-800">
          Has this client given biometrics before?
        </div>
        <YesNoField
          initial={client.has_prior_biometrics}
          onChange={setGate}
          disabled={!canEdit || pending}
          name="gate-biometrics"
        />
        {client.has_prior_biometrics === true && records.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Add at least one biometric record.
          </p>
        )}
      </div>

      {client.has_prior_biometrics === true && (
        <>
          {records.length === 0 ? (
            <p className="text-sm text-stone-500">No prior records yet.</p>
          ) : (
            <div className="space-y-3">
              {records.map((row) => (
                <BiometricRowEditor
                  key={row.id}
                  row={row}
                  canEdit={canEdit}
                  clientId={client.id}
                />
              ))}
            </div>
          )}
          {canEdit && (
            <AddBiometricTrigger clientId={client.id} disabled={pending} />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline add form. Mirrors the travel-section's AddTravelTrigger pattern —
// open the form, fill required fields, save. valid_until auto-fills to
// date_given + 10 years (matching the server-side default) but stays
// editable.
// ---------------------------------------------------------------------------

function AddBiometricTrigger({
  clientId,
  disabled,
}: {
  clientId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dateGiven, setDateGiven] = useState("");
  const [location, setLocation] = useState("");
  const [bvn, setBvn] = useState("");
  const [context, setContext] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDateChange(v: string) {
    setDateGiven(v);
    // Auto-fill valid_until if the user hasn't typed their own value yet.
    if (v && !validUntil) {
      const d = new Date(`${v}T00:00:00Z`);
      d.setUTCFullYear(d.getUTCFullYear() + 10);
      setValidUntil(d.toISOString().slice(0, 10));
    }
  }

  function add() {
    if (!dateGiven) {
      setError("Pick the date this happened.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await addBiometricRecord({
        clientId,
        date_given: dateGiven,
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(bvn.trim() ? { bvn_or_reference: bvn.trim() } : {}),
        ...(context.trim() ? { application_context: context.trim() } : {}),
        ...(validUntil ? { valid_until: validUntil } : {}),
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setDateGiven("");
      setLocation("");
      setBvn("");
      setContext("");
      setValidUntil("");
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
        Add biometric record
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Date given
          </label>
          <Input
            type="date"
            value={dateGiven}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Valid until
          </label>
          <Input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Location
          </label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., VAC Kathmandu, ASC Toronto"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            BVN / IRCC reference
          </label>
          <Input value={bvn} onChange={(e) => setBvn(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Application context
          </label>
          <Input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g., Study Permit 2022"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={add}
          disabled={pending || !dateGiven}
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
        {error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline row editor. Each TextField autosaves on debounce; matches the
// pattern from travel-section.
// ---------------------------------------------------------------------------

function BiometricRowEditor({
  row,
  canEdit,
  clientId,
}: {
  row: BiometricRow;
  canEdit: boolean;
  clientId: string;
}) {
  function save<K extends keyof BiometricRow>(key: K) {
    return async (value: BiometricRow[K] | null) =>
      updateBiometricRecord({
        clientId,
        id: row.id,
        patch: { [key]: value } as never,
      });
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          label="Date given"
          type="date"
          initial={row.date_given}
          save={(v) => save("date_given")(v ?? "")}
          disabled={!canEdit}
        />
        <TextField
          label="Valid until"
          type="date"
          initial={row.valid_until}
          save={save("valid_until")}
          disabled={!canEdit}
        />
        <TextField
          label="Location"
          initial={row.location}
          save={save("location")}
          disabled={!canEdit}
        />
        <TextField
          label="BVN / IRCC reference"
          initial={row.bvn_or_reference}
          save={save("bvn_or_reference")}
          disabled={!canEdit}
        />
        <TextField
          label="Application context"
          initial={row.application_context}
          save={save("application_context")}
          disabled={!canEdit}
        />
        <TextField
          label="Biometrics type"
          initial={row.biometrics_type}
          save={save("biometrics_type")}
          disabled={!canEdit}
          placeholder="Fingerprints + Photo"
        />
      </div>
      {canEdit && (
        <div className="mt-3 flex justify-end border-t border-stone-100 pt-3">
          <DeleteRowButton
            onConfirm={() => removeBiometricRecord(clientId, row.id)}
          />
        </div>
      )}
    </div>
  );
}

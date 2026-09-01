"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";

import {
  addFamilyMember,
  removeFamilyMember,
  updateClientCore,
  updateFamilyMember,
} from "../actions";
import { SelectField, TextField, YesNoField } from "./fields";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type FamilyRow = Database["crm"]["Tables"]["client_family_members"]["Row"];
type CountryOption = { code: string; name: string };
type RelationshipKind =
  Database["crm"]["Enums"]["relationship_type"];

type Mode = "parents_spouse" | "children" | "siblings";

const PARENT_REL: RelationshipKind[] = [
  "father",
  "mother",
  "spouse",
  "common_law_partner",
];
const CHILDREN_REL: RelationshipKind[] = [
  "son",
  "daughter",
  "step_son",
  "step_daughter",
  "adopted_son",
  "adopted_daughter",
];
const SIBLING_REL: RelationshipKind[] = [
  "brother",
  "sister",
  "half_brother",
  "half_sister",
  "step_brother",
  "step_sister",
];

const RELATIONSHIP_LABEL: Record<RelationshipKind, string> = {
  father: "Father",
  mother: "Mother",
  spouse: "Spouse",
  common_law_partner: "Common-law partner",
  son: "Son",
  daughter: "Daughter",
  step_son: "Step son",
  step_daughter: "Step daughter",
  adopted_son: "Adopted son",
  adopted_daughter: "Adopted daughter",
  brother: "Brother",
  sister: "Sister",
  half_brother: "Half brother",
  half_sister: "Half sister",
  step_brother: "Step brother",
  step_sister: "Step sister",
  guardian: "Guardian",
  other: "Other",
};

const MARITAL_OPTIONS = [
  { value: "single" as const, label: "Single" },
  { value: "married" as const, label: "Married" },
  { value: "common_law" as const, label: "Common-law" },
  { value: "divorced" as const, label: "Divorced" },
  { value: "widowed" as const, label: "Widowed" },
  { value: "separated" as const, label: "Separated" },
  { value: "annulled" as const, label: "Annulled" },
];

export function FamilySection({
  mode,
  client,
  family,
  countries,
  canEdit,
}: {
  mode: Mode;
  client: ClientRow;
  family: FamilyRow[];
  countries: CountryOption[];
  canEdit: boolean;
}) {
  const allowedRelationships =
    mode === "parents_spouse"
      ? PARENT_REL
      : mode === "children"
      ? CHILDREN_REL
      : SIBLING_REL;

  const visible = family.filter((f) =>
    allowedRelationships.includes(f.relationship),
  );

  const showGate = mode !== "parents_spouse";
  const gateValue =
    mode === "children" ? client.has_children : client.has_siblings;
  const gateField =
    mode === "children" ? "has_children" : "has_siblings";

  const showTable = mode === "parents_spouse" ? true : gateValue === true;

  const [pending, startTransition] = useTransition();

  function setGate(v: boolean) {
    return new Promise<{ ok: true } | { error: string }>((resolve) => {
      startTransition(async () => {
        resolve(
          await updateClientCore({
            clientId: client.id,
            patch: { [gateField]: v } as never,
          }),
        );
      });
    });
  }

  function add(defaultRelationship: RelationshipKind) {
    startTransition(async () => {
      await addFamilyMember({
        clientId: client.id,
        relationship: defaultRelationship,
        full_name: "New entry",
      });
    });
  }

  return (
    <div className="space-y-4">
      {showGate && (
        <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
          <div className="mb-2 text-sm font-medium text-stone-800">
            {mode === "children"
              ? "Does this client have children?"
              : "Does this client have siblings?"}
          </div>
          <YesNoField
            initial={gateValue}
            onChange={setGate}
            disabled={!canEdit || pending}
            name={`gate-${mode}`}
          />
          {gateValue === true && visible.length === 0 && (
            <p className="mt-2 text-xs text-amber-700">
              Add at least one {mode === "children" ? "child" : "sibling"}.
            </p>
          )}
        </div>
      )}

      {showTable && (
        <>
          {visible.length === 0 ? (
            <p className="text-sm text-stone-500">No entries yet.</p>
          ) : (
            <div className="space-y-3">
              {visible.map((row) => (
                <FamilyRowEditor
                  key={row.id}
                  row={row}
                  allowedRelationships={allowedRelationships}
                  countries={countries}
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
              onClick={() => add(allowedRelationships[0])}
              disabled={pending}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add{" "}
              {mode === "parents_spouse"
                ? "family member"
                : mode === "children"
                ? "child"
                : "sibling"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function FamilyRowEditor({
  row,
  allowedRelationships,
  countries,
  canEdit,
  clientId,
}: {
  row: FamilyRow;
  allowedRelationships: RelationshipKind[];
  countries: CountryOption[];
  canEdit: boolean;
  clientId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name,
  }));
  const relOptions = allowedRelationships.map((r) => ({
    value: r,
    label: RELATIONSHIP_LABEL[r],
  }));

  function save<K extends keyof FamilyRow>(key: K) {
    return async (value: FamilyRow[K] | null) => {
      return updateFamilyMember({
        clientId,
        id: row.id,
        patch: { [key]: value } as never,
      });
    };
  }

  function doDelete() {
    startTransition(async () => {
      await removeFamilyMember(clientId, row.id);
    });
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          label="Relationship"
          initial={row.relationship}
          options={relOptions}
          allowEmpty={false}
          save={(v) => save("relationship")(v as RelationshipKind)}
          disabled={!canEdit}
        />
        <TextField
          label="Full name"
          initial={row.full_name}
          save={(v) => save("full_name")(v ?? "")}
          disabled={!canEdit}
        />
        <SelectField
          label="Marital status"
          initial={row.marital_status}
          options={MARITAL_OPTIONS}
          save={save("marital_status")}
          disabled={!canEdit}
        />
        <TextField
          label="Date of birth"
          type="date"
          initial={row.date_of_birth}
          save={save("date_of_birth")}
          disabled={!canEdit}
        />
        <SelectField
          label="Country of birth"
          initial={row.country_of_birth}
          options={countryOptions}
          save={save("country_of_birth")}
          disabled={!canEdit}
        />
        <TextField
          label="Present address"
          initial={row.present_address}
          save={save("present_address")}
          disabled={!canEdit}
        />
        <TextField
          label="Present occupation"
          initial={row.present_occupation}
          save={save("present_occupation")}
          disabled={!canEdit}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-stone-100 pt-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.is_deceased}
            onChange={(e) =>
              save("is_deceased")(e.target.checked as never)
            }
            disabled={!canEdit}
          />
          Deceased
        </label>
        {row.is_deceased && (
          <div className="min-w-[180px]">
            <TextField
              label="Date of death"
              type="date"
              initial={row.deceased_date}
              save={save("deceased_date")}
              disabled={!canEdit}
            />
          </div>
        )}
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.accompanying_to_canada ?? false}
            onChange={(e) =>
              save("accompanying_to_canada")(e.target.checked as never)
            }
            disabled={!canEdit}
          />
          Accompanying to Canada
        </label>

        <div className="ml-auto">
          {canEdit && (
            <>
              {confirmDelete ? (
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
                    onClick={() => setConfirmDelete(false)}
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
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive hover:bg-red-50 hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

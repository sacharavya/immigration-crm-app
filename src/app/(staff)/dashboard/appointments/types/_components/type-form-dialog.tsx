"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createAppointmentType, updateAppointmentType } from "../actions";

const PREP_PLACEHOLDER = `What we'll cover:
- Your current immigration status and goals
- The pathway that fits your situation best
- Required documents and timeline

What to bring:
- Passport
- Any prior IRCC correspondence

What you'll leave with:
- Written summary of next steps
- Quote for our services`;

export type TypeFormInput = {
  id?: string;
  name: string;
  code: string;
  duration_minutes: number;
  default_location_type: "online" | "onsite";
  description: string;
  preparation_notes: string | null;
  is_public: boolean;
  requires_case: boolean;
  fee_cad: number | null;
  display_order: number;
};

const EMPTY: TypeFormInput = {
  name: "",
  code: "",
  duration_minutes: 30,
  default_location_type: "online",
  description: "",
  preparation_notes: null,
  is_public: false,
  requires_case: false,
  fee_cad: null,
  display_order: 100,
};

function codeFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export function TypeFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: TypeFormInput;
}) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState<TypeFormInput>(initial ?? EMPTY);
  const [codeTouched, setCodeTouched] = useState(isEdit);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial ?? EMPTY);
      setCodeTouched(Boolean(initial?.id));
      setError(null);
    }
  }, [open, initial]);

  // Auto-derive code from name until the user touches it (or we're editing).
  const derivedCode = useMemo(() => codeFromName(form.name), [form.name]);
  const effectiveCode = codeTouched ? form.code : derivedCode;

  function update<K extends keyof TypeFormInput>(key: K, value: TypeFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!form.name.trim()) return setError("Name is required.");
    if (!form.description.trim())
      return setError("Short description is required.");
    if (!effectiveCode) return setError("Code is required.");

    setError(null);
    startTransition(async () => {
      const payload: TypeFormInput = {
        ...form,
        code: effectiveCode,
        preparation_notes: form.preparation_notes?.trim() || null,
        fee_cad: form.fee_cad === null || isNaN(form.fee_cad) ? null : form.fee_cad,
      };
      const result = isEdit
        ? await updateAppointmentType({
            id: initial!.id,
            name: payload.name,
            duration_minutes: payload.duration_minutes,
            default_location_type: payload.default_location_type,
            description: payload.description,
            preparation_notes: payload.preparation_notes,
            is_public: payload.is_public,
            requires_case: payload.requires_case,
            fee_cad: payload.fee_cad,
            display_order: payload.display_order,
          })
        : await createAppointmentType({
            name: payload.name,
            code: payload.code,
            duration_minutes: payload.duration_minutes,
            default_location_type: payload.default_location_type,
            description: payload.description,
            preparation_notes: payload.preparation_notes,
            is_public: payload.is_public,
            requires_case: payload.requires_case,
            fee_cad: payload.fee_cad,
            display_order: payload.display_order,
          });
      if ("error" in result) return setError(result.error);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit appointment type" : "New appointment type"}
          </DialogTitle>
          <DialogDescription>
            Types control what staff can schedule and (when made public) what
            prospects see at /book-an-appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Initial Consultation"
            />
          </Field>

          <Field
            label={isEdit ? "Code (locked after create)" : "Code"}
            helper="Lowercase letters, numbers, underscores."
          >
            <Input
              value={effectiveCode}
              onChange={(e) => {
                setCodeTouched(true);
                update("code", e.target.value.toLowerCase());
              }}
              disabled={isEdit}
              placeholder="consult"
            />
          </Field>

          <Field label="Duration (minutes)">
            <Input
              type="number"
              min={15}
              max={240}
              value={form.duration_minutes}
              onChange={(e) =>
                update("duration_minutes", parseInt(e.target.value || "0", 10))
              }
            />
          </Field>

          <Field label="Default location">
            <div className="flex gap-2">
              {(["online", "onsite"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update("default_location_type", opt)}
                  className={`h-9 rounded-md border px-3 text-sm capitalize ${
                    form.default_location_type === opt
                      ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                      : "border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Field>

          <div className="sm:col-span-2">
            <FieldHeader
              label="Short description"
              helper="Shown on the public booking card and in scheduling dropdowns. One sentence."
            />
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
              maxLength={200}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <FieldHeader
              label="What to expect (optional)"
              helper="Shown to prospects after they pick this type AND on the staff appointment detail so the RCIC can prep. Use bullets to keep it scannable."
            />
            <textarea
              value={form.preparation_notes ?? ""}
              onChange={(e) => update("preparation_notes", e.target.value)}
              rows={8}
              maxLength={2000}
              placeholder={PREP_PLACEHOLDER}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 font-mono text-[13px] leading-snug"
            />
          </div>

          {/* APPT-7: is_public and requires_case are mutually exclusive.
              The DB CHECK (20260531000002) enforces the invariant; here
              we surface it as cross-disabling toggles so the inconsistent
              combination can't be entered in the first place. */}
          <label
            className={`flex items-start gap-2 text-sm sm:col-span-2 ${
              form.requires_case ? "opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={form.is_public}
              disabled={form.requires_case}
              onChange={(e) => update("is_public", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-300"
            />
            <span>
              <span className="font-medium text-stone-700">Show on public booking page</span>
              <span className="block text-xs text-stone-500">
                {form.requires_case
                  ? "Disabled — case-required types cannot be public."
                  : "When unchecked, this type is internal-only."}
              </span>
            </span>
          </label>

          <label
            className={`flex items-start gap-2 text-sm sm:col-span-2 ${
              form.is_public ? "opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={form.requires_case}
              disabled={form.is_public}
              onChange={(e) => update("requires_case", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-300"
            />
            <span>
              <span className="font-medium text-stone-700">Requires a linked case</span>
              <span className="block text-xs text-stone-500">
                {form.is_public
                  ? "Disabled — public types cannot require a case."
                  : "Cannot be booked without selecting an existing case."}
              </span>
            </span>
          </label>

          <Field
            label="Fee (CAD, optional)"
            helper="Leave blank or 0 for free. Shown to prospects on the booking page if set."
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.fee_cad ?? ""}
              onChange={(e) =>
                update(
                  "fee_cad",
                  e.target.value === "" ? null : parseFloat(e.target.value),
                )
              }
              placeholder="0"
            />
          </Field>

          <Field
            label="Display order"
            helper="Lower numbers appear first."
          >
            <Input
              type="number"
              min={0}
              value={form.display_order}
              onChange={(e) =>
                update("display_order", parseInt(e.target.value || "0", 10))
              }
            />
          </Field>
        </div>

        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Create type"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldHeader({
  label,
  helper,
}: {
  label: string;
  helper?: string;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </Label>
      {helper && (
        <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
          {helper}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldHeader label={label} helper={helper} />
      <div className="mt-1">{children}</div>
    </div>
  );
}

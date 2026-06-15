"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { splitLegalName } from "@/lib/clients/name";
import {
  newClientSchema,
  type NewClientInput,
} from "@/lib/validators/case";

import { createClientStandalone } from "../../actions";

type CountryOption = { code: string; name: string };

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "common_law", label: "Common-law" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "annulled", label: "Annulled" },
] as const;

const PREFERRED_CONTACT_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

export function NewClientForm({ countries }: { countries: CountryOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<NewClientInput>({
    legal_name_full: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Track whether staff has manually edited the given/family fields.
  // While untouched, they live-mirror the auto-split of legal_name_full;
  // once edited the override sticks.
  const [givenTouched, setGivenTouched] = useState(false);
  const [familyTouched, setFamilyTouched] = useState(false);

  // Trim-on-blur happens via state inline.
  function update<K extends keyof NewClientInput>(
    key: K,
    value: string,
  ) {
    setForm((prev) => {
      const trimmedToUndefined =
        value.trim() === "" ? undefined : value;
      return {
        ...prev,
        [key]: trimmedToUndefined as NewClientInput[K],
      };
    });
  }

  // Auto-mirror given/family from legal_name_full while staff hasn't
  // explicitly typed in either name field. Once they touch a name
  // field their value wins and the mirror stops for that field.
  const derived = useMemo(
    () => splitLegalName(form.legal_name_full ?? ""),
    [form.legal_name_full],
  );
  const displayedGiven = givenTouched
    ? (form.given_names ?? "")
    : (derived.given_names ?? "");
  const displayedFamily = familyTouched
    ? (form.family_name ?? "")
    : (derived.family_name ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    // For unmodified given/family, send the derived value so the
    // server doesn't have to re-derive (and so the visible value
    // matches what gets persisted).
    const payload: NewClientInput = {
      ...form,
      given_names: givenTouched
        ? form.given_names
        : (derived.given_names ?? undefined),
      family_name: familyTouched
        ? form.family_name
        : (derived.family_name ?? undefined),
    };

    const parsed = newClientSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const result = await createClientStandalone(parsed.data);
      if ("error" in result) {
        setSubmitError(result.error);
        return;
      }
      router.push(`/dashboard/clients/${result.id}/intake`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Identity">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            id="legal_name_full"
            label="Legal name (full)"
            value={form.legal_name_full ?? ""}
            onChange={(v) => update("legal_name_full", v)}
            error={fieldErrors.legal_name_full}
            required
            autoFocus
          />
          <TextField
            id="preferred_name"
            label="Preferred name"
            value={form.preferred_name ?? ""}
            onChange={(v) => update("preferred_name", v)}
          />
          <div className="hidden lg:block" />
          <TextField
            id="given_names"
            label="Given names (first)"
            value={displayedGiven}
            onChange={(v) => {
              setGivenTouched(true);
              update("given_names", v);
            }}
            hint={
              !givenTouched && derived.given_names
                ? "Auto-derived from legal name"
                : undefined
            }
          />
          <TextField
            id="family_name"
            label="Family name (last)"
            value={displayedFamily}
            onChange={(v) => {
              setFamilyTouched(true);
              update("family_name", v);
            }}
            hint={
              !familyTouched && derived.family_name
                ? "Auto-derived from legal name"
                : undefined
            }
          />
          <TextField
            id="date_of_birth"
            label="Date of birth"
            type="date"
            value={form.date_of_birth ?? ""}
            onChange={(v) => update("date_of_birth", v)}
            error={fieldErrors.date_of_birth}
          />
          <SelectField
            id="gender"
            label="Gender"
            value={form.gender ?? ""}
            onChange={(v) => update("gender", v)}
            options={GENDER_OPTIONS}
          />
          <SelectField
            id="marital_status"
            label="Marital status"
            value={form.marital_status ?? ""}
            onChange={(v) => update("marital_status", v)}
            options={MARITAL_OPTIONS}
          />
        </div>
      </FormSection>

      <FormSection title="Citizenship & residence">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            id="country_of_birth"
            label="Country of birth"
            value={form.country_of_birth ?? ""}
            onChange={(v) => update("country_of_birth", v)}
            options={countries.map((c) => ({ value: c.code, label: c.name }))}
          />
          <SelectField
            id="country_of_citizenship"
            label="Country of citizenship"
            value={form.country_of_citizenship ?? ""}
            onChange={(v) => update("country_of_citizenship", v)}
            options={countries.map((c) => ({ value: c.code, label: c.name }))}
          />
          <SelectField
            id="country_of_residence"
            label="Country of residence"
            value={form.country_of_residence ?? ""}
            onChange={(v) => update("country_of_residence", v)}
            options={countries.map((c) => ({ value: c.code, label: c.name }))}
            hint="Drives the HST default on the retainer (CA = HST applies)"
          />
        </div>
      </FormSection>

      <FormSection title="Contact">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            id="preferred_language"
            label="Preferred language"
            value={form.preferred_language ?? ""}
            onChange={(v) => update("preferred_language", v)}
            placeholder="e.g. en, fr, hi"
          />
          <SelectField
            id="preferred_contact"
            label="Preferred contact"
            value={form.preferred_contact ?? ""}
            onChange={(v) => update("preferred_contact", v)}
            options={PREFERRED_CONTACT_OPTIONS}
          />
          <div className="hidden lg:block" />
          <TextField
            id="email"
            label="Email"
            type="email"
            value={form.email ?? ""}
            onChange={(v) => update("email", v)}
            error={fieldErrors.email}
          />
          <TextField
            id="phone_primary"
            label="Phone"
            type="tel"
            value={form.phone_primary ?? ""}
            onChange={(v) => update("phone_primary", v)}
          />
          <TextField
            id="phone_whatsapp"
            label="WhatsApp"
            type="tel"
            value={form.phone_whatsapp ?? ""}
            onChange={(v) => update("phone_whatsapp", v)}
          />
        </div>
      </FormSection>

      <FormSection title="Mailing address">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            id="address_line1"
            label="Address line 1"
            value={form.address_line1 ?? ""}
            onChange={(v) => update("address_line1", v)}
          />
          <TextField
            id="address_line2"
            label="Address line 2"
            value={form.address_line2 ?? ""}
            onChange={(v) => update("address_line2", v)}
          />
          <TextField
            id="city"
            label="City"
            value={form.city ?? ""}
            onChange={(v) => update("city", v)}
          />
          <TextField
            id="province_state"
            label="Province / State"
            value={form.province_state ?? ""}
            onChange={(v) => update("province_state", v)}
          />
          <TextField
            id="postal_code"
            label="Postal code"
            value={form.postal_code ?? ""}
            onChange={(v) => update("postal_code", v)}
          />
          <SelectField
            id="country_code"
            label="Country"
            value={form.country_code ?? ""}
            onChange={(v) => update("country_code", v)}
            options={countries.map((c) => ({ value: c.code, label: c.name }))}
          />
        </div>
      </FormSection>

      {submitError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {submitError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/clients")}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create client"}
        </Button>
      </div>
    </form>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        {title}
      </h3>
      <FieldGroup>{children}</FieldGroup>
    </section>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  required,
  autoFocus,
  hint,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string[];
  type?: string;
  required?: boolean;
  autoFocus?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
      />
      {hint && !error && (
        <p className="text-xs text-stone-500">{hint}</p>
      )}
      {error && (
        <FieldError errors={error.map((m) => ({ message: m }))} />
      )}
    </Field>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  hint?: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </Field>
  );
}

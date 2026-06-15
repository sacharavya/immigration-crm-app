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

export function NewClientForm({ countries }: { countries: CountryOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<NewClientInput>({
    legal_name_full: "",
    email: undefined,
    phone_primary: undefined,
    phone_whatsapp: undefined,
    country_of_citizenship: undefined,
    date_of_birth: undefined,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof NewClientInput>(
    key: K,
    value: NewClientInput[K] | string,
  ) {
    setForm((prev) => ({
      ...prev,
      [key]:
        typeof value === "string" && value.trim() === ""
          ? undefined
          : (value as NewClientInput[K]),
    }));
  }

  // Surface the derived split so staff can spot when the auto rule
  // would get something wrong (e.g. compound family names) BEFORE
  // submitting. Server applies the same split on insert.
  const derivedSplit = useMemo(
    () => splitLegalName(form.legal_name_full ?? ""),
    [form.legal_name_full],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsed = newClientSchema.safeParse(form);
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
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="legal_name_full">Full legal name</FieldLabel>
          <Input
            id="legal_name_full"
            value={form.legal_name_full ?? ""}
            onChange={(e) => update("legal_name_full", e.target.value)}
            aria-invalid={Boolean(fieldErrors.legal_name_full)}
            autoFocus
          />
          {fieldErrors.legal_name_full && (
            <FieldError
              errors={fieldErrors.legal_name_full.map((m) => ({ message: m }))}
            />
          )}
          {derivedSplit.given_names && (
            <p className="text-xs text-stone-500">
              Will save as: First name{" "}
              <span className="font-medium text-stone-700">
                {derivedSplit.given_names}
              </span>
              {derivedSplit.family_name && (
                <>
                  {" "}· Last name{" "}
                  <span className="font-medium text-stone-700">
                    {derivedSplit.family_name}
                  </span>
                </>
              )}
              . Edit on the client&rsquo;s intake page if the auto-split
              is wrong.
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && (
            <FieldError
              errors={fieldErrors.email.map((m) => ({ message: m }))}
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="phone_primary">Phone</FieldLabel>
            <Input
              id="phone_primary"
              value={form.phone_primary ?? ""}
              onChange={(e) => update("phone_primary", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone_whatsapp">WhatsApp</FieldLabel>
            <Input
              id="phone_whatsapp"
              value={form.phone_whatsapp ?? ""}
              onChange={(e) => update("phone_whatsapp", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="country_of_citizenship">
              Country of citizenship
            </FieldLabel>
            <select
              id="country_of_citizenship"
              value={form.country_of_citizenship ?? ""}
              onChange={(e) => update("country_of_citizenship", e.target.value)}
              className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
            >
              <option value="">—</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="date_of_birth">Date of birth</FieldLabel>
            <Input
              id="date_of_birth"
              type="date"
              value={form.date_of_birth ?? ""}
              onChange={(e) => update("date_of_birth", e.target.value)}
              aria-invalid={Boolean(fieldErrors.date_of_birth)}
            />
            {fieldErrors.date_of_birth && (
              <FieldError
                errors={fieldErrors.date_of_birth.map((m) => ({ message: m }))}
              />
            )}
          </Field>
        </div>

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
      </FieldGroup>
    </form>
  );
}

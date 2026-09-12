"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { registerClient } from "../actions";

const selectClass =
  "h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30";

type Country = { code: string; name: string };

export function NewClientForm({ countries }: { countries: Country[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      legal_name_full: fd.get("legal_name_full"),
      email: fd.get("email"),
      phone_primary: fd.get("phone_primary"),
      country_of_citizenship: fd.get("country_of_citizenship"),
      country_of_residence: fd.get("country_of_residence"),
      notes: fd.get("notes"),
    };

    startTransition(async () => {
      const result = await registerClient(payload);
      if ("error" in result) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      router.push("/portal");
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="legal_name_full">Full legal name</FieldLabel>
          <Input
            id="legal_name_full"
            name="legal_name_full"
            required
            aria-invalid={Boolean(fieldErrors.legal_name_full)}
          />
          {fieldErrors.legal_name_full && (
            <FieldError
              errors={fieldErrors.legal_name_full.map((m) => ({ message: m }))}
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <FieldError
                errors={fieldErrors.email.map((m) => ({ message: m }))}
              />
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="phone_primary">Phone</FieldLabel>
            <Input id="phone_primary" name="phone_primary" />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="country_of_citizenship">
              Country of citizenship
            </FieldLabel>
            <select
              id="country_of_citizenship"
              name="country_of_citizenship"
              defaultValue=""
              className={selectClass}
            >
              <option value="">Select…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="country_of_residence">
              Country of residence
            </FieldLabel>
            <select
              id="country_of_residence"
              name="country_of_residence"
              defaultValue=""
              className={selectClass}
            >
              <option value="">Select…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
          />
          <FieldDescription>
            Anything the genzdatalabs Immigration team should know about this referral.
          </FieldDescription>
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </FieldGroup>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/portal")}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Registering…
            </>
          ) : (
            "Register client"
          )}
        </Button>
      </div>
    </form>
  );
}

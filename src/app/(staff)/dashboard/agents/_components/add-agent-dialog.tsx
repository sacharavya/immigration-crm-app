"use client";

import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AGENT_TYPE_LABEL, AGENT_TYPES } from "@/lib/validators/agent";

import { addAgent } from "../actions";

const selectClass =
  "h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30";

type Country = { code: string; name: string };

export function AddAgentDialog({ countries }: { countries: Country[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState<{
    tempPassword: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setError(null);
    setFieldErrors({});
    setSuccess(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      organization: fd.get("organization"),
      email: fd.get("email"),
      agent_type: fd.get("agent_type"),
      phone: fd.get("phone"),
      website: fd.get("website"),
      country_code: fd.get("country_code"),
      commission_terms: fd.get("commission_terms"),
      notes: fd.get("notes"),
    };

    startTransition(async () => {
      const result = await addAgent(payload);
      if ("error" in result) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      setSuccess({
        tempPassword: result.tempPassword,
        emailSent: result.emailSent,
        emailError: result.emailError,
      });
    });
  }

  return (
    <>
      <Button onClick={() => handleOpenChange(true)}>+ Add agent</Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          {success ? (
            <SuccessView
              tempPassword={success.tempPassword}
              emailSent={success.emailSent}
              emailError={success.emailError}
              onClose={() => handleOpenChange(false)}
            />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add agent</DialogTitle>
                <DialogDescription>
                  Creates a referral-partner login. They&apos;ll receive a
                  welcome email with a temporary password (also shown here),
                  and will be required to reset it on first sign-in.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} noValidate>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      required
                      aria-invalid={Boolean(fieldErrors.name)}
                    />
                    {fieldErrors.name && (
                      <FieldError
                        errors={fieldErrors.name.map((m) => ({ message: m }))}
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="organization">
                        Organization
                      </FieldLabel>
                      <Input id="organization" name="organization" />
                      <FieldDescription>Optional.</FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="agent_type">Type</FieldLabel>
                      <select
                        id="agent_type"
                        name="agent_type"
                        defaultValue="individual"
                        className={selectClass}
                      >
                        {AGENT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {AGENT_TYPE_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="off"
                      required
                      aria-invalid={Boolean(fieldErrors.email)}
                    />
                    <FieldDescription>
                      Used as their login. Cannot be changed later.
                    </FieldDescription>
                    {fieldErrors.email && (
                      <FieldError
                        errors={fieldErrors.email.map((m) => ({ message: m }))}
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="phone">Phone</FieldLabel>
                      <Input id="phone" name="phone" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="country_code">Country</FieldLabel>
                      <select
                        id="country_code"
                        name="country_code"
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
                    <FieldLabel htmlFor="website">Website</FieldLabel>
                    <Input id="website" name="website" />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="commission_terms">
                      Commission terms
                    </FieldLabel>
                    <Input
                      id="commission_terms"
                      name="commission_terms"
                      placeholder="e.g. 15% of retainer"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="notes">Notes</FieldLabel>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={2}
                      className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
                    />
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

                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Adding…
                      </>
                    ) : (
                      "Add agent"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SuccessView({
  tempPassword,
  emailSent,
  emailError,
  onClose,
}: {
  tempPassword: string;
  emailSent: boolean;
  emailError?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle>Agent added</DialogTitle>
            <DialogDescription>
              {emailSent
                ? "Welcome email sent. Share the password directly only if delivery fails."
                : "Welcome email could not be sent — share the password with them directly."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="min-w-0 space-y-2 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Temporary password
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <code className="block min-w-0 flex-1 truncate rounded bg-white px-3 py-2 font-mono text-sm">
            {tempPassword}
          </code>
          <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
            <Copy className="mr-1 h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {!emailSent && emailError && (
          <p className="text-xs text-amber-700">Email error: {emailError}</p>
        )}
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}

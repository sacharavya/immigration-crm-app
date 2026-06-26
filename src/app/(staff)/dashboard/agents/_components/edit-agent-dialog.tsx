"use client";

import { Loader2 } from "lucide-react";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  AGENT_TYPE_LABEL,
  AGENT_TYPES,
  type AgentType,
} from "@/lib/validators/agent";

import { updateAgent } from "../actions";

const selectClass =
  "h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30";

export type EditableAgent = {
  id: string;
  name: string;
  organization: string | null;
  agent_type: AgentType;
  phone: string | null;
  website: string | null;
  country_code: string | null;
  commission_terms: string | null;
  notes: string | null;
};

type Country = { code: string; name: string };

export function EditAgentDialog({
  agent,
  countries,
}: {
  agent: EditableAgent;
  countries: Country[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      organization: fd.get("organization"),
      agent_type: fd.get("agent_type"),
      phone: fd.get("phone"),
      website: fd.get("website"),
      country_code: fd.get("country_code"),
      commission_terms: fd.get("commission_terms"),
      notes: fd.get("notes"),
    };

    startTransition(async () => {
      const result = await updateAgent(agent.id, payload);
      if ("error" in result) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit agent</DialogTitle>
            <DialogDescription>
              Update the agent&apos;s profile. The login email cannot be
              changed here.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit_name">Name</FieldLabel>
                <Input
                  id="edit_name"
                  name="name"
                  defaultValue={agent.name}
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
                  <FieldLabel htmlFor="edit_organization">
                    Organization
                  </FieldLabel>
                  <Input
                    id="edit_organization"
                    name="organization"
                    defaultValue={agent.organization ?? ""}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit_agent_type">Type</FieldLabel>
                  <select
                    id="edit_agent_type"
                    name="agent_type"
                    defaultValue={agent.agent_type}
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

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="edit_phone">Phone</FieldLabel>
                  <Input
                    id="edit_phone"
                    name="phone"
                    defaultValue={agent.phone ?? ""}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit_country_code">Country</FieldLabel>
                  <select
                    id="edit_country_code"
                    name="country_code"
                    defaultValue={agent.country_code ?? ""}
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
                <FieldLabel htmlFor="edit_website">Website</FieldLabel>
                <Input
                  id="edit_website"
                  name="website"
                  defaultValue={agent.website ?? ""}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="edit_commission_terms">
                  Commission terms
                </FieldLabel>
                <Input
                  id="edit_commission_terms"
                  name="commission_terms"
                  defaultValue={agent.commission_terms ?? ""}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="edit_notes">Notes</FieldLabel>
                <textarea
                  id="edit_notes"
                  name="notes"
                  rows={2}
                  defaultValue={agent.notes ?? ""}
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
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

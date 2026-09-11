"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { createForm } from "../actions";
import {
  FORM_TYPE_LABELS,
  FORM_TYPES,
  ISSUING_BODIES,
  ISSUING_BODY_LABELS,
} from "../constants";

export function NewFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formNumber, setFormNumber] = useState("");
  const [title, setTitle] = useState("");
  const [issuingBody, setIssuingBody] = useState<string>("ircc");
  const [formType, setFormType] = useState<string>("xfa");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createForm({
        form_number: formNumber,
        title,
        issuing_body: issuingBody as (typeof ISSUING_BODIES)[number],
        form_type: formType as (typeof FORM_TYPES)[number],
        program_tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        scope: issuingBody === "firm" ? "firm" : "global",
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(`/dashboard/forms/${result.id}`);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> New form
      </Button>
      <Dialog open={open} onOpenChange={(o) => (pending ? null : setOpen(o))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register a form</DialogTitle>
            <DialogDescription>
              The form identity. Upload revisions from its detail page.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nf-number">Form number</FieldLabel>
              <Input
                id="nf-number"
                value={formNumber}
                onChange={(e) => setFormNumber(e.target.value)}
                placeholder="IMM 5257"
                maxLength={60}
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nf-title">Title</FieldLabel>
              <Input
                id="nf-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Application for Temporary Resident Visa"
                maxLength={300}
                disabled={pending}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="nf-body">Issuing body</FieldLabel>
                <select
                  id="nf-body"
                  value={issuingBody}
                  onChange={(e) => setIssuingBody(e.target.value)}
                  disabled={pending}
                  className="h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
                >
                  {ISSUING_BODIES.map((b) => (
                    <option key={b} value={b}>
                      {ISSUING_BODY_LABELS[b]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="nf-type">Form type</FieldLabel>
                <select
                  id="nf-type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  disabled={pending}
                  className="h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
                >
                  {FORM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FORM_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="nf-tags">
                Program tags (comma separated)
              </FieldLabel>
              <Input
                id="nf-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="EE-FSW, PNP, SOWP"
                disabled={pending}
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={pending || !formNumber.trim() || !title.trim()}
            >
              {pending ? "Creating..." : "Create form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

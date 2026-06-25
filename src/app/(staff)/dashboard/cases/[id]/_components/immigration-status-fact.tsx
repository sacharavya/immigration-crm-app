"use client";

import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { updateImmigrationStatus } from "@/app/(staff)/dashboard/clients/actions";
import {
  deriveImmigrationDisplay,
  IMMIGRATION_STATUS_LABELS,
  IN_CANADA_STATUS_OPTIONS,
  NO_EXPIRY_STATUSES,
  OUTSIDE_CANADA_AUTH_OPTIONS,
  type ExpiryUrgency,
  type ImmigrationStatusType,
} from "@/lib/validators/client-immigration";
import { cn } from "@/lib/utils/index";

type Props = {
  clientId: string;
  canEdit: boolean;
  inCanada: boolean | null;
  status: ImmigrationStatusType | null;
  expiry: string | null;
  note: string | null;
  uci: string | null;
};

// Expiry urgency → token. Conveyed in text too (the countdown words), never
// colour alone.
const URGENCY_TEXT: Record<ExpiryUrgency, string> = {
  critical: "text-[var(--destructive-text)] font-medium",
  attention: "text-[var(--warning-text)]",
  normal: "text-muted-foreground",
};

const selectClass =
  "h-9 w-full rounded-lg border border-[var(--input)] bg-card px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

export function ImmigrationStatusFact({
  clientId,
  canEdit,
  inCanada,
  status,
  expiry,
  note,
  uci,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const display = deriveImmigrationDisplay({
    immigration_in_canada: inCanada,
    immigration_status: status,
    immigration_status_expiry: expiry,
  });

  const labelTone = display.isCritical
    ? "text-[var(--destructive-text)] font-medium"
    : display.isGap
      ? "text-[var(--warning-text)]"
      : "text-foreground";

  const valueBody = (
    <span className="flex flex-col gap-0.5 text-left">
      <span className="flex items-center gap-1.5">
        <span className={cn("text-sm leading-tight", labelTone)}>
          {display.label}
          {display.detail ? (
            <span className="font-normal text-muted-foreground">
              , {display.detail}
            </span>
          ) : null}
        </span>
        {canEdit && (
          <Pencil
            aria-hidden
            className="h-3 w-3 shrink-0 text-[var(--subtle-foreground)] opacity-0 transition-opacity group-hover/imm:opacity-100"
          />
        )}
      </span>
      {display.expiryText && (
        <span
          className={cn(
            "text-xs leading-tight",
            display.expiryUrgency
              ? URGENCY_TEXT[display.expiryUrgency]
              : "text-muted-foreground",
          )}
        >
          {display.expiryText}
        </span>
      )}
      {display.isGap && canEdit && (
        <span className="text-xs leading-tight text-[var(--warning-text)]">
          Add status
        </span>
      )}
    </span>
  );

  if (!canEdit) {
    return valueBody;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit immigration status. Current: ${display.label}${
          display.expiryText ? `, ${display.expiryText}` : ""
        }`}
        className="group/imm -mx-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {valueBody}
      </button>

      <EditDialog
        open={open}
        onOpenChange={setOpen}
        clientId={clientId}
        initial={{ inCanada: inCanada !== false, status, expiry, note, uci }}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function EditDialog({
  open,
  onOpenChange,
  clientId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  initial: {
    inCanada: boolean;
    status: ImmigrationStatusType | null;
    expiry: string | null;
    note: string | null;
    uci: string | null;
  };
  onSaved: () => void;
}) {
  const [inCanada, setInCanada] = useState(initial.inCanada);
  const [status, setStatus] = useState<ImmigrationStatusType | "">(
    initial.status ?? "",
  );
  const [expiry, setExpiry] = useState(initial.expiry ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [uci, setUci] = useState(initial.uci ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const noExpiry =
    status !== "" && NO_EXPIRY_STATUSES.has(status as ImmigrationStatusType);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateImmigrationStatus(clientId, {
        immigration_in_canada: inCanada,
        immigration_status: status === "" ? null : status,
        immigration_status_expiry:
          !inCanada || noExpiry || expiry === "" ? null : expiry,
        immigration_status_note: note.trim() === "" ? null : note.trim(),
        uci: uci.trim() === "" ? null : uci.trim(),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  const options = inCanada
    ? IN_CANADA_STATUS_OPTIONS
    : OUTSIDE_CANADA_AUTH_OPTIONS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit immigration status</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          {/* Location drives the whole form. */}
          <Field>
            <FieldLabel htmlFor="imm-location">Location</FieldLabel>
            <div
              id="imm-location"
              role="radiogroup"
              aria-label="Location"
              className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--input)] p-1"
            >
              <SegmentButton
                selected={inCanada}
                onClick={() => setInCanada(true)}
              >
                In Canada
              </SegmentButton>
              <SegmentButton
                selected={!inCanada}
                onClick={() => setInCanada(false)}
              >
                Outside Canada
              </SegmentButton>
            </div>
          </Field>

          {inCanada ? (
            <>
              <Field>
                <FieldLabel htmlFor="imm-status">Status</FieldLabel>
                <select
                  id="imm-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as ImmigrationStatusType | "")
                  }
                  className={selectClass}
                >
                  <option value="">Status not set</option>
                  {options.map((s) => (
                    <option key={s} value={s}>
                      {IMMIGRATION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor="imm-expiry">Expiry date</FieldLabel>
                <Input
                  id="imm-expiry"
                  type="date"
                  value={expiry}
                  disabled={noExpiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
                {noExpiry && (
                  <FieldDescription>
                    Permanent residents and citizens have no expiry.
                  </FieldDescription>
                )}
              </Field>
            </>
          ) : (
            <Field>
              <FieldLabel htmlFor="imm-auth">
                Canadian authorization held
              </FieldLabel>
              <select
                id="imm-auth"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ImmigrationStatusType | "")
                }
                className={selectClass}
              >
                <option value="">None</option>
                {options.map((s) => (
                  <option key={s} value={s}>
                    {IMMIGRATION_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <FieldDescription>
                Outside Canada, no status expiry applies.
              </FieldDescription>
            </Field>
          )}

          {/* UCI: per-person identifier, recorded here for returning
              applicants who already have one. Persists to the client. */}
          <Field>
            <FieldLabel htmlFor="imm-uci">UCI (optional)</FieldLabel>
            <Input
              id="imm-uci"
              value={uci}
              inputMode="numeric"
              maxLength={20}
              placeholder="e.g. 1098-7654"
              onChange={(e) => setUci(e.target.value)}
            />
            <FieldDescription>
              The client&apos;s IRCC Unique Client Identifier, if they already
              have one.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="imm-note">Note (optional)</FieldLabel>
            <Input
              id="imm-note"
              value={note}
              maxLength={500}
              placeholder="Permit conditions, LMIA details, etc."
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          {error && <FieldError>{error}</FieldError>}
        </FieldGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SegmentButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "h-8 rounded-md text-sm font-medium transition-colors",
        selected
          ? "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

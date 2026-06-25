"use client";

import { Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";

import type { ChipOutput } from "@/lib/cases/action-chip";
import type { CaseStatus } from "@/lib/utils/phase";
import { cn } from "@/lib/utils/index";

import { emailClientPortalLink } from "../actions";
import { CaseEventDialog } from "./case-event-dialog";

type Props = {
  caseId: string;
  chip: ChipOutput | null;
  status: CaseStatus;
  clientEmail: string | null;
  closedOutcome: "approved" | "refused" | null;
};

// Chip tone tokens. Meaning, not party: waiting → warning, overdue → safe-stop
// destructive, action-on-us in progress → navy, passive → muted.
const TONE: Record<string, string> = {
  destructive: "bg-[var(--maple-100)] text-[var(--destructive-text)]",
  warning: "bg-[var(--warning-subtle)] text-[var(--warning-text)]",
  navy: "bg-[var(--navy-100)] text-[var(--navy-700)]",
  success: "bg-[var(--success-subtle)] text-[var(--success-text)]",
  muted: "bg-muted text-muted-foreground",
};

function toneFor(chip: ChipOutput): keyof typeof TONE {
  if (chip.urgency === "overdue") return "destructive";
  if (chip.urgency === "sensitive") return "warning";
  if (chip.responsibility === "client" || chip.responsibility === "ircc") {
    return "warning";
  }
  if (chip.responsibility === "us") return "navy";
  return "muted";
}

function StatusChip({
  tone,
  children,
}: {
  tone: keyof typeof TONE;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}

export function SubStatusRow({
  caseId,
  chip,
  status,
  clientEmail,
  closedOutcome,
}: Props) {
  // Closed cases surface the decision outcome, never a waiting state.
  if (status === "closed") {
    const tone: keyof typeof TONE =
      closedOutcome === "approved"
        ? "success"
        : closedOutcome === "refused"
          ? "destructive"
          : "muted";
    const label =
      closedOutcome === "approved"
        ? "Approved"
        : closedOutcome === "refused"
          ? "Refused"
          : "Closed";
    return (
      <div className="flex flex-wrap items-center gap-3">
        <StatusChip tone={tone}>{label}</StatusChip>
      </div>
    );
  }

  if (!chip) return null;

  const tone = toneFor(chip);
  // The chip text already encodes aging as " · N days"; re-render it in the
  // spec's "label, N days" form so it reads as one fact.
  const base = chip.text.split(" · ")[0];
  const label =
    chip.waiting_days != null
      ? `${base}, ${chip.waiting_days} day${chip.waiting_days === 1 ? "" : "s"}`
      : base;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusChip tone={tone}>{label}</StatusChip>

      {chip.responsibility === "client" && (
        <SendReminderButton caseId={caseId} clientEmail={clientEmail} />
      )}

      {chip.responsibility === "ircc" && (
        <CaseEventDialog
          caseId={caseId}
          currentStatus={status}
          triggerLabel="Record event"
          triggerClassName="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-sm font-medium text-[var(--navy-700)] transition-colors hover:bg-[var(--navy-50)] disabled:cursor-not-allowed disabled:opacity-50"
        />
      )}
    </div>
  );
}

function SendReminderButton({
  caseId,
  clientEmail,
}: {
  caseId: string;
  clientEmail: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!clientEmail) {
    return (
      <span className="text-xs text-[var(--subtle-foreground)]">
        No client email on file
      </span>
    );
  }

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await emailClientPortalLink({
        caseId,
        recipientEmail: clientEmail as string,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    });
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={send}
        disabled={pending || sent}
        className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-sm font-medium text-[var(--navy-700)] transition-colors hover:bg-[var(--navy-50)] disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        {sent ? "Reminder sent" : "Send reminder"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-[var(--destructive-text)]">
          {error}
        </span>
      )}
    </span>
  );
}

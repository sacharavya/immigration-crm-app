/**
 * Cases board - shared presentational atoms.
 *
 * The Board card and the List row render the same derived facts (ball in
 * court, signal, documents, payment, priority, worker). These atoms keep the
 * two views pixel-consistent and, more importantly, keep every colour tied to
 * a BBI design token - no ad-hoc palette. Whose move it is, the urgency, and
 * the priority are always carried by text or an accessible label, never by
 * colour alone.
 */

import { ArrowRight, Clock, Inbox, User } from "lucide-react";

import type {
  BallInCourt,
  BoardCardModel,
  CardUrgency,
  CasePriority,
  CaseSignal,
  PaymentState,
} from "@/lib/cases/board-card";
import { cn } from "@/lib/utils/index";

// ---- Left edge: the computed signal --------------------------------------
// at risk → destructive, stalled → warning, healthy → neutral border.
export const SIGNAL_EDGE: Record<CaseSignal, string> = {
  at_risk: "border-l-[color:var(--destructive)]",
  stalled: "border-l-[color:var(--warning)]",
  healthy: "border-l-[color:var(--border)]",
};

// ---- Ball in court: status-line colour + dot -----------------------------
const BALL_TEXT: Record<BallInCourt, string> = {
  firm: "text-primary",
  client: "text-[color:var(--warning-text)]",
  ircc: "text-muted-foreground",
};

const BALL_DOT: Record<BallInCourt, string> = {
  firm: "bg-primary",
  client: "bg-[color:var(--warning-text)]",
  ircc: "bg-muted-foreground",
};

const BALL_LABEL: Record<BallInCourt, string> = {
  firm: "Firm's move",
  client: "Awaiting client",
  ircc: "Awaiting IRCC",
};

// Small coloured dot announcing whose move it is. Has an accessible label so
// the meaning is not colour-only.
export function BallDot({ ball }: { ball: BallInCourt }) {
  return (
    <span
      role="img"
      aria-label={BALL_LABEL[ball]}
      title={BALL_LABEL[ball]}
      className={cn("h-2 w-2 shrink-0 rounded-full", BALL_DOT[ball])}
    />
  );
}

// The single status line: the next step or waiting state, with its icon,
// coloured by ball in court. The icon reinforces the text (arrow/inbox = firm,
// person = client, clock = IRCC).
export function StatusLine({
  ball,
  text,
  className,
}: {
  ball: BallInCourt;
  text: string;
  className?: string;
}) {
  const Icon =
    ball === "client"
      ? User
      : ball === "ircc"
        ? Clock
        : text.startsWith("Review")
          ? Inbox
          : ArrowRight;
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium",
        BALL_TEXT[ball],
        className,
      )}
    >
      <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{text}</span>
    </p>
  );
}

// ---- Urgency line --------------------------------------------------------
const URGENCY_TEXT: Record<CardUrgency["kind"], string> = {
  at_risk: "text-[color:var(--destructive-text)]",
  stalled: "text-[color:var(--warning-text)]",
  submitted: "text-muted-foreground",
};

export function UrgencyLine({
  urgency,
  className,
}: {
  urgency: CardUrgency;
  className?: string;
}) {
  return (
    <p className={cn("text-xs font-medium", URGENCY_TEXT[urgency.kind], className)}>
      {urgency.text}
    </p>
  );
}

// ---- Documents progress --------------------------------------------------
// received over required, counting required documents only. The bar fill is
// primary, turning success once every required document is in.
export function DocsProgress({
  received,
  required,
  className,
}: {
  received: number;
  required: number;
  className?: string;
}) {
  const complete = required > 0 && received >= required;
  const pct = required > 0 ? Math.min(100, (received / required) * 100) : 0;
  const label = `Documents ${received} of ${required} required received`;
  return (
    <div className={cn("flex items-center gap-2", className)} title={label}>
      <span className="tabular-nums text-xs font-medium text-[color:var(--secondary-foreground)]">
        {received}/{required}
      </span>
      <span
        role="progressbar"
        aria-valuenow={received}
        aria-valuemin={0}
        aria-valuemax={required}
        aria-label={label}
        className="h-1.5 w-14 overflow-hidden rounded-full bg-muted"
      >
        <span
          className={cn(
            "block h-full rounded-full transition-all",
            complete ? "bg-[color:var(--success)]" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

// ---- Payment indicator ---------------------------------------------------
const PAYMENT_DOT: Record<PaymentState, string> = {
  paid: "bg-[color:var(--success)]",
  partial: "bg-[color:var(--warning)]",
  unpaid: "bg-[color:var(--destructive)]",
  none: "bg-muted-foreground",
};

export function PaymentIndicator({
  state,
  label,
  className,
}: {
  state: PaymentState;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        aria-hidden
        className={cn("h-2 w-2 shrink-0 rounded-full", PAYMENT_DOT[state])}
      />
      <span className="truncate text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

// ---- Priority pill -------------------------------------------------------
// Shown only when set. Critical is the loudest treatment (solid destructive,
// white text); High is a notch quieter (warning-subtle on warning-text).
export function PriorityPill({
  priority,
  className,
}: {
  priority: CasePriority;
  className?: string;
}) {
  if (priority === "none") return null;
  const critical = priority === "critical";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        critical
          ? "bg-[color:var(--destructive)] text-[color:var(--destructive-foreground)]"
          : "bg-[color:var(--warning-subtle)] text-[color:var(--warning-text)]",
        className,
      )}
    >
      {critical ? "Critical" : "High"}
    </span>
  );
}

// ---- Decision badge ------------------------------------------------------

// Phase-6 outcome, visible at a glance: passport_requested is an approval.
export function DecisionBadge({
  decision,
  className,
}: {
  decision: "approved" | "refused" | null;
  className?: string;
}) {
  if (!decision) return null;
  const meta =
    decision === "approved"
      ? { label: "Approved", classes: "bg-green-100 text-green-800" }
      : { label: "Refused", classes: "bg-red-100 text-red-800" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        meta.classes,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

// ---- Worker avatar -------------------------------------------------------
// The case worker (not the RCIC of record). Accent wash with navy text.
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function WorkerAvatar({
  name,
  withName = false,
  className,
}: {
  name: string | null;
  withName?: boolean;
  className?: string;
}) {
  if (!name) {
    return (
      <span className={cn("text-xs text-[color:var(--subtle-foreground)]", className)}>
        Unassigned
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        aria-hidden
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[10px] font-semibold text-navy-700"
      >
        {initials(name)}
      </span>
      {withName && (
        <span className="truncate text-xs text-muted-foreground">{name}</span>
      )}
    </span>
  );
}

// Re-export the model type for the views' convenience.
export type { BoardCardModel };

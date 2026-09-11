/**
 * Cases board - per-card derivation.
 *
 * One glance at a card tells the whole story of a case: what stage it is in,
 * whose move it is, whether it is urgent, how far along the work is, whether
 * the client has paid, and who is handling it. Almost all of that is derived,
 * never stored. This module is the single source of those derivations so the
 * Board and the List view agree exactly.
 *
 * It composes three existing primitives:
 *   - computeActionChip()  → the next step / waiting state ("ball in court").
 *   - deriveSubmissionRisk() → the at-risk red signal (permit expiry).
 *   - phaseIndex()         → which of the five phases the case sits in.
 *
 * Pure: no I/O. Callers assemble the inputs (the cases page does the
 * round-trips) and pass `now` so the result is deterministic and testable.
 */

import type { ChipOutput, ChipResponsibility } from "@/lib/cases/action-chip";
import type { SubmissionRisk } from "@/lib/cases/submission-risk";
import { phaseIndex, type CaseStatus, type PhaseNumber } from "@/lib/utils/phase";

// Whose move it is. Drives the single status line and its colour.
//   firm   → the next step is the firm's (advance, review, submit, prepare).
//   client → waiting on the client (documents, payment, signature).
//   ircc   → submitted and awaiting an IRCC response (also covers passive
//            "scheduled" waits like biometrics / interview).
export type BallInCourt = "firm" | "client" | "ircc";

// The computed left-edge signal, in priority order.
//   at_risk → red: in Canada on a temporary permit, not yet submitted, permit
//             expiry inside the at-risk window. The deadline is the expiry.
//   stalled → amber: sat in its current phase past the threshold without
//             progress. Awaiting IRCC (Submitted phase) is never stalled.
//   healthy → neutral.
export type CaseSignal = "at_risk" | "stalled" | "healthy";

// The only manual field on the card. Defaults to none and is never set
// automatically. Shown only when high or critical. 'normal' (the DB default)
// reads as none.
export type CasePriority = "none" | "high" | "critical";

// Payment, from the payment record.
//   paid    → collected covers the total.
//   partial → some collected, not all.
//   unpaid  → nothing collected and a balance is due.
//   none    → no payment due yet (total is zero).
export type PaymentState = "paid" | "partial" | "unpaid" | "none";

export type CardUrgency = {
  kind: "at_risk" | "stalled" | "submitted";
  text: string;
  // Only meaningful for at_risk: the permit has already lapsed.
  overdue: boolean;
};

export type BoardCardModel = {
  id: string;
  caseNumber: string;
  clientName: string;
  // null → the card shows a "Service not set" line in its place.
  serviceName: string | null;
  status: CaseStatus;
  phase: PhaseNumber;

  // Ball in court + the single status line (with the new-uploads override).
  ballInCourt: BallInCourt;
  statusText: string;

  // Left-edge signal + the conditional urgency line (null when neither at
  // risk nor stalled nor submitted).
  signal: CaseSignal;
  urgency: CardUrgency | null;

  // Documents progress: received over required, required only.
  docsRequired: number;
  docsReceived: number;

  payment: { state: PaymentState; label: string };

  priority: CasePriority;

  // Decision-phase outcome shown as a badge: passport_requested is an
  // approval in IRCC terms, refused a refusal. Null outside phase 6.
  decision: "approved" | "refused" | null;

  workerId: string | null;
  workerName: string | null;

  // Whole days the case has spent in its current phase.
  phaseAgeDays: number;

  // Lower = more pressing. Drives the List view default sort and is a stable
  // tie-broken ordering the Board can lean on too.
  sortRank: number;
};

// Tunable thresholds, centralised so "what counts as stalled" is one edit.
export const BOARD_THRESHOLDS = {
  // A case that has sat in a pre-submission phase this long without progress
  // is stalled. Tuned to surface neglect without nagging on normal waits.
  stalled_days: 14,
} as const;

function daysBetween(fromIso: string, to: Date): number {
  const fromMs = new Date(fromIso).getTime();
  return Math.floor((to.getTime() - fromMs) / 86_400_000);
}

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

// Whole-dollar amounts drop the cents for a calmer card; fractional amounts
// (HST) keep them so the figure stays exact.
function formatCad(n: number): string {
  return Number.isInteger(n)
    ? cadFormatter.format(n).replace(/[.,]00$/, "")
    : cadFormatter.format(n);
}

function formatDeadline(iso: string): string {
  // iso is a yyyy-mm-dd permit expiry; pin to local midnight so the day does
  // not slip across a timezone boundary.
  return new Date(iso + "T00:00:00").toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

// computeActionChip's responsibility vocabulary → the three-way ball-in-court.
// "passive" is a scheduled wait (biometrics/interview booked) - neither the
// firm nor the client is actively blocked, so it reads as the neutral IRCC
// wait rather than a firm action.
function ballFromResponsibility(r: ChipResponsibility): BallInCourt {
  switch (r) {
    case "us":
      return "firm";
    case "client":
      return "client";
    case "ircc":
    case "passive":
      return "ircc";
  }
}

export type DeriveBoardCardInput = {
  id: string;
  caseNumber: string;
  clientName: string;
  serviceName: string | null;
  status: CaseStatus;
  priority: string | null;
  workerId: string | null;
  workerName: string | null;
  // Last status-change proxy: the case row's updated_at. Phase age and the
  // stalled signal both measure from here, matching the action chip.
  updatedAt: string;
  // When the case entered the Submitted phase; falls back to updatedAt.
  submittedAt: string | null;
  // From computeActionChip(); null only if the chip view had no row.
  chip: ChipOutput | null;
  // From deriveSubmissionRisk(); null when the case is not at risk.
  risk: SubmissionRisk | null;
  // Document counts, required documents only (from v_case_chip_inputs).
  //   required → documents marked required for the case.
  //   received → required docs with a live uploaded-or-accepted file.
  //   awaitingReview → required docs whose latest file is uploaded, not yet
  //                    accepted: the "N new uploads" the firm must review.
  docs: { required: number; received: number; awaitingReview: number };
  // Money: the case total owed and the verified amount collected.
  payment: { totalCad: number; collectedCad: number };
  now: Date;
};

function normalizePriority(raw: string | null): CasePriority {
  return raw === "high" || raw === "critical" ? raw : "none";
}

function derivePayment(
  totalCad: number,
  collectedCad: number,
): { state: PaymentState; label: string } {
  if (totalCad <= 0) return { state: "none", label: "No payment due" };
  if (collectedCad >= totalCad) return { state: "paid", label: "Paid in full" };
  if (collectedCad > 0) {
    return {
      state: "partial",
      label: `${formatCad(collectedCad)} of ${formatCad(totalCad)}`,
    };
  }
  return { state: "unpaid", label: `${formatCad(totalCad)} due` };
}

export function deriveBoardCard(input: DeriveBoardCardInput): BoardCardModel {
  const phase = phaseIndex(input.status) ?? 5;
  const phaseAgeDays = Math.max(0, daysBetween(input.updatedAt, input.now));

  // ---- Ball in court + status line (with the new-uploads override) --------
  let ballInCourt: BallInCourt = input.chip
    ? ballFromResponsibility(input.chip.responsibility)
    : "firm";
  let statusText = input.chip?.text ?? "Status pending";

  // New uploads override. When the client has uploaded documents awaiting
  // review, the work has landed back in the firm's court - surface it as a
  // firm move even if the case would otherwise still read "awaiting client".
  // Only pre-submission (phases 2 and 3), where review is the actual step.
  if (
    input.docs.awaitingReview > 0 &&
    (input.status === "documentation_in_progress" ||
      input.status === "documentation_review")
  ) {
    ballInCourt = "firm";
    statusText = `Review ${input.docs.awaitingReview} new upload${
      input.docs.awaitingReview === 1 ? "" : "s"
    }`;
  }

  // ---- Signal + urgency line ----------------------------------------------
  // At risk wins. Then stalled (pre-submission only). A submitted case shows a
  // neutral "submitted N days ago" instead, never a stalled warning.
  let signal: CaseSignal = "healthy";
  let urgency: CardUrgency | null = null;

  if (input.risk) {
    signal = "at_risk";
    urgency = {
      kind: "at_risk",
      overdue: input.risk.overdue,
      text: input.risk.overdue
        ? `Permit expired ${Math.abs(input.risk.daysUntilExpiry)} day${
            Math.abs(input.risk.daysUntilExpiry) === 1 ? "" : "s"
          } ago`
        : `File before ${formatDeadline(input.risk.fileBefore)}`,
    };
  } else if (phase === 4) {
    // Submitted: a normal IRCC wait. Neutral line, never stalled.
    const days = daysBetween(input.submittedAt ?? input.updatedAt, input.now);
    if (days >= 0) {
      urgency = {
        kind: "submitted",
        overdue: false,
        text: `Submitted ${days} day${days === 1 ? "" : "s"} ago`,
      };
    }
  } else if (
    phase <= 3 &&
    phaseAgeDays >= BOARD_THRESHOLDS.stalled_days
  ) {
    signal = "stalled";
    urgency = {
      kind: "stalled",
      overdue: false,
      text: `Stalled ${phaseAgeDays} days`,
    };
  }

  const priority = normalizePriority(input.priority);
  const payment = derivePayment(
    input.payment.totalCad,
    input.payment.collectedCad,
  );

  return {
    id: input.id,
    caseNumber: input.caseNumber,
    clientName: input.clientName,
    serviceName: input.serviceName,
    status: input.status,
    phase,
    ballInCourt,
    statusText,
    signal,
    urgency,
    docsRequired: input.docs.required,
    docsReceived: input.docs.received,
    payment,
    priority,
    decision:
      input.status === "passport_requested"
        ? "approved"
        : input.status === "refused"
          ? "refused"
          : null,
    workerId: input.workerId,
    workerName: input.workerName,
    phaseAgeDays,
    sortRank: computeSortRank({
      signal,
      atRiskOverdue: urgency?.kind === "at_risk" && urgency.overdue,
      chipUrgency: input.chip?.urgency ?? null,
      priority,
      ballInCourt,
    }),
  };
}

// Most pressing first. At-risk (overdue worst) tops the list, then stalled,
// then anything the chip flags overdue, then manual priority, then by whose
// move it is. Phase age breaks ties at the call site.
function computeSortRank(args: {
  signal: CaseSignal;
  atRiskOverdue: boolean;
  chipUrgency: ChipOutput["urgency"] | null;
  priority: CasePriority;
  ballInCourt: BallInCourt;
}): number {
  if (args.signal === "at_risk") return args.atRiskOverdue ? 0 : 1;
  if (args.signal === "stalled") return 2;
  if (args.chipUrgency === "overdue") return 3;
  if (args.priority === "critical") return 4;
  if (args.priority === "high") return 5;
  if (args.ballInCourt === "firm") return 6;
  if (args.ballInCourt === "client") return 7;
  return 8;
}

// Sort comparator for the List view default ("most pressing first"): rank
// ascending, then longer phase age first within a rank.
export function compareByPressing(a: BoardCardModel, b: BoardCardModel): number {
  if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
  return b.phaseAgeDays - a.phaseAgeDays;
}

// Attention filter buckets, applied after derivation (the signal is computed,
// not stored, so it cannot be a SQL predicate).
export type AttentionFilter = "at_risk" | "stalled" | "firm" | "priority";

export function matchesAttention(
  card: BoardCardModel,
  filter: AttentionFilter,
): boolean {
  switch (filter) {
    case "at_risk":
      return card.signal === "at_risk";
    case "stalled":
      return card.signal === "stalled";
    case "firm":
      return card.ballInCourt === "firm";
    case "priority":
      return card.priority !== "none";
  }
}

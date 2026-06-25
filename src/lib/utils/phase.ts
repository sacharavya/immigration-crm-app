import type { Database } from "@/lib/supabase/types";

export type CaseStatus = Database["crm"]["Enums"]["case_status"];

// ---------------------------------------------------------------------------
// Phase pipeline (FLOW-1 onward — 5 phases)
//
// Biometrics is no longer a phase; it's a per-case attribute (cases.biometrics_status)
// plus a client-level history (crm.client_biometric_records). The two outcome
// statuses passport_requested / refused both collapse onto Phase 5 (Decision)
// with the column's individual cards distinguishing Approved vs Refused.
// ---------------------------------------------------------------------------

export type PhaseNumber = 1 | 2 | 3 | 4 | 5;

export const PHASES = [
  { number: 1, key: "retainer_pending",          label: "Retainer"  },
  { number: 2, key: "documentation_in_progress", label: "Documents" },
  { number: 3, key: "documentation_review",      label: "Review"    },
  { number: 4, key: "submitted_to_ircc",         label: "Submitted" },
  { number: 5, key: "decision",                  label: "Decision"  },
] as const;

export const PHASE_LABELS: Record<number, string> = {
  1: "Retainer",
  2: "Documents",
  3: "Review",
  4: "Submitted",
  5: "Decision",
};

/**
 * Maps a case_status to a phase number. Returns null for terminal/closed
 * cases that sit off the pipeline.
 *
 * Mirrors crm.phase_of() in SQL. The switch is exhaustive — adding a
 * new case_status without a branch is a TypeScript error.
 */
export function phaseIndex(status: CaseStatus): PhaseNumber | null {
  switch (status) {
    case "retainer_pending":
      return 1;
    case "documentation_in_progress":
      return 2;
    case "documentation_review":
      return 3;
    case "submitted_to_ircc":
      return 4;
    case "passport_requested":
    case "refused":
      return 5;
    case "closed":
      return null;
  }
}

export const STATUS_LABEL: Record<CaseStatus, string> = {
  retainer_pending:          "Retainer Pending",
  documentation_in_progress: "Documents in Progress",
  documentation_review:      "Documents Review",
  submitted_to_ircc:         "Submitted to IRCC",
  passport_requested:        "Approved",
  refused:                   "Refused",
  closed:                    "Closed",
};

// ---------------------------------------------------------------------------
// Milestone vocabulary
//
// Each milestone is a real-world event the firm records ("Submitted to IRCC",
// "Send back to Documents"). Recording a forward milestone advances the case
// to a new status; the set of milestones reachable from a given status is
// encoded by `nextMilestones()`.
//
// FLOW-1 dropped: biometrics_pending, biometrics_done, awaiting_decision,
// decision_info_requested. Biometrics and IRCC-info-request are case events
// (event_type), not status transitions. The UI for recording them lands in
// FLOW-3 via the new "Record event" dialog.
// ---------------------------------------------------------------------------

export type Milestone =
  | "documents_in_progress"
  | "review_started"
  | "revision_requested"
  | "submitted_to_ircc"
  | "decision_approved"
  | "decision_refused"
  | "resubmitted"
  | "case_closed";

export const MILESTONE_STATUS: Record<Milestone, CaseStatus> = {
  documents_in_progress: "documentation_in_progress",
  review_started: "documentation_review",
  // Reviewer found something missing or off — kick the case back to
  // Documentation. Same target status as documents_in_progress; distinct
  // milestone slug so the activity log distinguishes "we started" from
  // "we restarted". The forward gate (Gate 3) doesn't apply going backwards.
  revision_requested: "documentation_in_progress",
  submitted_to_ircc: "submitted_to_ircc",
  decision_approved: "passport_requested",
  decision_refused: "refused",
  resubmitted: "submitted_to_ircc",
  case_closed: "closed",
};

export const MILESTONE_LABEL: Record<Milestone, string> = {
  documents_in_progress: "Start collecting documents",
  review_started: "Begin review",
  revision_requested: "Send back to Documents (request revisions)",
  submitted_to_ircc: "Submitted to IRCC",
  decision_approved: "Approved",
  decision_refused: "Decision: refused",
  resubmitted: "Resubmitted to IRCC",
  case_closed: "Close case",
};

// Refused is irreversible — UI surfaces an extra confirm step on this milestone.
export const MILESTONE_NEEDS_CONFIRM: ReadonlySet<Milestone> = new Set<Milestone>([
  "decision_refused",
]);

/**
 * The milestones validly reachable from `status`. Empty for closed cases.
 *
 * Phase 4 → Phase 5 is the recording of an IRCC outcome (Approved or
 * Refused). Additional-info requests and biometrics events do NOT shift
 * status — they're case events, not transitions.
 */
export function nextMilestones(status: CaseStatus): Milestone[] {
  switch (status) {
    case "retainer_pending":
      return ["documents_in_progress"];
    case "documentation_in_progress":
      return ["review_started"];
    case "documentation_review":
      return ["submitted_to_ircc", "revision_requested"];
    case "submitted_to_ircc":
      return ["decision_approved", "decision_refused"];
    case "passport_requested":
    case "refused":
      return ["case_closed"];
    case "closed":
      return [];
  }
}

// ---------------------------------------------------------------------------
// "Waiting on" — derived from status. Drives a chip next to the pipeline
// and a colored dot on each board card so the daily view answers "what
// should I touch today?" at a glance.
//
// FLOW-2 keeps this intentionally coarse. FLOW-3 will replace it with a
// per-case action chip that factors in retainer status, payment status,
// document review state, biometrics status, and most recent event.
// ---------------------------------------------------------------------------

export type WaitingParty = "client" | "ircc" | "us" | "none";

export const WAITING_LABEL: Record<WaitingParty, string> = {
  client: "Waiting on client",
  ircc: "Waiting on IRCC",
  us: "Action on us",
  none: "Closed",
};

export const WAITING_ON: Record<CaseStatus, WaitingParty> = {
  retainer_pending:          "us",
  documentation_in_progress: "client",
  documentation_review:      "us",
  submitted_to_ircc:         "ircc",
  passport_requested:        "us",
  refused:                   "us",
  closed:                    "none",
};

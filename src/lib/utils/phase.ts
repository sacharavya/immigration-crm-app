import type { Database } from "@/lib/supabase/types";

export type CaseStatus = Database["crm"]["Enums"]["case_status"];

/**
 * Maps a case_status to a phase index 1-6 used by the pipeline UI.
 * Closed cases return -1 and are rendered outside the pipeline.
 *
 * Mirrors crm.phase_of() in SQL but exposed for client-side use.
 */
export function phaseIndex(status: CaseStatus): number {
  switch (status) {
    case "retainer_pending":
      return 1;
    case "documentation_in_progress":
      return 2;
    case "documentation_review":
      return 3;
    case "submitted_to_ircc":
      return 4;
    case "biometrics_pending":
    case "biometrics_completed":
    case "awaiting_decision":
      return 5;
    case "passport_requested":
    case "refused":
    case "additional_info_requested":
      return 6;
    case "closed":
      return -1;
  }
}

export const PHASE_LABELS: Record<number, string> = {
  1: "Retainer",
  2: "Documents",
  3: "Review",
  4: "Submitted",
  5: "Biometrics",
  6: "Decision",
};

export const STATUS_LABEL: Record<CaseStatus, string> = {
  retainer_pending: "Retainer Pending",
  documentation_in_progress: "Documentation in Progress",
  documentation_review: "Documentation Review",
  submitted_to_ircc: "Submitted to IRCC",
  biometrics_pending: "Biometrics Pending",
  biometrics_completed: "Biometrics Completed",
  awaiting_decision: "Awaiting Decision",
  passport_requested: "Passport Requested",
  refused: "Refused",
  additional_info_requested: "Additional Info Requested",
  closed: "Closed",
};

// ---------------------------------------------------------------------------
// Milestone vocabulary
//
// Each milestone is a real-world event the firm records ("Submitted to IRCC",
// "Biometrics done"). Recording a milestone advances the case to the
// corresponding status. The set of milestones reachable from a given status
// is encoded by `nextMilestones()`.
// ---------------------------------------------------------------------------

export type Milestone =
  | "documents_in_progress"
  | "review_started"
  | "submitted_to_ircc"
  | "biometrics_pending"
  | "biometrics_done"
  | "awaiting_decision"
  | "decision_approved"
  | "decision_refused"
  | "decision_info_requested"
  | "resubmitted"
  | "case_closed";

export const MILESTONE_STATUS: Record<Milestone, CaseStatus> = {
  documents_in_progress: "documentation_in_progress",
  review_started: "documentation_review",
  submitted_to_ircc: "submitted_to_ircc",
  biometrics_pending: "biometrics_pending",
  biometrics_done: "biometrics_completed",
  awaiting_decision: "awaiting_decision",
  decision_approved: "passport_requested",
  decision_refused: "refused",
  decision_info_requested: "additional_info_requested",
  resubmitted: "submitted_to_ircc",
  case_closed: "closed",
};

export const MILESTONE_LABEL: Record<Milestone, string> = {
  documents_in_progress: "Start collecting documents",
  review_started: "Begin review",
  submitted_to_ircc: "Submitted to IRCC",
  biometrics_pending: "Biometrics requested",
  biometrics_done: "Biometrics completed",
  awaiting_decision: "Awaiting IRCC decision",
  decision_approved: "Decision: passport requested",
  decision_refused: "Decision: refused",
  decision_info_requested: "IRCC requested more info",
  resubmitted: "Resubmitted to IRCC",
  case_closed: "Close case",
};

// Refused is irreversible — UI surfaces an extra confirm step on this milestone.
export const MILESTONE_NEEDS_CONFIRM: ReadonlySet<Milestone> = new Set<Milestone>([
  "decision_refused",
]);

/**
 * The milestones validly reachable from `status`. Empty for closed cases.
 */
export function nextMilestones(status: CaseStatus): Milestone[] {
  switch (status) {
    case "retainer_pending":
      return ["documents_in_progress"];
    case "documentation_in_progress":
      return ["review_started"];
    case "documentation_review":
      return ["submitted_to_ircc"];
    case "submitted_to_ircc":
      return ["biometrics_pending", "awaiting_decision"];
    case "biometrics_pending":
      return ["biometrics_done"];
    case "biometrics_completed":
      return ["awaiting_decision"];
    case "awaiting_decision":
      return ["decision_approved", "decision_info_requested", "decision_refused"];
    case "additional_info_requested":
      return ["resubmitted", "case_closed"];
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
// ---------------------------------------------------------------------------

export type WaitingParty = "client" | "ircc" | "us" | "none";

export const WAITING_LABEL: Record<WaitingParty, string> = {
  client: "Waiting on client",
  ircc: "Waiting on IRCC",
  us: "Action on us",
  none: "Closed",
};

export const WAITING_ON: Record<CaseStatus, WaitingParty> = {
  retainer_pending: "us",
  documentation_in_progress: "client",
  documentation_review: "us",
  submitted_to_ircc: "ircc",
  biometrics_pending: "client",
  biometrics_completed: "ircc",
  awaiting_decision: "ircc",
  passport_requested: "client",
  additional_info_requested: "client",
  refused: "us",
  closed: "none",
};

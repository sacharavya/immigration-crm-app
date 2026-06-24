/**
 * Client worklist computation.
 *
 * Pure functions that derive the worklist fields (segment, stage, urgency,
 * next action, ball in court, nearest deadline) from raw database rows.
 * No side effects, no I/O. The page server component fetches data, calls
 * deriveWorklistRow() on each client, then passes the results to the UI.
 */

import type { ImmigrationStatusType } from "@/lib/validators/client-immigration";
import { NO_EXPIRY_STATUSES } from "@/lib/validators/client-immigration";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClientSegment = "lead" | "active" | "past";

export type ClientStage =
  | "lead"
  | "retained"
  | "preparing"
  | "submitted"
  | "decision"
  | "closed";

export type BallInCourt = "firm" | "client" | "ircc";

export type UrgencyTier = "critical" | "attention" | "normal";

export type NextAction = {
  text: string;
  ball: BallInCourt;
  deadline: string | null; // ISO date or null
};

export type NearestDeadline = {
  date: string; // ISO date
  type: string; // human label, e.g. "Immigration status expiry"
} | null;

/** Raw data joined in JS from multiple tables. */
export type RawClientRow = {
  id: string;
  client_number: string;
  legal_name_full: string;
  email: string | null;
  phone_primary: string | null;
  country_of_citizenship: string | null;
  assigned_rcic: string | null;
  immigration_status: ImmigrationStatusType | null;
  immigration_status_expiry: string | null;
  created_at: string;
  source: string | null;
  // Derived from cases join
  total_cases: number;
  open_cases: number;
  latest_case_status: string | null;
  latest_case_id: string | null;
  latest_case_service_type_id: string | null;
  // Derived from tasks join
  nearest_task_due: string | null;
  nearest_task_title: string | null;
  // Derived from events join
  has_ircc_request: boolean;
  ircc_request_due: string | null;
  // Derived from documents join
  missing_required_docs: number;
  // Derived from approved case service type
  immigration_status_detail: string | null; // e.g. "Work Permit - SOWP"
};

export type WorklistRow = RawClientRow & {
  segment: ClientSegment;
  stage: ClientStage;
  nextAction: NextAction;
  nearestDeadline: NearestDeadline;
  urgency: UrgencyTier;
};

// ---------------------------------------------------------------------------
// Constants (tune these to adjust urgency thresholds)
// ---------------------------------------------------------------------------

export const URGENCY_CRITICAL_DAYS = 30;
export const URGENCY_ATTENTION_DAYS = 60;
export const LEAD_COLD_DAYS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate + "T00:00:00Z").getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.floor((target - now) / 86400000);
}

// ---------------------------------------------------------------------------
// Compute functions
// ---------------------------------------------------------------------------

export function computeSegment(
  totalCases: number,
  openCases: number,
): ClientSegment {
  if (totalCases === 0) return "lead";
  if (openCases > 0) return "active";
  return "past";
}

export function computeStage(
  latestCaseStatus: string | null,
  totalCases: number,
  immigrationStatus: ImmigrationStatusType | null,
): ClientStage {
  if (totalCases === 0) return "lead";
  if (!latestCaseStatus) {
    // All cases closed but no open case status tracked.
    // If immigration status exists, the decision was made.
    if (immigrationStatus && immigrationStatus !== "no_status") return "decision";
    return "closed";
  }

  switch (latestCaseStatus) {
    case "retainer_pending":
      return "retained";
    case "documentation_in_progress":
    case "documentation_review":
      return "preparing";
    case "submitted_to_ircc":
      return "submitted";
    case "passport_requested":
    case "refused":
      return "decision";
    case "closed":
      // Case closed after decision: show "Decision" not "Closed"
      if (immigrationStatus && immigrationStatus !== "no_status") return "decision";
      return "closed";
    default:
      return "lead";
  }
}

export const STAGE_LABELS: Record<ClientStage, string> = {
  lead: "Lead",
  retained: "Retained",
  preparing: "Preparing",
  submitted: "Submitted",
  decision: "Decision",
  closed: "Closed",
};

export function computeNextAction(row: RawClientRow): NextAction {
  // Priority 1: Open IRCC request with deadline
  if (row.has_ircc_request) {
    return {
      text: "Respond to IRCC request",
      ball: "firm",
      deadline: row.ircc_request_due,
    };
  }

  // Priority 2: Immigration status expiring within 90 days
  if (
    row.immigration_status &&
    row.immigration_status_expiry &&
    !NO_EXPIRY_STATUSES.has(row.immigration_status)
  ) {
    const days = daysUntil(row.immigration_status_expiry);
    if (days <= 90 && days >= 0) {
      return {
        text: `Status expires in ${days} days`,
        ball: "firm",
        deadline: row.immigration_status_expiry,
      };
    }
    if (days < 0) {
      return {
        text: "Status expired",
        ball: "firm",
        deadline: row.immigration_status_expiry,
      };
    }
  }

  // Priority 3: Overdue or upcoming task
  if (row.nearest_task_due) {
    const days = daysUntil(row.nearest_task_due);
    return {
      text: row.nearest_task_title ?? "Task due",
      ball: "firm",
      deadline: row.nearest_task_due,
    };
  }

  // Priority 4: Missing required documents
  if (row.missing_required_docs > 0) {
    return {
      text: `${row.missing_required_docs} document${row.missing_required_docs > 1 ? "s" : ""} outstanding`,
      ball: "client",
      deadline: null,
    };
  }

  // Priority 5: Phase-based derivation
  if (!row.latest_case_status || row.total_cases === 0) {
    return { text: "Book consultation", ball: "firm", deadline: null };
  }

  switch (row.latest_case_status) {
    case "retainer_pending":
      return { text: "Complete retainer", ball: "firm", deadline: null };
    case "documentation_in_progress":
      return { text: "Awaiting client documents", ball: "client", deadline: null };
    case "documentation_review":
      return { text: "Review documents", ball: "firm", deadline: null };
    case "submitted_to_ircc":
      return { text: "Awaiting IRCC decision", ball: "ircc", deadline: null };
    case "passport_requested":
      return { text: "Approved, awaiting passport", ball: "client", deadline: null };
    case "refused":
      return { text: "Refused, review options", ball: "firm", deadline: null };
    case "closed":
      return { text: "File closed", ball: "firm", deadline: null };
    default:
      return { text: "Review case", ball: "firm", deadline: null };
  }
}

export function computeNearestDeadline(row: RawClientRow): NearestDeadline {
  const candidates: { date: string; type: string }[] = [];

  if (
    row.immigration_status_expiry &&
    row.immigration_status &&
    !NO_EXPIRY_STATUSES.has(row.immigration_status)
  ) {
    candidates.push({
      date: row.immigration_status_expiry,
      type: "Immigration status expiry",
    });
  }

  if (row.ircc_request_due) {
    candidates.push({ date: row.ircc_request_due, type: "IRCC request due" });
  }

  if (row.nearest_task_due) {
    candidates.push({ date: row.nearest_task_due, type: "Task due" });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.date.localeCompare(b.date));
  return candidates[0];
}

export function computeUrgency(
  nearestDeadline: NearestDeadline,
  immigrationExpiry: string | null,
  immigrationStatus: ImmigrationStatusType | null,
  latestCaseStatus: string | null,
): UrgencyTier {
  // Refusal awaiting action = critical
  if (latestCaseStatus === "refused") return "critical";

  // Check immigration expiry directly
  if (
    immigrationExpiry &&
    immigrationStatus &&
    !NO_EXPIRY_STATUSES.has(immigrationStatus)
  ) {
    const days = daysUntil(immigrationExpiry);
    if (days <= URGENCY_CRITICAL_DAYS) return "critical";
    if (days <= URGENCY_ATTENTION_DAYS) return "attention";
  }

  // Check nearest deadline
  if (nearestDeadline) {
    const days = daysUntil(nearestDeadline.date);
    if (days <= URGENCY_CRITICAL_DAYS) return "critical";
    if (days <= URGENCY_ATTENTION_DAYS) return "attention";
  }

  return "normal";
}

// ---------------------------------------------------------------------------
// Master derivation
// ---------------------------------------------------------------------------

export function deriveWorklistRow(raw: RawClientRow): WorklistRow {
  const segment = computeSegment(raw.total_cases, raw.open_cases);
  const stage = computeStage(raw.latest_case_status, raw.total_cases, raw.immigration_status);
  const nextAction = computeNextAction(raw);
  const nearestDeadline = computeNearestDeadline(raw);
  const urgency = computeUrgency(
    nearestDeadline,
    raw.immigration_status_expiry,
    raw.immigration_status,
    raw.latest_case_status,
  );

  return { ...raw, segment, stage, nextAction, nearestDeadline, urgency };
}

// ---------------------------------------------------------------------------
// Segment counts
// ---------------------------------------------------------------------------

export type SegmentCounts = {
  all: number;
  needs_attention: number;
  active: number;
  leads: number;
  past: number;
};

export function segmentCounts(rows: WorklistRow[]): SegmentCounts {
  const counts: SegmentCounts = {
    all: rows.length,
    needs_attention: 0,
    active: 0,
    leads: 0,
    past: 0,
  };
  for (const r of rows) {
    if (r.urgency !== "normal") counts.needs_attention++;
    if (r.segment === "active") counts.active++;
    if (r.segment === "lead") counts.leads++;
    if (r.segment === "past") counts.past++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Sort comparators
// ---------------------------------------------------------------------------

const URGENCY_ORDER: Record<UrgencyTier, number> = {
  critical: 0,
  attention: 1,
  normal: 2,
};

export function sortByUrgency(a: WorklistRow, b: WorklistRow): number {
  const tierDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
  if (tierDiff !== 0) return tierDiff;
  // Within same tier, soonest deadline first
  const aDate = a.nearestDeadline?.date ?? "9999-12-31";
  const bDate = b.nearestDeadline?.date ?? "9999-12-31";
  const dateDiff = aDate.localeCompare(bDate);
  if (dateDiff !== 0) return dateDiff;
  return (a.legal_name_full ?? "").localeCompare(b.legal_name_full ?? "");
}

export function sortByRecent(a: WorklistRow, b: WorklistRow): number {
  return b.created_at.localeCompare(a.created_at);
}

export function sortByName(a: WorklistRow, b: WorklistRow): number {
  return (a.legal_name_full ?? "").localeCompare(b.legal_name_full ?? "");
}

export function sortByDeadline(a: WorklistRow, b: WorklistRow): number {
  const aDate = a.nearestDeadline?.date ?? "9999-12-31";
  const bDate = b.nearestDeadline?.date ?? "9999-12-31";
  const dateDiff = aDate.localeCompare(bDate);
  if (dateDiff !== 0) return dateDiff;
  return URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
}

export const SORT_FNS: Record<
  string,
  (a: WorklistRow, b: WorklistRow) => number
> = {
  urgency: sortByUrgency,
  recent: sortByRecent,
  name: sortByName,
  deadline: sortByDeadline,
};

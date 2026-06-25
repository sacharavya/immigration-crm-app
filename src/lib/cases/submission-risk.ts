import { phaseIndex, type CaseStatus } from "@/lib/utils/phase";
import type { ImmigrationStatusType } from "@/lib/validators/client-immigration";

// ---------------------------------------------------------------------------
// At-risk submission signal
//
// A case is "at risk" when a status deadline threatens it: the client is in
// Canada on a temporary permit, the case has not yet been submitted to IRCC,
// and the permit expires within the at-risk window. To maintain status a
// person must file before their current permit expires, so the deadline is
// the expiry date itself. This is derived, never stored.
// ---------------------------------------------------------------------------

// Temporary permits tied to an expiry date. Maintaining status means filing
// before one of these lapses, so only these statuses can put a case at risk.
// Permanent resident / citizen never expire; maintained status, restoration,
// and out of status are their own special states, not a pending deadline.
const TEMPORARY_PERMITS = new Set<ImmigrationStatusType>([
  "study_permit",
  "work_permit",
  "pgwp",
  "visitor_record",
  "visitor",
  "trp",
  "bridging_owp",
]);

export const AT_RISK_WINDOW_DAYS = 60;

export type SubmissionRisk = {
  /** Whole days until the permit expires. Negative once overdue. */
  daysUntilExpiry: number;
  /** True when the permit has already lapsed. */
  overdue: boolean;
  /** The date to file before, ISO yyyy-mm-dd (the permit expiry). */
  fileBefore: string;
};

function daysUntil(isoDate: string, now: Date): number {
  const target = new Date(isoDate + "T00:00:00Z").getTime();
  const today = new Date(now).setHours(0, 0, 0, 0);
  return Math.floor((target - today) / 86400000);
}

/**
 * Returns the submission risk when the case qualifies, otherwise null. A null
 * result means the case is not at risk and the normal sub-status row applies.
 * Pure: no I/O, safe on server or client.
 */
export function deriveSubmissionRisk(input: {
  inCanada: boolean | null;
  status: ImmigrationStatusType | null;
  expiry: string | null;
  caseStatus: CaseStatus;
  now?: Date;
}): SubmissionRisk | null {
  const now = input.now ?? new Date();

  // Outside Canada the maintain-status rule does not apply at all.
  if (input.inCanada === false) return null;
  // Only temporary permits with an expiry can lapse.
  if (!input.status || !TEMPORARY_PERMITS.has(input.status)) return null;
  if (!input.expiry) return null;

  // Already submitted to IRCC (phase 4+) or off-pipeline (closed): the filing
  // deadline no longer threatens the case.
  const phase = phaseIndex(input.caseStatus);
  if (phase === null || phase >= 4) return null;

  const days = daysUntil(input.expiry, now);
  if (days > AT_RISK_WINDOW_DAYS) return null;

  return { daysUntilExpiry: days, overdue: days < 0, fileBefore: input.expiry };
}

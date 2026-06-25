import { z } from "zod";

export const IMMIGRATION_STATUS_TYPES = [
  "study_permit",
  "work_permit",
  "pgwp",
  "visitor_record",
  "visitor",
  "trp",
  "bridging_owp",
  "maintained_status",
  "restoration",
  "permanent_resident",
  "citizen",
  "refugee_claimant",
  "no_status",
  "other",
] as const;

export type ImmigrationStatusType = (typeof IMMIGRATION_STATUS_TYPES)[number];

export const IMMIGRATION_STATUS_LABELS: Record<ImmigrationStatusType, string> = {
  study_permit: "Study permit",
  work_permit: "Work permit",
  pgwp: "Post-graduation work permit",
  visitor_record: "Visitor record",
  visitor: "Visitor",
  trp: "Temporary resident permit",
  bridging_owp: "Bridging open work permit",
  maintained_status: "Maintained status",
  restoration: "Restoration period",
  permanent_resident: "Permanent resident",
  citizen: "Citizen",
  refugee_claimant: "Refugee claimant",
  no_status: "Out of status",
  other: "Other",
};

/** Statuses that do not expire. */
export const NO_EXPIRY_STATUSES = new Set<ImmigrationStatusType>([
  "permanent_resident",
  "citizen",
]);

/**
 * Statuses that only make sense while physically in Canada. Excluded from
 * the "Canadian authorization held" select on the Outside Canada side of
 * the editor. You cannot be "out of status" or in a "restoration period"
 * from abroad.
 */
const IN_CANADA_ONLY = new Set<ImmigrationStatusType>([
  "maintained_status",
  "restoration",
  "no_status",
]);

/** Status options offered when the client is in Canada. */
export const IN_CANADA_STATUS_OPTIONS: ImmigrationStatusType[] = [
  ...IMMIGRATION_STATUS_TYPES,
];

/** Authorization options offered when the client is outside Canada. */
export const OUTSIDE_CANADA_AUTH_OPTIONS: ImmigrationStatusType[] =
  IMMIGRATION_STATUS_TYPES.filter((s) => !IN_CANADA_ONLY.has(s));

/**
 * Maps service type codes to the immigration status the client holds
 * after approval. Used to auto-populate immigration_status when a case
 * is approved (decision_approved milestone).
 */
export const SERVICE_TYPE_TO_IMMIGRATION_STATUS: Record<string, ImmigrationStatusType> = {
  PGWP: "pgwp",
  STUDY_PERMIT: "study_permit",
  WORK_PERMIT_OPEN: "work_permit",
  WORK_PERMIT_LMIA: "work_permit",
  VISITOR_VISA: "visitor",
  VISITOR_RECORD: "visitor_record",
  PR_EXPRESS: "permanent_resident",
  PR_PNP: "permanent_resident",
  CITIZENSHIP: "citizen",
  SPONSORSHIP: "work_permit",
  BRIDGING_OWP: "bridging_owp",
};

/**
 * Aliases for service-type category_code values that don't spell out exactly
 * like the immigration status enum. The firm's service types carry a
 * category_code that is the immigration bucket (e.g. "visitor", "work_permit"),
 * which mostly matches the enum 1:1; these are the exceptions.
 */
const CATEGORY_CODE_TO_STATUS: Record<string, ImmigrationStatusType> = {
  citizenship: "citizen",
  pr: "permanent_resident",
  permanent_residence: "permanent_resident",
};

/**
 * The immigration status a client holds after a case on this service type is
 * approved. Prefers the service type's category_code (the firm's own bucket,
 * which covers custom service types), and falls back to the legacy code map.
 * Returns null when nothing maps, so callers can degrade gracefully.
 */
export function immigrationStatusFromServiceType(svc: {
  code?: string | null;
  category_code?: string | null;
}): ImmigrationStatusType | null {
  const cat = svc.category_code?.trim();
  if (cat) {
    if ((IMMIGRATION_STATUS_TYPES as readonly string[]).includes(cat)) {
      return cat as ImmigrationStatusType;
    }
    if (CATEGORY_CODE_TO_STATUS[cat]) return CATEGORY_CODE_TO_STATUS[cat];
  }
  const code = svc.code?.trim();
  if (code && SERVICE_TYPE_TO_IMMIGRATION_STATUS[code]) {
    return SERVICE_TYPE_TO_IMMIGRATION_STATUS[code];
  }
  return null;
}

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v));

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v));

// UCI: IRCC prints it as 8 or 10 digits, often shown grouped with a hyphen
// (e.g. 1098-7654). Kept lenient: digits, spaces, and hyphens, optional.
const optionalUci = z
  .string()
  .trim()
  .max(20)
  .regex(/^[0-9\s-]*$/, "UCI may contain only digits and hyphens")
  .optional()
  .nullable()
  .transform((v) => (v == null || v === "" ? null : v));

export const immigrationStatusSchema = z.object({
  // true = in Canada, false = outside Canada, null = not recorded (legacy
  // rows are treated as in Canada by deriveImmigrationDisplay).
  immigration_in_canada: z.boolean().nullable(),
  immigration_status: z.enum(IMMIGRATION_STATUS_TYPES).nullable(),
  immigration_status_expiry: optionalDate,
  immigration_status_note: optionalText,
  // UCI rides along with the immigration editor since it is the same person-
  // level dialog: a returning applicant who already has one is recorded here.
  uci: optionalUci,
});

export type ImmigrationStatusInput = z.infer<typeof immigrationStatusSchema>;

// ---------------------------------------------------------------------------
// Display derivation
//
// Immigration status only exists relative to Canada, so location drives the
// field. This pure function maps the raw client columns to everything the UI
// needs to render the status, mirroring the clients worklist model. No I/O,
// safe to call on the server or client.
// ---------------------------------------------------------------------------

export type ExpiryUrgency = "critical" | "attention" | "normal";

export type ImmigrationDisplay = {
  /** Whether the client is treated as currently in Canada. */
  inCanada: boolean;
  /** Primary status label, e.g. "Work permit", "Outside Canada". */
  label: string;
  /** Secondary clause, e.g. "decision pending". Null when none. */
  detail: string | null;
  /** Expiry line, e.g. "Expires in 45 days", "No expiry", "Not applicable". */
  expiryText: string | null;
  /** Urgency of the expiry line, drives its colour. Null when not time-based. */
  expiryUrgency: ExpiryUrgency | null;
  /** True when the status is unset for an in-Canada client (a data gap). */
  isGap: boolean;
  /** True for out-of-status: a critical flag conveyed in text, not colour alone. */
  isCritical: boolean;
};

function daysUntil(isoDate: string, now: Date): number {
  const target = new Date(isoDate + "T00:00:00Z").getTime();
  const today = new Date(now).setHours(0, 0, 0, 0);
  return Math.floor((target - today) / 86400000);
}

function expiryCountdown(
  expiry: string,
  now: Date,
  verb = "Expires",
): { text: string; urgency: ExpiryUrgency } {
  const days = daysUntil(expiry, now);
  if (days < 0) {
    return { text: `Expired ${Math.abs(days)} days ago`, urgency: "critical" };
  }
  if (days === 0) return { text: `${verb} today`, urgency: "critical" };
  if (days <= 30) return { text: `${verb} in ${days} days`, urgency: "critical" };
  if (days <= 60) return { text: `${verb} in ${days} days`, urgency: "attention" };
  if (days <= 365) {
    return { text: `${verb} in ${Math.floor(days / 30)} months`, urgency: "normal" };
  }
  return { text: `${verb} in ${Math.floor(days / 365)} years`, urgency: "normal" };
}

export function deriveImmigrationDisplay(input: {
  immigration_in_canada: boolean | null;
  immigration_status: ImmigrationStatusType | null;
  immigration_status_expiry: string | null;
  now?: Date;
}): ImmigrationDisplay {
  const now = input.now ?? new Date();
  const status = input.immigration_status;
  // Legacy rows have no location recorded; the model is Canada-centric so
  // null defaults to in Canada. Only an explicit false means outside Canada.
  const inCanada = input.immigration_in_canada !== false;

  // Outside Canada: expiry never applies, never a gap.
  if (!inCanada) {
    return {
      inCanada: false,
      label: "Outside Canada",
      detail:
        status && status !== "no_status"
          ? `${IMMIGRATION_STATUS_LABELS[status]} held`
          : null,
      expiryText: "Not applicable",
      expiryUrgency: null,
      isGap: false,
      isCritical: false,
    };
  }

  // In Canada, nothing recorded: a gap to fill.
  if (!status) {
    return {
      inCanada: true,
      label: "Status not set",
      detail: null,
      expiryText: null,
      expiryUrgency: null,
      isGap: true,
      isCritical: false,
    };
  }

  if (status === "no_status") {
    return {
      inCanada: true,
      label: "Out of status",
      detail: null,
      expiryText: null,
      expiryUrgency: null,
      isGap: false,
      isCritical: true,
    };
  }

  if (status === "maintained_status") {
    return {
      inCanada: true,
      label: "Maintained status",
      detail: "decision pending",
      expiryText: null,
      expiryUrgency: null,
      isGap: false,
      isCritical: false,
    };
  }

  if (status === "restoration") {
    // The 90-day restoration window end is stored in the expiry column.
    let windowText: string | null = null;
    let windowUrgency: ExpiryUrgency = "attention";
    if (input.immigration_status_expiry) {
      const days = daysUntil(input.immigration_status_expiry, now);
      if (days < 0) {
        windowText = `Window closed ${Math.abs(days)} days ago`;
        windowUrgency = "critical";
      } else if (days === 0) {
        windowText = "Window closes today";
        windowUrgency = "critical";
      } else {
        windowText = `${days} days left in window`;
        // Restoration is inherently time sensitive; never softer than attention.
        windowUrgency = days <= 30 ? "critical" : "attention";
      }
    }
    return {
      inCanada: true,
      label: "Restoration period",
      detail: "cannot work or study",
      expiryText: windowText,
      expiryUrgency: windowUrgency,
      isGap: false,
      isCritical: false,
    };
  }

  if (NO_EXPIRY_STATUSES.has(status)) {
    return {
      inCanada: true,
      label: IMMIGRATION_STATUS_LABELS[status],
      detail: null,
      expiryText: "No expiry",
      expiryUrgency: "normal",
      isGap: false,
      isCritical: false,
    };
  }

  // A permit (study/work/PGWP/visitor/visitor record/TRP/BOWP/refugee/other):
  // show the expiry countdown when on file.
  const countdown = input.immigration_status_expiry
    ? expiryCountdown(input.immigration_status_expiry, now)
    : null;
  return {
    inCanada: true,
    label: IMMIGRATION_STATUS_LABELS[status],
    detail: null,
    expiryText: countdown?.text ?? null,
    expiryUrgency: countdown?.urgency ?? null,
    isGap: false,
    isCritical: false,
  };
}

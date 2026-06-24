import { z } from "zod";

export const IMMIGRATION_STATUS_TYPES = [
  "study_permit",
  "work_permit",
  "pgwp",
  "visitor_record",
  "visitor",
  "bridging_owp",
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
  bridging_owp: "Bridging open work permit",
  permanent_resident: "Permanent resident",
  citizen: "Citizen",
  refugee_claimant: "Refugee claimant",
  no_status: "No status",
  other: "Other",
};

/** Statuses that do not expire. */
export const NO_EXPIRY_STATUSES = new Set<ImmigrationStatusType>([
  "permanent_resident",
  "citizen",
]);

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

export const immigrationStatusSchema = z.object({
  immigration_status: z.enum(IMMIGRATION_STATUS_TYPES).nullable(),
  immigration_status_expiry: optionalDate,
  immigration_status_note: optionalText,
});

export type ImmigrationStatusInput = z.infer<typeof immigrationStatusSchema>;

import { z } from "zod";

export const AGENT_TYPES = [
  "individual",
  "agency",
  "partner",
  "lawyer",
  "consultant",
  "other",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const AGENT_TYPE_LABEL: Record<AgentType, string> = {
  individual: "Individual",
  agency: "Agency",
  partner: "Partner",
  lawyer: "Lawyer",
  consultant: "Consultant",
  other: "Other",
};

// FormData.get returns null for an unrendered field and "" for an empty one;
// treat both as absent so optional validation passes. Mirrors the helper in
// src/lib/validators/staff.ts.
const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      if (typeof v === "string" && v.trim() === "") return undefined;
      return v;
    },
    z.string().max(max, `${label} cannot exceed ${max} characters`).optional(),
  );

const baseAgentFields = {
  name: z.string().trim().min(1, "Name is required").max(200),
  organization: optionalText(200, "Organization"),
  agent_type: z.enum(AGENT_TYPES, { message: "Pick a type" }),
  phone: optionalText(50, "Phone"),
  website: optionalText(200, "Website"),
  // Normalize to the uppercase 2-letter form ref.countries stores, so a
  // free-typed "ca" still matches the FK. Empty → undefined (optional).
  country_code: z.preprocess(
    (v) =>
      typeof v === "string" && v.trim() !== ""
        ? v.trim().toUpperCase()
        : undefined,
    z.string().length(2, "Use a 2-letter country code").optional(),
  ),
  commission_terms: optionalText(500, "Commission terms"),
  notes: optionalText(2000, "Notes"),
};

// Email is required on create because it's the login identity.
export const addAgentSchema = z.object({
  ...baseAgentFields,
  email: z.string().email("Enter a valid email"),
});

export type AddAgentInput = z.infer<typeof addAgentSchema>;

// Email is not editable after creation (it's tied to the auth user); omit it.
export const updateAgentSchema = z.object(baseAgentFields);

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

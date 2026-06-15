import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().email("Enter a valid email").optional(),
);

const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional(),
);

const optionalCountryCode = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().length(2, "Use a 2-letter ISO country code").optional(),
);

// Standalone client capture (e.g., adding a lead before any case exists).
// Full personal-details surface so the retainer, intake forms, and
// emails don't render with blank fields. Legal name is the only hard
// requirement; everything else is optional so a lead can be created
// with partial info and the staff can fill the rest later via the
// intake page.
export const newClientSchema = z.object({
  legal_name_full: z.string().trim().min(1, "Full legal name is required"),
  preferred_name: optionalText,
  // Given/family names: if staff leaves them blank the server derives
  // them from legal_name_full (first word, last word). The form
  // surfaces the derived split inline so staff can override.
  given_names: optionalText,
  family_name: optionalText,
  date_of_birth: optionalDate,
  gender: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .enum(["male", "female", "other", "prefer_not_to_say"])
      .optional(),
  ),
  marital_status: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .enum([
        "single",
        "married",
        "common_law",
        "divorced",
        "widowed",
        "separated",
        "annulled",
      ])
      .optional(),
  ),
  country_of_birth: optionalCountryCode,
  country_of_citizenship: optionalCountryCode,
  country_of_residence: optionalCountryCode,
  preferred_language: optionalText,
  preferred_contact: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.enum(["email", "phone", "whatsapp"]).optional(),
  ),
  email: optionalEmail,
  phone_primary: optionalText,
  phone_whatsapp: optionalText,
  address_line1: optionalText,
  address_line2: optionalText,
  city: optionalText,
  province_state: optionalText,
  postal_code: optionalText,
  country_code: optionalCountryCode,
});

export type NewClientInput = z.infer<typeof newClientSchema>;

// Stricter shape for the case-creation wizard. The retainer agreement
// renders the client's name (split) + mailing address, so we require
// both at case-creation time to avoid re-prompting later.
export const newClientForCaseSchema = newClientSchema.extend({
  given_names: z.string().trim().min(1, "First name is required"),
  family_name: z.string().trim().min(1, "Last name is required"),
  address_line1: z.string().trim().min(1, "Address line 1 is required"),
  address_line2: optionalText,
  city: z.string().trim().min(1, "City is required"),
  province_state: z.string().trim().min(1, "Province/state is required"),
  postal_code: z.string().trim().min(1, "Postal code is required"),
  country_code: z.string().trim().length(2, "Pick a country"),
});

export type NewClientForCaseInput = z.infer<typeof newClientForCaseSchema>;

const feeFields = {
  service_type_id: z.string().uuid("Select a service"),
  rcic_id: z.string().uuid("Select an RCIC"),
  quoted_fee_cad: z.coerce
    .number({ message: "Quoted fee must be a number" })
    .positive("Quoted fee must be greater than 0"),
  retainer_minimum_cad: z.coerce
    .number({ message: "Retainer minimum must be a number" })
    .min(0, "Retainer minimum cannot be negative")
    .optional(),
  government_fee_cad: z.coerce
    .number({ message: "Government fee must be a number" })
    .min(0, "Government fee cannot be negative")
    .optional(),
  retained_at: optionalDate,
  // When false, the auto-created retainer gets hst_cad = 0 so the renderer
  // doesn't apply the default 13%. Defaults to true; the wizard pre-flips
  // it based on the client's country_of_residence (CA / unknown stays on,
  // anything else flips off) and staff can override either way.
  apply_hst: z.boolean().default(true),
};

export const newCaseSchema = z.discriminatedUnion("client_kind", [
  z.object({
    client_kind: z.literal("existing"),
    client_id: z.string().uuid("Pick a client"),
    ...feeFields,
  }),
  z.object({
    client_kind: z.literal("new"),
    new_client: newClientForCaseSchema,
    ...feeFields,
  }),
]);

export type NewCaseInput = z.infer<typeof newCaseSchema>;

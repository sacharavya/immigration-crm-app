"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { BACKGROUND_QUESTION_CODES } from "@/lib/intake/completeness";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

type ClientUpdate = Database["crm"]["Tables"]["clients"]["Update"];
type FamilyInsert =
  Database["crm"]["Tables"]["client_family_members"]["Insert"];
type FamilyUpdate =
  Database["crm"]["Tables"]["client_family_members"]["Update"];
type EducationInsert =
  Database["crm"]["Tables"]["client_education_history"]["Insert"];
type EducationUpdate =
  Database["crm"]["Tables"]["client_education_history"]["Update"];
type EmploymentInsert =
  Database["crm"]["Tables"]["client_employment_history"]["Insert"];
type EmploymentUpdate =
  Database["crm"]["Tables"]["client_employment_history"]["Update"];
type TravelInsert =
  Database["crm"]["Tables"]["client_travel_history"]["Insert"];
type TravelUpdate =
  Database["crm"]["Tables"]["client_travel_history"]["Update"];
type AddressInsert =
  Database["crm"]["Tables"]["client_address_history"]["Insert"];
type AddressUpdate =
  Database["crm"]["Tables"]["client_address_history"]["Update"];
type OrgInsert = Database["crm"]["Tables"]["client_organisations"]["Insert"];
type OrgUpdate = Database["crm"]["Tables"]["client_organisations"]["Update"];
type GovInsert =
  Database["crm"]["Tables"]["client_government_positions"]["Insert"];
type GovUpdate =
  Database["crm"]["Tables"]["client_government_positions"]["Update"];
type MilInsert =
  Database["crm"]["Tables"]["client_military_services"]["Insert"];
type MilUpdate =
  Database["crm"]["Tables"]["client_military_services"]["Update"];

type Result<T = undefined> = T extends undefined
  ? { ok: true } | { error: string }
  : ({ ok: true } & T) | { error: string };

async function gate() {
  const me = await getStaff();
  if (!me) return { ok: false as const, error: "Not authenticated" };
  if (!staffCan(me, "edit_clients")) {
    return {
      ok: false as const,
      error: "You don't have permission to edit this client.",
    };
  }
  return { ok: true as const, me };
}

function rev(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}/intake`);
  revalidatePath(`/dashboard/clients/${clientId}`);
}

// Trim and convert "" to null for nullable text. Keeps the DB clean of
// empty strings and lets the completeness logic treat absence uniformly.
function nullish(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

// ---------------------------------------------------------------------------
// updateClientCore: per-field autosave for the personal section + the six
// new gating booleans. Every field is optional; only provided keys are
// persisted. Centralised so the form doesn't need a separate action per
// column.
// ---------------------------------------------------------------------------

const RELATIONSHIP_VALUES = [
  "father",
  "mother",
  "spouse",
  "common_law_partner",
  "son",
  "daughter",
  "step_son",
  "step_daughter",
  "adopted_son",
  "adopted_daughter",
  "brother",
  "sister",
  "half_brother",
  "half_sister",
  "step_brother",
  "step_sister",
  "guardian",
  "other",
] as const;

const MARITAL_VALUES = [
  "single",
  "married",
  "common_law",
  "divorced",
  "widowed",
  "separated",
  "annulled",
] as const;

const GENDER_VALUES = ["male", "female", "other", "prefer_not_to_say"] as const;

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .nullable()
  .optional();

const optionalCountry = z
  .string()
  .length(2, "Use a 2-letter country code")
  .nullable()
  .optional();

const optionalText = z.string().nullable().optional();
const optionalEmail = z
  .string()
  .email("Enter a valid email")
  .nullable()
  .optional()
  .or(z.literal(""));

const updateClientCoreSchema = z.object({
  clientId: z.string().uuid(),
  patch: z.object({
    legal_name_full: z.string().min(1).max(200).optional(),
    preferred_name: optionalText,
    given_names: optionalText,
    family_name: optionalText,
    date_of_birth: optionalDate,
    gender: z.enum(GENDER_VALUES).nullable().optional(),
    marital_status: z.enum(MARITAL_VALUES).nullable().optional(),
    country_of_birth: optionalCountry,
    country_of_citizenship: optionalCountry,
    country_of_residence: optionalCountry,
    preferred_language: optionalText,
    preferred_contact: optionalText,
    email: optionalEmail,
    phone_primary: optionalText,
    phone_whatsapp: optionalText,
    address_line1: optionalText,
    address_line2: optionalText,
    city: optionalText,
    province_state: optionalText,
    postal_code: optionalText,
    country_code: optionalCountry,
    years_elementary: z.coerce.number().int().min(0).max(40).nullable().optional(),
    years_secondary: z.coerce.number().int().min(0).max(40).nullable().optional(),
    years_post_secondary: z.coerce
      .number()
      .int()
      .min(0)
      .max(40)
      .nullable()
      .optional(),
    years_trade_other: z.coerce
      .number()
      .int()
      .min(0)
      .max(40)
      .nullable()
      .optional(),
    has_children: z.boolean().nullable().optional(),
    has_siblings: z.boolean().nullable().optional(),
    travel_completed: z.boolean().nullable().optional(),
    organisations_member: z.boolean().nullable().optional(),
    government_position_held: z.boolean().nullable().optional(),
    military_service_held: z.boolean().nullable().optional(),
    has_prior_biometrics: z.boolean().nullable().optional(),
  }),
});

export async function updateClientCore(
  input: z.input<typeof updateClientCoreSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = updateClientCoreSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, patch } = parsed.data;

  // Build the actual UPDATE payload, normalising empty strings to null on
  // text fields. Booleans + numbers + enums pass through verbatim.
  const updates: ClientUpdate = {};
  const stringKeys = [
    "legal_name_full",
    "preferred_name",
    "given_names",
    "family_name",
    "preferred_language",
    "preferred_contact",
    "email",
    "phone_primary",
    "phone_whatsapp",
    "address_line1",
    "address_line2",
    "city",
    "province_state",
    "postal_code",
  ] as const;

  for (const key of stringKeys) {
    if (key in patch) {
      const val = patch[key];
      // legal_name_full is non-null; reject empty there. Others go to null.
      if (key === "legal_name_full") {
        if (val === undefined) continue;
        if (val === null || (typeof val === "string" && val.trim() === "")) {
          return { error: "Legal name cannot be empty" };
        }
        updates.legal_name_full = (val as string).trim();
      } else {
        updates[key] = nullish(val as string | null | undefined);
      }
    }
  }

  const passthrough = [
    "date_of_birth",
    "gender",
    "marital_status",
    "country_of_birth",
    "country_of_citizenship",
    "country_of_residence",
    "country_code",
    "years_elementary",
    "years_secondary",
    "years_post_secondary",
    "years_trade_other",
    "has_children",
    "has_siblings",
    "travel_completed",
    "organisations_member",
    "government_position_held",
    "military_service_held",
    "has_prior_biometrics",
  ] as const;

  for (const key of passthrough) {
    if (key in patch) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[key] = patch[key] === undefined ? null : patch[key];
    }
  }

  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("clients")
    .update(updates)
    .eq("id", clientId);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// updateBackgroundResponse
// ---------------------------------------------------------------------------

const backgroundResponseSchema = z.object({
  clientId: z.string().uuid(),
  questionCode: z.enum(BACKGROUND_QUESTION_CODES),
  answer: z.enum(["yes", "no"]),
  details: z.string().nullable().optional(),
});

export async function updateBackgroundResponse(
  input: z.input<typeof backgroundResponseSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = backgroundResponseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, questionCode, answer, details } = parsed.data;

  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .schema("crm")
    .from("clients")
    .select("background_responses")
    .eq("id", clientId)
    .maybeSingle();
  if (fetchErr) return { error: fetchErr.message };
  if (!row) return { error: "Client not found" };

  const current = (row.background_responses ?? {}) as { [k: string]: Json };
  const next: { [k: string]: Json } = {
    ...current,
    [questionCode]: {
      answer,
      details: details === undefined ? null : nullish(details),
    },
  };

  const { error } = await supabase
    .schema("crm")
    .from("clients")
    .update({ background_responses: next })
    .eq("id", clientId);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Family members
// ---------------------------------------------------------------------------

const familyAddSchema = z.object({
  clientId: z.string().uuid(),
  relationship: z.enum(RELATIONSHIP_VALUES),
  full_name: z.string().trim().min(1, "Name is required").max(200),
});

const familyUpdateSchema = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid(),
  patch: z.object({
    relationship: z.enum(RELATIONSHIP_VALUES).optional(),
    full_name: z.string().trim().min(1).max(200).optional(),
    marital_status: z.enum(MARITAL_VALUES).nullable().optional(),
    date_of_birth: optionalDate,
    country_of_birth: optionalCountry,
    present_address: optionalText,
    present_occupation: optionalText,
    is_deceased: z.boolean().optional(),
    deceased_date: optionalDate,
    deceased_location: optionalText,
    accompanying_to_canada: z.boolean().nullable().optional(),
    notes: optionalText,
  }),
});

export async function addFamilyMember(
  input: z.input<typeof familyAddSchema>,
): Promise<Result<{ id: string }>> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = familyAddSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const insert: FamilyInsert = {
    client_id: parsed.data.clientId,
    relationship: parsed.data.relationship,
    full_name: parsed.data.full_name,
  };
  const { data, error } = await supabase
    .schema("crm")
    .from("client_family_members")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };

  rev(parsed.data.clientId);
  return { ok: true, id: data.id };
}

export async function updateFamilyMember(
  input: z.input<typeof familyUpdateSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = familyUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, id, patch } = parsed.data;

  const updates: FamilyUpdate = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "string" && k !== "relationship" && k !== "full_name") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = nullish(v);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_family_members")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

export async function removeFamilyMember(
  clientId: string,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_family_members")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

const EDUCATION_LEVELS = [
  "elementary",
  "secondary",
  "post_secondary",
  "trade_other",
] as const;

const educationAddSchema = z.object({
  clientId: z.string().uuid(),
  institution: z.string().trim().min(1).max(300),
  level: z.enum(EDUCATION_LEVELS).optional(),
});

const educationUpdateSchema = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid(),
  patch: z.object({
    institution: z.string().trim().min(1).max(300).optional(),
    field_of_study: optionalText,
    date_from: optionalDate,
    date_to: optionalDate,
    city: optionalText,
    province_state: optionalText,
    country_code: optionalCountry,
    notes: optionalText,
    level: z.enum(EDUCATION_LEVELS).nullable().optional(),
  }),
});

export async function addEducation(
  input: z.input<typeof educationAddSchema>,
): Promise<Result<{ id: string }>> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = educationAddSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const insert: EducationInsert = {
    client_id: parsed.data.clientId,
    institution: parsed.data.institution,
    ...(parsed.data.level ? { level: parsed.data.level } : {}),
  };
  const { data, error } = await supabase
    .schema("crm")
    .from("client_education_history")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };

  rev(parsed.data.clientId);
  return { ok: true, id: data.id };
}

export async function updateEducation(
  input: z.input<typeof educationUpdateSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = educationUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, id, patch } = parsed.data;

  const updates: EducationUpdate = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "string" && k !== "institution") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = nullish(v);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_education_history")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

export async function removeEducation(
  clientId: string,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_education_history")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Employment
// ---------------------------------------------------------------------------

const employmentAddSchema = z.object({
  clientId: z.string().uuid(),
  occupation: z.string().trim().min(1).max(300),
});

const employmentUpdateSchema = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid(),
  patch: z.object({
    occupation: z.string().trim().min(1).max(300).optional(),
    employer: optionalText,
    activity_type: optionalText,
    date_from: optionalDate,
    date_to: optionalDate,
    is_ongoing: z.boolean().optional(),
    city: optionalText,
    province_state: optionalText,
    country_code: optionalCountry,
    notes: optionalText,
  }),
});

export async function addEmployment(
  input: z.input<typeof employmentAddSchema>,
): Promise<Result<{ id: string }>> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = employmentAddSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const insert: EmploymentInsert = {
    client_id: parsed.data.clientId,
    occupation: parsed.data.occupation,
  };
  const { data, error } = await supabase
    .schema("crm")
    .from("client_employment_history")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };

  rev(parsed.data.clientId);
  return { ok: true, id: data.id };
}

export async function updateEmployment(
  input: z.input<typeof employmentUpdateSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = employmentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, id, patch } = parsed.data;

  const updates: EmploymentUpdate = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "string" && k !== "occupation") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = nullish(v);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_employment_history")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

export async function removeEmployment(
  clientId: string,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_employment_history")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------

const travelAddSchema = z.object({
  clientId: z.string().uuid(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

const travelUpdateSchema = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid(),
  patch: z.object({
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    city: optionalText,
    country_code: optionalCountry,
    purpose: optionalText,
    notes: optionalText,
  }),
});

export async function addTravel(
  input: z.input<typeof travelAddSchema>,
): Promise<Result<{ id: string }>> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = travelAddSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.date_to < parsed.data.date_from) {
    return { error: "End date must be on or after start date" };
  }

  const supabase = await createClient();
  const insert: TravelInsert = {
    client_id: parsed.data.clientId,
    date_from: parsed.data.date_from,
    date_to: parsed.data.date_to,
  };
  const { data, error } = await supabase
    .schema("crm")
    .from("client_travel_history")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };

  rev(parsed.data.clientId);
  return { ok: true, id: data.id };
}

export async function updateTravel(
  input: z.input<typeof travelUpdateSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = travelUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, id, patch } = parsed.data;

  const updates: TravelUpdate = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "string" && k !== "date_from" && k !== "date_to") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = nullish(v);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_travel_history")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

export async function removeTravel(
  clientId: string,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_travel_history")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Address
// ---------------------------------------------------------------------------

const addressAddSchema = z.object({
  clientId: z.string().uuid(),
  address_line: z.string().trim().min(1).max(500),
});

const addressUpdateSchema = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid(),
  patch: z.object({
    address_line: z.string().trim().min(1).max(500).optional(),
    date_from: optionalDate,
    date_to: optionalDate,
    city: optionalText,
    province_state: optionalText,
    country_code: optionalCountry,
    notes: optionalText,
  }),
});

export async function addAddress(
  input: z.input<typeof addressAddSchema>,
): Promise<Result<{ id: string }>> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = addressAddSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const insert: AddressInsert = {
    client_id: parsed.data.clientId,
    address_line: parsed.data.address_line,
  };
  const { data, error } = await supabase
    .schema("crm")
    .from("client_address_history")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };

  rev(parsed.data.clientId);
  return { ok: true, id: data.id };
}

export async function updateAddress(
  input: z.input<typeof addressUpdateSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = addressUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, id, patch } = parsed.data;

  const updates: AddressUpdate = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "string" && k !== "address_line") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = nullish(v);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_address_history")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

export async function removeAddress(
  clientId: string,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_address_history")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Organisations
// ---------------------------------------------------------------------------

const orgAddSchema = z.object({
  clientId: z.string().uuid(),
  organisation_name: z.string().trim().min(1).max(300),
});

const orgUpdateSchema = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid(),
  patch: z.object({
    organisation_name: z.string().trim().min(1).max(300).optional(),
    organisation_type: optionalText,
    position_held: optionalText,
    date_from: optionalDate,
    date_to: optionalDate,
    is_ongoing: z.boolean().optional(),
    city: optionalText,
    province_state: optionalText,
    country_code: optionalCountry,
    notes: optionalText,
  }),
});

export async function addOrganisation(
  input: z.input<typeof orgAddSchema>,
): Promise<Result<{ id: string }>> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = orgAddSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const insert: OrgInsert = {
    client_id: parsed.data.clientId,
    organisation_name: parsed.data.organisation_name,
  };
  const { data, error } = await supabase
    .schema("crm")
    .from("client_organisations")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };

  rev(parsed.data.clientId);
  return { ok: true, id: data.id };
}

export async function updateOrganisation(
  input: z.input<typeof orgUpdateSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = orgUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, id, patch } = parsed.data;

  const updates: OrgUpdate = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "string" && k !== "organisation_name") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = nullish(v);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_organisations")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

export async function removeOrganisation(
  clientId: string,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_organisations")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Government positions
// ---------------------------------------------------------------------------

const govAddSchema = z.object({
  clientId: z.string().uuid(),
});

const govUpdateSchema = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid(),
  patch: z.object({
    level_of_jurisdiction: optionalText,
    department: optionalText,
    position_held: optionalText,
    date_from: optionalDate,
    date_to: optionalDate,
    is_ongoing: z.boolean().optional(),
    city: optionalText,
    province_state: optionalText,
    country_code: optionalCountry,
    notes: optionalText,
  }),
});

export async function addGovernmentPosition(
  input: z.input<typeof govAddSchema>,
): Promise<Result<{ id: string }>> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = govAddSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const insert: GovInsert = { client_id: parsed.data.clientId };
  const { data, error } = await supabase
    .schema("crm")
    .from("client_government_positions")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };

  rev(parsed.data.clientId);
  return { ok: true, id: data.id };
}

export async function updateGovernmentPosition(
  input: z.input<typeof govUpdateSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = govUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, id, patch } = parsed.data;

  const updates: GovUpdate = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "string") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = nullish(v);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_government_positions")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

export async function removeGovernmentPosition(
  clientId: string,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_government_positions")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Military service
// ---------------------------------------------------------------------------

const milAddSchema = z.object({
  clientId: z.string().uuid(),
});

const milUpdateSchema = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid(),
  patch: z.object({
    branch_name: optionalText,
    commanding_officer: optionalText,
    military_rank: optionalText,
    active_combat_details: optionalText,
    reason_for_end_of_service: optionalText,
    date_from: optionalDate,
    date_to: optionalDate,
    is_ongoing: z.boolean().optional(),
    country_code: optionalCountry,
    notes: optionalText,
  }),
});

export async function addMilitaryService(
  input: z.input<typeof milAddSchema>,
): Promise<Result<{ id: string }>> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = milAddSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const insert: MilInsert = { client_id: parsed.data.clientId };
  const { data, error } = await supabase
    .schema("crm")
    .from("client_military_services")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };

  rev(parsed.data.clientId);
  return { ok: true, id: data.id };
}

export async function updateMilitaryService(
  input: z.input<typeof milUpdateSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = milUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, id, patch } = parsed.data;

  const updates: MilUpdate = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "string") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = nullish(v);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_military_services")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

export async function removeMilitaryService(
  clientId: string,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_military_services")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// FLOW-3c — Biometric history (crm.client_biometric_records).
//
// The Yes/No gate is on crm.clients.has_prior_biometrics and rides through
// updateClientCore. Add/Update/Remove handle individual records here. Soft
// delete on remove so any cases referencing the record keep their link;
// remove refuses if any active case still points at the record.
// ---------------------------------------------------------------------------

const biometricAddSchema = z.object({
  clientId: z.string().uuid(),
  date_given: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().trim().max(200).optional(),
  biometrics_type: z.string().trim().max(100).optional(),
  bvn_or_reference: z.string().trim().max(100).optional(),
  application_context: z.string().trim().max(200).optional(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const biometricUpdateSchema = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid(),
  patch: z.object({
    date_given: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    location: z.string().nullable().optional(),
    biometrics_type: z.string().nullable().optional(),
    bvn_or_reference: z.string().nullable().optional(),
    application_context: z.string().nullable().optional(),
    valid_until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    notes: z.string().nullable().optional(),
  }),
});

type BiometricInsert =
  Database["crm"]["Tables"]["client_biometric_records"]["Insert"];
type BiometricUpdate =
  Database["crm"]["Tables"]["client_biometric_records"]["Update"];

function plusYearsIso(iso: string, years: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export async function addBiometricRecord(
  input: z.input<typeof biometricAddSchema>,
): Promise<Result<{ id: string }>> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = biometricAddSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();

  // display_order = max existing + 10 for this client, or 100 if first.
  const { data: existing } = await supabase
    .schema("crm")
    .from("client_biometric_records")
    .select("display_order")
    .eq("client_id", data.clientId)
    .is("deleted_at", null)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const display_order = existing ? existing.display_order + 10 : 100;

  const insert: BiometricInsert = {
    client_id: data.clientId,
    date_given: data.date_given,
    location: data.location ?? null,
    biometrics_type: data.biometrics_type ?? "Fingerprints + Photo",
    bvn_or_reference: data.bvn_or_reference ?? null,
    application_context: data.application_context ?? null,
    valid_until: data.valid_until ?? plusYearsIso(data.date_given, 10),
    notes: data.notes ?? null,
    display_order,
    created_by: g.me.id,
  };

  const { data: row, error } = await supabase
    .schema("crm")
    .from("client_biometric_records")
    .insert(insert)
    .select("id")
    .single();
  if (error || !row) return { error: error?.message ?? "Insert failed" };

  rev(data.clientId);
  return { ok: true, id: row.id };
}

export async function updateBiometricRecord(
  input: z.input<typeof biometricUpdateSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = biometricUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { clientId, id, patch } = parsed.data;

  const updates: BiometricUpdate = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "string" && k !== "date_given" && k !== "valid_until") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = nullish(v);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("client_biometric_records")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

export async function removeBiometricRecord(
  clientId: string,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();

  // Refuse if any non-deleted case still references this record. Soft delete
  // would leave dangling links otherwise, since the row stays in the table.
  const { count } = await supabase
    .schema("crm")
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("biometrics_record_id", id)
    .is("deleted_at", null);
  if ((count ?? 0) > 0) {
    return {
      error: `Cannot remove: ${count} case${count === 1 ? "" : "s"} reference${count === 1 ? "s" : ""} this biometric record. Unlink from each case first.`,
    };
  }

  const { error } = await supabase
    .schema("crm")
    .from("client_biometric_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  rev(clientId);
  return { ok: true };
}

// FORMS-3: read-only adapter from the intake data model to the canonical
// applicant profile. Never writes; intake tables and UI stay untouched.
//
// Server-side only (needs a Supabase client with staff RLS or service
// role). The result is plain JSON: the fill engine snapshots it verbatim
// into form_fills.profile_snapshot_json.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import { splitName, toE164 } from "./normalize";
import type { ApplicantProfile } from "./profile";

type Db = SupabaseClient<Database>;

type FamilyRow =
  Database["crm"]["Tables"]["client_family_members"]["Row"];

const CHILD_REL = new Set([
  "son",
  "daughter",
  "step_son",
  "step_daughter",
  "adopted_son",
  "adopted_daughter",
]);
const SIBLING_REL = new Set([
  "brother",
  "sister",
  "half_brother",
  "half_sister",
  "step_brother",
  "step_sister",
]);

function familyPerson(row: FamilyRow) {
  const split = splitName(row.full_name);
  return {
    full_name: row.full_name,
    given_name: split.given,
    family_name: split.family,
    dob: row.date_of_birth,
    country_of_birth: row.country_of_birth,
    marital_status: row.marital_status,
    occupation: row.present_occupation,
    address: row.present_address,
    accompanying_to_canada: row.accompanying_to_canada,
    is_deceased: row.is_deceased,
  };
}

export async function buildClientProfile(
  supabase: Db,
  clientId: string,
): Promise<ApplicantProfile> {
  const crm = supabase.schema("crm");
  const byOrder = { ascending: true } as const;

  const [
    { data: client },
    { data: family },
    { data: education },
    { data: employment },
    { data: travel },
    { data: addresses },
    { data: organisations },
    { data: government },
    { data: military },
    { data: biometrics },
  ] = await Promise.all([
    crm.from("clients").select("*").eq("id", clientId).maybeSingle(),
    crm.from("client_family_members").select("*").eq("client_id", clientId).order("display_order", byOrder),
    crm.from("client_education_history").select("*").eq("client_id", clientId).order("display_order", byOrder),
    crm.from("client_employment_history").select("*").eq("client_id", clientId).order("display_order", byOrder),
    crm.from("client_travel_history").select("*").eq("client_id", clientId).order("display_order", byOrder),
    crm.from("client_address_history").select("*").eq("client_id", clientId).order("display_order", byOrder),
    crm.from("client_organisations").select("*").eq("client_id", clientId).order("display_order", byOrder),
    crm.from("client_government_positions").select("*").eq("client_id", clientId).order("display_order", byOrder),
    crm.from("client_military_services").select("*").eq("client_id", clientId).order("display_order", byOrder),
    crm.from("client_biometric_records").select("*").eq("client_id", clientId).is("deleted_at", null).order("display_order", byOrder),
  ]);

  if (!client) {
    throw new Error("Client not found for profile build");
  }

  // Split names: stored given/family win; otherwise derive from the legal
  // name so every profile has both halves populated when possible.
  const derived = splitName(client.legal_name_full);
  const given = client.given_names ?? derived.given;
  const familyName = client.family_name ?? derived.family;

  const fam = family ?? [];
  const spouseRow = fam.find(
    (f) => f.relationship === "spouse" || f.relationship === "common_law_partner",
  );
  const fatherRow = fam.find((f) => f.relationship === "father");
  const motherRow = fam.find((f) => f.relationship === "mother");

  return {
    applicant: {
      legal_name_full: client.legal_name_full,
      given_name: given,
      family_name: familyName,
      preferred_name: client.preferred_name,
      dob: client.date_of_birth,
      sex: client.gender,
      marital_status: client.marital_status,
      email: client.email,
      phone: toE164(client.phone_primary),
      phone_whatsapp: toE164(client.phone_whatsapp),
      uci: client.uci,
      country_of_birth: client.country_of_birth,
      country_of_citizenship: client.country_of_citizenship,
      country_of_residence: client.country_of_residence,
      address: {
        line1: client.address_line1,
        line2: client.address_line2,
        city: client.city,
        province: client.province_state,
        postal_code: client.postal_code,
        country: client.country_code,
      },
      immigration: {
        status: client.immigration_status,
        status_expiry: client.immigration_status_expiry,
        in_canada: client.immigration_in_canada,
      },
      address_history: (addresses ?? []).map((a) => ({
        street: a.address_line,
        city: a.city,
        province: a.province_state,
        country: a.country_code,
        start_date: a.date_from,
        end_date: a.date_to,
      })),
      employment_history: (employment ?? []).map((e) => ({
        occupation: e.occupation,
        employer: e.employer,
        activity_type: e.activity_type,
        city: e.city,
        province: e.province_state,
        country: e.country_code,
        is_ongoing: e.is_ongoing,
        start_date: e.date_from,
        end_date: e.date_to,
      })),
      education: (education ?? []).map((e) => ({
        institution: e.institution,
        level: e.level,
        field_of_study: e.field_of_study,
        city: e.city,
        province: e.province_state,
        country: e.country_code,
        start_date: e.date_from,
        end_date: e.date_to,
      })),
      travel_history: (travel ?? []).map((t) => ({
        country: t.country_code,
        city: t.city,
        purpose: t.purpose,
        days: t.days,
        start_date: t.date_from,
        end_date: t.date_to,
      })),
      organisations: (organisations ?? []).map((o) => ({
        name: o.organisation_name,
        type: o.organisation_type,
        position: o.position_held,
        city: o.city,
        country: o.country_code,
        start_date: o.date_from,
        end_date: o.date_to,
      })),
      government_positions: (government ?? []).map((g) => ({
        department: g.department,
        position: g.position_held,
        jurisdiction: g.level_of_jurisdiction,
        city: g.city,
        country: g.country_code,
        start_date: g.date_from,
        end_date: g.date_to,
      })),
      military_services: (military ?? []).map((m) => ({
        country: m.country_code,
        branch: m.branch_name,
        rank: m.military_rank,
        commanding_officer: m.commanding_officer,
        end_reason: m.reason_for_end_of_service,
        start_date: m.date_from,
        end_date: m.date_to,
      })),
      biometrics: (biometrics ?? []).map((b) => ({
        date_given: b.date_given,
        valid_until: b.valid_until,
        reference: b.bvn_or_reference,
        type: b.biometrics_type,
        location: b.location,
      })),
      family: {
        spouse: spouseRow ? familyPerson(spouseRow) : undefined,
        father: fatherRow ? familyPerson(fatherRow) : undefined,
        mother: motherRow ? familyPerson(motherRow) : undefined,
        children: fam.filter((f) => CHILD_REL.has(f.relationship)).map(familyPerson),
        siblings: fam.filter((f) => SIBLING_REL.has(f.relationship)).map(familyPerson),
      },
    },
  };
}

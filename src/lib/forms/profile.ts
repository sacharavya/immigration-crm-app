// FORMS-3: the canonical applicant profile.
//
// The fill engine reads from this shape via dot paths; the mapping editor
// picks from PROFILE_PATHS. Built from the intake data model (crm.clients +
// satellite tables) by the adapter; this module is pure shape + resolution.
//
// Known gap: intake does not collect passport details yet, so there are no
// applicant.passport.* paths. Add them here and in the adapter when intake
// grows those fields.

export type ProfileValueType =
  | "string"
  | "date"
  | "partial_date"
  | "country_code"
  | "boolean"
  | "number"
  | "enum";

export type ProfilePathSpec = {
  // "[]" marks the array hop: "applicant.address_history[].city".
  path: string;
  type: ProfileValueType;
  enumValues?: readonly string[];
};

type Person = {
  full_name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  dob?: string | null;
  country_of_birth?: string | null;
  marital_status?: string | null;
  occupation?: string | null;
  address?: string | null;
  accompanying_to_canada?: boolean | null;
  is_deceased?: boolean | null;
};

type DateRanged = {
  start_date?: string | null;
  end_date?: string | null;
};

export type ApplicantProfile = {
  applicant: {
    legal_name_full?: string | null;
    given_name?: string | null;
    family_name?: string | null;
    preferred_name?: string | null;
    dob?: string | null;
    sex?: string | null;
    marital_status?: string | null;
    email?: string | null;
    phone?: string | null;
    phone_whatsapp?: string | null;
    uci?: string | null;
    country_of_birth?: string | null;
    country_of_citizenship?: string | null;
    country_of_residence?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      province?: string | null;
      postal_code?: string | null;
      country?: string | null;
    };
    immigration?: {
      status?: string | null;
      status_expiry?: string | null;
      in_canada?: boolean | null;
    };
    address_history?: Array<
      DateRanged & {
        street?: string | null;
        city?: string | null;
        province?: string | null;
        country?: string | null;
      }
    >;
    employment_history?: Array<
      DateRanged & {
        occupation?: string | null;
        employer?: string | null;
        activity_type?: string | null;
        city?: string | null;
        province?: string | null;
        country?: string | null;
        is_ongoing?: boolean | null;
      }
    >;
    education?: Array<
      DateRanged & {
        institution?: string | null;
        level?: string | null;
        field_of_study?: string | null;
        city?: string | null;
        province?: string | null;
        country?: string | null;
      }
    >;
    travel_history?: Array<
      DateRanged & {
        country?: string | null;
        city?: string | null;
        purpose?: string | null;
        days?: number | null;
      }
    >;
    organisations?: Array<
      DateRanged & {
        name?: string | null;
        type?: string | null;
        position?: string | null;
        city?: string | null;
        country?: string | null;
      }
    >;
    government_positions?: Array<
      DateRanged & {
        department?: string | null;
        position?: string | null;
        jurisdiction?: string | null;
        city?: string | null;
        country?: string | null;
      }
    >;
    military_services?: Array<
      DateRanged & {
        country?: string | null;
        branch?: string | null;
        rank?: string | null;
        commanding_officer?: string | null;
        end_reason?: string | null;
      }
    >;
    biometrics?: Array<{
      date_given?: string | null;
      valid_until?: string | null;
      reference?: string | null;
      type?: string | null;
      location?: string | null;
    }>;
    family?: {
      spouse?: Person;
      father?: Person;
      mother?: Person;
      children?: Person[];
      siblings?: Person[];
    };
  };
};

const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;
const MARITAL = [
  "single",
  "married",
  "common_law",
  "divorced",
  "widowed",
  "separated",
  "annulled",
] as const;

function person(prefix: string): ProfilePathSpec[] {
  return [
    { path: `${prefix}.full_name`, type: "string" },
    { path: `${prefix}.given_name`, type: "string" },
    { path: `${prefix}.family_name`, type: "string" },
    { path: `${prefix}.dob`, type: "date" },
    { path: `${prefix}.country_of_birth`, type: "country_code" },
    { path: `${prefix}.marital_status`, type: "enum", enumValues: MARITAL },
    { path: `${prefix}.occupation`, type: "string" },
    { path: `${prefix}.address`, type: "string" },
    { path: `${prefix}.accompanying_to_canada`, type: "boolean" },
    { path: `${prefix}.is_deceased`, type: "boolean" },
  ];
}

function ranged(prefix: string, extra: ProfilePathSpec[]): ProfilePathSpec[] {
  return [
    ...extra,
    { path: `${prefix}.start_date`, type: "date" },
    { path: `${prefix}.end_date`, type: "date" },
  ];
}

export const PROFILE_PATHS: readonly ProfilePathSpec[] = [
  { path: "applicant.legal_name_full", type: "string" },
  { path: "applicant.given_name", type: "string" },
  { path: "applicant.family_name", type: "string" },
  { path: "applicant.preferred_name", type: "string" },
  { path: "applicant.dob", type: "date" },
  { path: "applicant.sex", type: "enum", enumValues: GENDERS },
  { path: "applicant.marital_status", type: "enum", enumValues: MARITAL },
  { path: "applicant.email", type: "string" },
  { path: "applicant.phone", type: "string" },
  { path: "applicant.phone_whatsapp", type: "string" },
  { path: "applicant.uci", type: "string" },
  { path: "applicant.country_of_birth", type: "country_code" },
  { path: "applicant.country_of_citizenship", type: "country_code" },
  { path: "applicant.country_of_residence", type: "country_code" },
  { path: "applicant.address.line1", type: "string" },
  { path: "applicant.address.line2", type: "string" },
  { path: "applicant.address.city", type: "string" },
  { path: "applicant.address.province", type: "string" },
  { path: "applicant.address.postal_code", type: "string" },
  { path: "applicant.address.country", type: "country_code" },
  { path: "applicant.immigration.status", type: "string" },
  { path: "applicant.immigration.status_expiry", type: "date" },
  { path: "applicant.immigration.in_canada", type: "boolean" },
  ...ranged("applicant.address_history[]", [
    { path: "applicant.address_history[].street", type: "string" },
    { path: "applicant.address_history[].city", type: "string" },
    { path: "applicant.address_history[].province", type: "string" },
    { path: "applicant.address_history[].country", type: "country_code" },
  ]),
  ...ranged("applicant.employment_history[]", [
    { path: "applicant.employment_history[].occupation", type: "string" },
    { path: "applicant.employment_history[].employer", type: "string" },
    { path: "applicant.employment_history[].activity_type", type: "string" },
    { path: "applicant.employment_history[].city", type: "string" },
    { path: "applicant.employment_history[].province", type: "string" },
    { path: "applicant.employment_history[].country", type: "country_code" },
    { path: "applicant.employment_history[].is_ongoing", type: "boolean" },
  ]),
  ...ranged("applicant.education[]", [
    { path: "applicant.education[].institution", type: "string" },
    { path: "applicant.education[].level", type: "string" },
    { path: "applicant.education[].field_of_study", type: "string" },
    { path: "applicant.education[].city", type: "string" },
    { path: "applicant.education[].province", type: "string" },
    { path: "applicant.education[].country", type: "country_code" },
  ]),
  ...ranged("applicant.travel_history[]", [
    { path: "applicant.travel_history[].country", type: "country_code" },
    { path: "applicant.travel_history[].city", type: "string" },
    { path: "applicant.travel_history[].purpose", type: "string" },
    { path: "applicant.travel_history[].days", type: "number" },
  ]),
  ...ranged("applicant.organisations[]", [
    { path: "applicant.organisations[].name", type: "string" },
    { path: "applicant.organisations[].type", type: "string" },
    { path: "applicant.organisations[].position", type: "string" },
    { path: "applicant.organisations[].city", type: "string" },
    { path: "applicant.organisations[].country", type: "country_code" },
  ]),
  ...ranged("applicant.government_positions[]", [
    { path: "applicant.government_positions[].department", type: "string" },
    { path: "applicant.government_positions[].position", type: "string" },
    { path: "applicant.government_positions[].jurisdiction", type: "string" },
    { path: "applicant.government_positions[].city", type: "string" },
    { path: "applicant.government_positions[].country", type: "country_code" },
  ]),
  ...ranged("applicant.military_services[]", [
    { path: "applicant.military_services[].country", type: "country_code" },
    { path: "applicant.military_services[].branch", type: "string" },
    { path: "applicant.military_services[].rank", type: "string" },
    { path: "applicant.military_services[].commanding_officer", type: "string" },
    { path: "applicant.military_services[].end_reason", type: "string" },
  ]),
  { path: "applicant.biometrics[].date_given", type: "date" },
  { path: "applicant.biometrics[].valid_until", type: "date" },
  { path: "applicant.biometrics[].reference", type: "string" },
  { path: "applicant.biometrics[].type", type: "string" },
  { path: "applicant.biometrics[].location", type: "string" },
  ...person("applicant.family.spouse"),
  ...person("applicant.family.father"),
  ...person("applicant.family.mother"),
  ...person("applicant.family.children[]"),
  ...person("applicant.family.siblings[]"),
];

export function isArrayPath(path: string): boolean {
  return path.includes("[]");
}

// Resolves a catalog path against a profile. For array paths, arrayIndex
// picks the element (default 0). Returns undefined when anything along the
// way is missing or out of range.
export function resolveProfilePath(
  profile: ApplicantProfile,
  path: string,
  arrayIndex = 0,
): unknown {
  const segments = path.split(".");
  let cursor: unknown = profile;
  for (const seg of segments) {
    if (cursor === null || cursor === undefined) return undefined;
    if (seg.endsWith("[]")) {
      const arr = (cursor as Record<string, unknown>)[seg.slice(0, -2)];
      if (!Array.isArray(arr)) return undefined;
      cursor = arr[arrayIndex];
    } else {
      cursor = (cursor as Record<string, unknown>)[seg];
    }
  }
  return cursor;
}

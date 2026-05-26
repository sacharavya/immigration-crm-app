import type { Database } from "@/lib/supabase/types";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type FamilyRow = Database["crm"]["Tables"]["client_family_members"]["Row"];
type EducationRow = Database["crm"]["Tables"]["client_education_history"]["Row"];
type EmploymentRow =
  Database["crm"]["Tables"]["client_employment_history"]["Row"];
type TravelRow = Database["crm"]["Tables"]["client_travel_history"]["Row"];
type AddressRow = Database["crm"]["Tables"]["client_address_history"]["Row"];
type OrganisationRow =
  Database["crm"]["Tables"]["client_organisations"]["Row"];
type GovernmentRow =
  Database["crm"]["Tables"]["client_government_positions"]["Row"];
type MilitaryRow =
  Database["crm"]["Tables"]["client_military_services"]["Row"];
type BiometricRow =
  Database["crm"]["Tables"]["client_biometric_records"]["Row"];

export type IntakeSection =
  | "personal"
  | "family_parents_spouse"
  | "family_children"
  | "family_siblings"
  | "education"
  | "employment"
  | "travel"
  | "biometrics"
  | "addresses"
  | "background"
  | "organisations"
  | "government"
  | "military";

export type SectionStatus = {
  section: IntakeSection;
  label: string;
  isComplete: boolean;
  reason?: string;
};

export type IntakeRelated = {
  family: FamilyRow[];
  education: EducationRow[];
  employment: EmploymentRow[];
  travel: TravelRow[];
  addresses: AddressRow[];
  organisations: OrganisationRow[];
  government: GovernmentRow[];
  military: MilitaryRow[];
  biometrics: BiometricRow[];
};

// The 11 Schedule A Section 3 background question codes.
// Question text lives in the UI; codes are stable identifiers.
export const BACKGROUND_QUESTION_CODES = [
  "3a",
  "3b",
  "3c",
  "3d",
  "3e",
  "3f",
  "3g",
  "3h",
  "3i",
  "3j",
  "3k",
] as const;

export type BackgroundQuestionCode = (typeof BACKGROUND_QUESTION_CODES)[number];

export type BackgroundResponse = {
  answer: "yes" | "no";
  details?: string | null;
};

export type BackgroundResponses = Partial<
  Record<BackgroundQuestionCode, BackgroundResponse>
>;

const PARENT_RELATIONSHIPS = ["father", "mother"] as const;
const SPOUSE_RELATIONSHIPS = ["spouse", "common_law_partner"] as const;
const CHILDREN_RELATIONSHIPS = [
  "son",
  "daughter",
  "step_son",
  "step_daughter",
  "adopted_son",
  "adopted_daughter",
] as const;
const SIBLING_RELATIONSHIPS = [
  "brother",
  "sister",
  "half_brother",
  "half_sister",
  "step_brother",
  "step_sister",
] as const;

const SPOUSE_TRIGGERING_MARITAL: ReadonlySet<string> = new Set([
  "married",
  "common_law",
]);

function checkPersonal(client: ClientRow): SectionStatus {
  const missing: string[] = [];
  if (!client.legal_name_full || client.legal_name_full.trim() === "") {
    missing.push("legal name");
  }
  if (!client.date_of_birth) missing.push("DOB");
  if (!client.country_of_citizenship) missing.push("citizenship");

  return {
    section: "personal",
    label: "Personal Details",
    isComplete: missing.length === 0,
    reason:
      missing.length === 0
        ? undefined
        : `Missing ${missing.join(" / ")}`,
  };
}

function checkParentsSpouse(
  client: ClientRow,
  family: FamilyRow[],
): SectionStatus {
  const hasParent = family.some((f) =>
    (PARENT_RELATIONSHIPS as readonly string[]).includes(f.relationship),
  );
  if (!hasParent) {
    return {
      section: "family_parents_spouse",
      label: "Family — Parents & Spouse",
      isComplete: false,
      reason: "Add at least one parent",
    };
  }

  if (
    client.marital_status &&
    SPOUSE_TRIGGERING_MARITAL.has(client.marital_status)
  ) {
    const hasSpouse = family.some((f) =>
      (SPOUSE_RELATIONSHIPS as readonly string[]).includes(f.relationship),
    );
    if (!hasSpouse) {
      return {
        section: "family_parents_spouse",
        label: "Family — Parents & Spouse",
        isComplete: false,
        reason: "Spouse required for married client",
      };
    }
  }

  return {
    section: "family_parents_spouse",
    label: "Family — Parents & Spouse",
    isComplete: true,
  };
}

function checkChildren(
  client: ClientRow,
  family: FamilyRow[],
): SectionStatus {
  if (client.has_children === null || client.has_children === undefined) {
    return {
      section: "family_children",
      label: "Family — Children",
      isComplete: false,
      reason: "Confirm whether client has children",
    };
  }
  if (client.has_children) {
    const hasChild = family.some((f) =>
      (CHILDREN_RELATIONSHIPS as readonly string[]).includes(f.relationship),
    );
    if (!hasChild) {
      return {
        section: "family_children",
        label: "Family — Children",
        isComplete: false,
        reason: "Add at least one child",
      };
    }
  }
  return {
    section: "family_children",
    label: "Family — Children",
    isComplete: true,
  };
}

function checkSiblings(
  client: ClientRow,
  family: FamilyRow[],
): SectionStatus {
  if (client.has_siblings === null || client.has_siblings === undefined) {
    return {
      section: "family_siblings",
      label: "Family — Siblings",
      isComplete: false,
      reason: "Confirm whether client has siblings",
    };
  }
  if (client.has_siblings) {
    const hasSibling = family.some((f) =>
      (SIBLING_RELATIONSHIPS as readonly string[]).includes(f.relationship),
    );
    if (!hasSibling) {
      return {
        section: "family_siblings",
        label: "Family — Siblings",
        isComplete: false,
        reason: "Add at least one sibling",
      };
    }
  }
  return {
    section: "family_siblings",
    label: "Family — Siblings",
    isComplete: true,
  };
}

function checkEducation(
  _client: ClientRow,
  education: EducationRow[],
): SectionStatus {
  if (education.length === 0) {
    return {
      section: "education",
      label: "Education",
      isComplete: false,
      reason: "Add at least one education entry",
    };
  }
  // Each row should have a level + institution + a usable date range so
  // the auto-computed years summary has something to show.
  const hasUsable = education.some(
    (e) =>
      e.level !== null &&
      e.institution !== null &&
      e.institution.trim() !== "" &&
      e.date_from !== null &&
      e.date_to !== null,
  );
  if (!hasUsable) {
    return {
      section: "education",
      label: "Education",
      isComplete: false,
      reason: "Set level + institution + dates on at least one entry",
    };
  }
  return {
    section: "education",
    label: "Education",
    isComplete: true,
  };
}

function checkEmployment(employment: EmploymentRow[]): SectionStatus {
  const todayIso = new Date().toISOString().slice(0, 10);
  const hasCurrent = employment.some(
    (e) => e.is_ongoing || e.date_to === null || e.date_to >= todayIso,
  );
  if (!hasCurrent) {
    return {
      section: "employment",
      label: "Personal History",
      isComplete: false,
      reason: "Add a current/ongoing entry",
    };
  }
  return {
    section: "employment",
    label: "Personal History",
    isComplete: true,
  };
}

function checkTravel(client: ClientRow, travel: TravelRow[]): SectionStatus {
  if (
    client.travel_completed === null ||
    client.travel_completed === undefined
  ) {
    return {
      section: "travel",
      label: "Travel History",
      isComplete: false,
      reason: "Confirm whether client has international travel history",
    };
  }
  if (client.travel_completed && travel.length === 0) {
    return {
      section: "travel",
      label: "Travel History",
      isComplete: false,
      reason: "Add at least one trip",
    };
  }
  return {
    section: "travel",
    label: "Travel History",
    isComplete: true,
  };
}

function checkAddresses(addresses: AddressRow[]): SectionStatus {
  if (addresses.length === 0) {
    return {
      section: "addresses",
      label: "Address History",
      isComplete: false,
      reason: "Add at least one address",
    };
  }
  const hasCurrent = addresses.some((a) => a.date_to === null);
  if (!hasCurrent) {
    return {
      section: "addresses",
      label: "Address History",
      isComplete: false,
      reason: "Add a current address (no end date)",
    };
  }
  return {
    section: "addresses",
    label: "Address History",
    isComplete: true,
  };
}

function checkBackground(client: ClientRow): SectionStatus {
  const responses = (client.background_responses ?? {}) as BackgroundResponses;
  const answered = BACKGROUND_QUESTION_CODES.filter((code) => {
    const r = responses[code];
    return r && (r.answer === "yes" || r.answer === "no");
  });
  if (answered.length === BACKGROUND_QUESTION_CODES.length) {
    return {
      section: "background",
      label: "Background Questions",
      isComplete: true,
    };
  }
  const missing = BACKGROUND_QUESTION_CODES.length - answered.length;
  return {
    section: "background",
    label: "Background Questions",
    isComplete: false,
    reason: `${missing} of ${BACKGROUND_QUESTION_CODES.length} background questions unanswered`,
  };
}

function checkOrganisations(
  client: ClientRow,
  organisations: OrganisationRow[],
): SectionStatus {
  if (
    client.organisations_member === null ||
    client.organisations_member === undefined
  ) {
    return {
      section: "organisations",
      label: "Organisation Memberships",
      isComplete: false,
      reason: "Answer the organisation membership question",
    };
  }
  if (client.organisations_member && organisations.length === 0) {
    return {
      section: "organisations",
      label: "Organisation Memberships",
      isComplete: false,
      reason: "Add at least one organisation",
    };
  }
  return {
    section: "organisations",
    label: "Organisation Memberships",
    isComplete: true,
  };
}

function checkGovernment(
  client: ClientRow,
  government: GovernmentRow[],
): SectionStatus {
  if (
    client.government_position_held === null ||
    client.government_position_held === undefined
  ) {
    return {
      section: "government",
      label: "Government Positions",
      isComplete: false,
      reason: "Answer the government position question",
    };
  }
  if (client.government_position_held && government.length === 0) {
    return {
      section: "government",
      label: "Government Positions",
      isComplete: false,
      reason: "Add at least one position",
    };
  }
  return {
    section: "government",
    label: "Government Positions",
    isComplete: true,
  };
}

function checkBiometrics(
  client: ClientRow,
  biometrics: BiometricRow[],
): SectionStatus {
  if (
    client.has_prior_biometrics === null ||
    client.has_prior_biometrics === undefined
  ) {
    return {
      section: "biometrics",
      label: "Biometrics History",
      isComplete: false,
      reason: "Confirm whether client has given biometrics before",
    };
  }
  if (client.has_prior_biometrics && biometrics.length === 0) {
    return {
      section: "biometrics",
      label: "Biometrics History",
      isComplete: false,
      reason: "Add at least one biometric record",
    };
  }
  return {
    section: "biometrics",
    label: "Biometrics History",
    isComplete: true,
  };
}

function checkMilitary(
  client: ClientRow,
  military: MilitaryRow[],
): SectionStatus {
  if (
    client.military_service_held === null ||
    client.military_service_held === undefined
  ) {
    return {
      section: "military",
      label: "Military Service",
      isComplete: false,
      reason: "Answer the military service question",
    };
  }
  if (client.military_service_held && military.length === 0) {
    return {
      section: "military",
      label: "Military Service",
      isComplete: false,
      reason: "Add at least one service entry",
    };
  }
  return {
    section: "military",
    label: "Military Service",
    isComplete: true,
  };
}

export function getIntakeStatus(
  client: ClientRow,
  related: IntakeRelated,
): SectionStatus[] {
  return [
    checkPersonal(client),
    checkParentsSpouse(client, related.family),
    checkChildren(client, related.family),
    checkSiblings(client, related.family),
    checkEducation(client, related.education),
    checkEmployment(related.employment),
    checkTravel(client, related.travel),
    checkBiometrics(client, related.biometrics),
    checkAddresses(related.addresses),
    checkBackground(client),
    checkOrganisations(client, related.organisations),
    checkGovernment(client, related.government),
    checkMilitary(client, related.military),
  ];
}

export function getIntakeProgress(
  client: ClientRow,
  related: IntakeRelated,
): {
  complete: number;
  total: number;
  sections: SectionStatus[];
} {
  const sections = getIntakeStatus(client, related);
  const complete = sections.filter((s) => s.isComplete).length;
  return { complete, total: sections.length, sections };
}

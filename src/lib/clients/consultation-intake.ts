// Shared mapping of consultation-booking intake fields onto a client, used by
// both the public booking flow and the staff new-appointment dialog so the two
// never drift. Scalars map to client columns; education/occupation/language go
// into the consultation_intake JSONB (no dedicated columns).

export type ConsultationIntakeInput = {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  date_of_birth?: string | null;
  marital_status?: string | null;
  highest_education?: string | null;
  language_test?: string | null;
  language_score?: string | null;
  occupation?: string | null;
};

type MaritalStatus =
  | "single"
  | "married"
  | "common_law"
  | "divorced"
  | "widowed"
  | "separated"
  | "annulled";

const MARITAL_VALUES = new Set<MaritalStatus>([
  "single",
  "married",
  "common_law",
  "divorced",
  "widowed",
  "separated",
  "annulled",
]);

const clean = (s: string | null | undefined) => s?.trim() || null;

// Scalar client columns — safe to set on both new and existing clients.
export function consultationIntakeScalars(d: ConsultationIntakeInput) {
  const dob =
    d.date_of_birth && /^\d{4}-\d{2}-\d{2}$/.test(d.date_of_birth)
      ? d.date_of_birth
      : null;
  const marital = d.marital_status?.trim() ?? "";
  return {
    address_line1: clean(d.address),
    city: clean(d.city),
    province_state: clean(d.province),
    postal_code: clean(d.postal_code),
    date_of_birth: dob,
    marital_status: MARITAL_VALUES.has(marital as MaritalStatus)
      ? (marital as MaritalStatus)
      : null,
  };
}

// consultation_intake JSONB — fields with no dedicated column.
export function consultationIntakeJsonb(d: ConsultationIntakeInput) {
  return {
    consultation_intake: {
      highest_education: clean(d.highest_education),
      occupation: clean(d.occupation),
      language_test: clean(d.language_test),
      language_score: clean(d.language_score),
    },
  };
}

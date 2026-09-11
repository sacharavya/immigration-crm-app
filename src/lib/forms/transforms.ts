// FORMS-3: the transform registry. A mapping entry may name one transform
// applied to the resolved profile value before it is written into the form.
//
// Transforms are pure and synchronous. Context carries lookup data the
// transform itself cannot know (country display names from ref.countries).

export type TransformContext = {
  // ISO 3166-1 alpha-2 -> display name, from ref.countries.
  countryNames: Record<string, string>;
};

export type TransformKey =
  | "date_ddmmyyyy"
  | "date_yyyymmdd"
  | "uppercase"
  | "country_name"
  | "yes_no"
  | "checkbox_from_bool";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

type TransformFn = (value: unknown, ctx: TransformContext) => unknown;

export const TRANSFORMS: Record<TransformKey, TransformFn> = {
  // "2001-08-21" -> "21/08/2001". Non-dates pass through unchanged.
  date_ddmmyyyy: (v) => {
    const m = typeof v === "string" ? v.match(ISO_DATE_RE) : null;
    return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
  },
  // "2001-08-21T..." -> "2001-08-21"; already-ISO dates pass through.
  date_yyyymmdd: (v) => {
    const m = typeof v === "string" ? v.match(ISO_DATE_RE) : null;
    return m ? `${m[1]}-${m[2]}-${m[3]}` : v;
  },
  uppercase: (v) => (typeof v === "string" ? v.toUpperCase() : v),
  country_name: (v, ctx) =>
    typeof v === "string" ? (ctx.countryNames[v.toUpperCase()] ?? v) : v,
  yes_no: (v) => (v === true ? "Yes" : v === false ? "No" : ""),
  // Kept boolean; the fill engine decides how the target field consumes it.
  checkbox_from_bool: (v) => v === true,
};

export const TRANSFORM_KEYS = Object.keys(TRANSFORMS) as TransformKey[];

export function isTransformKey(k: string): k is TransformKey {
  return k in TRANSFORMS;
}

export function applyTransform(
  key: string | undefined,
  value: unknown,
  ctx: TransformContext,
): unknown {
  if (!key) return value;
  if (!isTransformKey(key)) return value;
  return TRANSFORMS[key](value, ctx);
}

// Display humanization for client records.
//
// Raw codes look unfinished in the UI: a citizenship of "NP" or a language of
// "en" reads as a data dump, not a profile. These pure helpers turn the stored
// values into human strings. No I/O, safe on the server or the client.
//
// Stored values may already be full names (older rows captured free text), so
// every helper degrades gracefully: it humanizes what it recognises as a code
// and returns the trimmed input untouched otherwise.

let regionDisplay: Intl.DisplayNames | null = null;
let languageDisplay: Intl.DisplayNames | null = null;

function region(): Intl.DisplayNames {
  regionDisplay ??= new Intl.DisplayNames(["en"], { type: "region" });
  return regionDisplay;
}

function language(): Intl.DisplayNames {
  languageDisplay ??= new Intl.DisplayNames(["en"], { type: "language" });
  return languageDisplay;
}

/**
 * Country code to country name, e.g. "NP" to "Nepal". Intl.DisplayNames only
 * understands ISO 3166-1 alpha-2 region codes, so a two-letter value is
 * resolved and anything else (alpha-3, an already-spelled-out name) is
 * returned as typed.
 */
export function countryName(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    try {
      return region().of(trimmed.toUpperCase()) ?? trimmed;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

/**
 * Language code to language name, e.g. "en" to "English". Accepts BCP-47 tags
 * (en, fr, pa-Arab). A value Intl can't resolve is returned as typed.
 */
export function languageName(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/^[A-Za-z]{2,3}(-[A-Za-z0-9]+)*$/.test(trimmed)) {
    try {
      return language().of(trimmed) ?? trimmed;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

/**
 * Phone in E.164 national style for display, e.g. "+1 (437) 733-7525". Keep the
 * raw value for the tel link; this is presentation only. Non North-American
 * shapes fall back to the trimmed input.
 */
export function formatPhoneDisplay(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone.trim();
}

/**
 * UCI in IRCC's grouped style: a 10-digit value reads "11-1111-1111" and an
 * 8-digit value reads "1111-1111". Anything else is returned trimmed so an
 * unexpected shape is never mangled.
 */
export function formatUci(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Digits and a leading plus only, for a tel: href. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** wa.me link from a phone number (digits only, country code included). */
export function whatsAppHref(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

/**
 * A single cleaned address line. Joins the parts that exist with a middle dot
 * and humanizes the country, so the result reads "12 King St · Toronto, ON ·
 * M1K 2P5 · Canada" rather than appending a stray "CA" code.
 */
export function cleanAddress(parts: {
  line1: string | null;
  line2: string | null;
  city: string | null;
  provinceState: string | null;
  postalCode: string | null;
  countryCode: string | null;
}): string | null {
  const cityProvince = [parts.city, parts.provinceState]
    .filter((s) => s && s.trim() !== "")
    .join(", ");
  const segments = [
    parts.line1,
    parts.line2,
    cityProvince,
    parts.postalCode,
    countryName(parts.countryCode),
  ].filter((s): s is string => Boolean(s && s.trim() !== ""));
  return segments.length > 0 ? segments.join(" · ") : null;
}

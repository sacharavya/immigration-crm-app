// Mask raw typed characters into a YYYY-MM-DD date string. Only digits count;
// the year is capped at 4, the month at 2, the day at 2, so typing "20020222"
// lands as "2002-02-22" and the year can never grow to six digits. Hyphens are
// inserted automatically, so the user just types the eight numbers. Pure, so
// it is shared by the DateInput component and its tests.
export function maskDateValue(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

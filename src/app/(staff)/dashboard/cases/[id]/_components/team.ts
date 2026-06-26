// Shared types and helpers for the case team (RCIC of record + case workers).
// Both the header Assigned fact and the rail Case team panel render from these.

export type StaffOption = {
  id: string;
  first_name: string;
  last_name: string;
};

export type RcicOption = StaffOption & {
  rcic_membership_number: string | null;
};

export type TeamMember = {
  id: string;
  first_name: string;
  last_name: string;
  role: string | null;
  is_rcic: boolean;
  rcic_membership_number: string | null;
};

export type CaseTeam = {
  rcic: TeamMember | null;
  workers: TeamMember[];
  // True when the current RCIC of record is no longer a licensed consultant,
  // so the file must be reassigned to a valid RCIC.
  rcicInvalid: boolean;
};

export function staffName(s: { first_name: string; last_name: string }): string {
  return `${s.first_name} ${s.last_name}`.trim();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatStaffRole(role: string | null): string {
  if (!role) return "Staff";
  return role
    .split("_")
    .map((w) => (w ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

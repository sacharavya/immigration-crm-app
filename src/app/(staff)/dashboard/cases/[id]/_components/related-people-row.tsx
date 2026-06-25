import Link from "next/link";

import type { Database } from "@/lib/supabase/types";

type ParticipantRole = Database["crm"]["Enums"]["participant_role"];

export type RelatedParty = {
  id: string;
  clientId: string;
  name: string;
  role: ParticipantRole;
};

const ROLE_LABELS: Record<ParticipantRole, string> = {
  principal: "Principal applicant",
  spouse: "Spouse",
  dependent_child: "Dependent",
  co_applicant: "Co-applicant",
  sponsor: "Sponsor",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Related parties on the case (principal applicant, sponsor, co-applicants,
// dependents). Rendered only when the case has linked parties, so solo cases
// stay minimal. The same row handles one party or many. Each party links to
// its own client record.
export function RelatedPeopleRow({ parties }: { parties: RelatedParty[] }) {
  if (parties.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle-foreground)]">
        Related people
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-3">
        {parties.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--navy-100)] text-[10px] font-medium text-[var(--navy-700)]">
              {initials(p.name)}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm text-foreground">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[p.role]}
              </span>
            </span>
            <Link
              href={`/dashboard/clients/${p.clientId}`}
              className="ml-1 text-xs font-medium text-[var(--navy-700)] hover:underline"
            >
              View record
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

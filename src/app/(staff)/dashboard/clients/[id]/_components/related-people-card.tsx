import Link from "next/link";

import type { Database } from "@/lib/supabase/types";

type ParticipantRole = Database["crm"]["Enums"]["participant_role"];

export type RelatedPerson = {
  id: string;
  clientId: string;
  name: string;
  role: ParticipantRole;
  caseId: string;
  caseNumber: string;
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

// People connected to this client through their cases. Modelled generically:
// a standalone client has none, so the whole card is omitted by the page when
// the list is empty. The same row handles one person or many; each links to
// that person's own client record.
export function RelatedPeopleCard({ people }: { people: RelatedPerson[] }) {
  if (people.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">Related people</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {people.map((p) => (
          <li key={`${p.id}`} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--navy-100)] text-xs font-medium text-[var(--navy-700)]">
              {initials(p.name)}
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <Link
                href={`/dashboard/clients/${p.clientId}`}
                className="truncate text-sm font-medium text-[var(--navy-700)] hover:underline"
              >
                {p.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[p.role]} on{" "}
                <Link
                  href={`/dashboard/cases/${p.caseId}`}
                  className="text-[var(--navy-700)] hover:underline"
                >
                  {p.caseNumber}
                </Link>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

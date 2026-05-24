"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { DecisionOutcome } from "./archive-list-view";

type Pick = { id: string; name: string };

const DECISION_LABEL: Record<DecisionOutcome, string> = {
  approved: "Approved",
  refused: "Refused",
  withdrawn: "Withdrawn",
  other: "Other / administrative",
};

export function ArchiveFilters({
  assignee,
  assigneeOptions,
  serviceType,
  serviceTypeOptions,
  decision,
}: {
  assignee: string | null;
  assigneeOptions: Pick[];
  serviceType: string | null;
  serviceTypeOptions: Pick[];
  decision: DecisionOutcome | null;
}) {
  const router = useRouter();

  function buildHref(next: {
    assignee?: string | null;
    serviceType?: string | null;
    decision?: DecisionOutcome | null;
  }) {
    const params = new URLSearchParams();
    const nextAssignee =
      next.assignee === undefined ? assignee : next.assignee;
    if (nextAssignee) params.set("assignee", nextAssignee);
    const nextService =
      next.serviceType === undefined ? serviceType : next.serviceType;
    if (nextService) params.set("service_type", nextService);
    const nextDecision =
      next.decision === undefined ? decision : next.decision;
    if (nextDecision) params.set("decision", nextDecision);
    const qs = params.toString();
    return qs
      ? `/dashboard/cases/archive?${qs}`
      : "/dashboard/cases/archive";
  }

  const hasFilters =
    assignee !== null || serviceType !== null || decision !== null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterSelect
        label="Assigned"
        value={assignee ?? ""}
        onChange={(v) => router.push(buildHref({ assignee: v || null }))}
      >
        <option value="">Anyone</option>
        {assigneeOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Service"
        value={serviceType ?? ""}
        onChange={(v) => router.push(buildHref({ serviceType: v || null }))}
      >
        <option value="">All services</option>
        {serviceTypeOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Decision"
        value={decision ?? ""}
        onChange={(v) =>
          router.push(
            buildHref({ decision: (v as DecisionOutcome) || null }),
          )
        }
      >
        <option value="">Any outcome</option>
        {(Object.keys(DECISION_LABEL) as DecisionOutcome[]).map((d) => (
          <option key={d} value={d}>
            {DECISION_LABEL[d]}
          </option>
        ))}
      </FilterSelect>

      {hasFilters && (
        <Link
          href="/dashboard/cases/archive"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <X className="h-3 w-3" />
          Clear
        </Link>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="font-medium uppercase tracking-wider text-stone-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-stone-200 bg-white px-2.5 text-sm text-stone-900 transition-colors focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
      >
        {children}
      </select>
    </label>
  );
}

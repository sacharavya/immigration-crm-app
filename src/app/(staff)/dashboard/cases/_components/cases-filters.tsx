"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PHASE_LABELS } from "@/lib/utils/phase";

import type { CasesView } from "./view-toggle";

export type StaffPick = { id: string; name: string };
export type ServiceTypePick = { id: string; name: string };

const PHASES = [1, 2, 3, 4, 5, 6] as const;

export function CasesFilters({
  view,
  phase,
  assignee,
  assigneeOptions,
  serviceType,
  serviceTypeOptions,
}: {
  view: CasesView;
  phase: number | null;
  assignee: string | null;
  assigneeOptions: StaffPick[];
  serviceType: string | null;
  serviceTypeOptions: ServiceTypePick[];
}) {
  const router = useRouter();

  function buildHref(next: {
    phase?: number | null;
    assignee?: string | null;
    serviceType?: string | null;
  }) {
    const params = new URLSearchParams();
    // Board is the default view; only include when set to list.
    if (view === "list") params.set("view", "list");

    const nextPhase = next.phase === undefined ? phase : next.phase;
    if (nextPhase !== null && nextPhase !== undefined) {
      params.set("phase", String(nextPhase));
    }

    const nextAssignee =
      next.assignee === undefined ? assignee : next.assignee;
    if (nextAssignee) params.set("assignee", nextAssignee);

    const nextServiceType =
      next.serviceType === undefined ? serviceType : next.serviceType;
    if (nextServiceType) params.set("service_type", nextServiceType);

    const qs = params.toString();
    return qs ? `/dashboard/cases?${qs}` : "/dashboard/cases";
  }

  function pushPhase(value: string) {
    const parsed = Number.parseInt(value, 10);
    const next = parsed >= 1 && parsed <= 6 ? parsed : null;
    router.push(buildHref({ phase: next }));
  }

  function pushAssignee(value: string) {
    router.push(buildHref({ assignee: value === "" ? null : value }));
  }

  function pushServiceType(value: string) {
    router.push(buildHref({ serviceType: value === "" ? null : value }));
  }

  const hasFilters =
    phase !== null || assignee !== null || serviceType !== null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterSelect
        label="Phase"
        value={phase === null ? "" : String(phase)}
        onChange={pushPhase}
      >
        <option value="">All phases</option>
        {PHASES.map((p) => (
          <option key={p} value={p}>
            {p}. {PHASE_LABELS[p]}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Assigned"
        value={assignee ?? ""}
        onChange={pushAssignee}
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
        onChange={pushServiceType}
      >
        <option value="">All services</option>
        {serviceTypeOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </FilterSelect>

      {hasFilters && (
        <Link
          href={view === "list" ? "/dashboard/cases?view=list" : "/dashboard/cases"}
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

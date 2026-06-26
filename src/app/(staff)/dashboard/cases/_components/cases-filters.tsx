"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { AttentionFilter } from "@/lib/cases/board-card";
import { PHASE_LABELS } from "@/lib/utils/phase";

import type { CasesView } from "./view-toggle";

export type StaffPick = { id: string; name: string };
export type ServiceTypePick = { id: string; name: string };

const PHASES = [1, 2, 3, 4, 5] as const;

const ATTENTION_OPTIONS: ReadonlyArray<{ value: AttentionFilter; label: string }> = [
  { value: "at_risk", label: "At risk" },
  { value: "stalled", label: "Stalled" },
  { value: "firm", label: "Needs firm action" },
  { value: "priority", label: "Priority set" },
];

export function CasesFilters({
  view,
  phase,
  assignee,
  assigneeOptions,
  serviceType,
  serviceTypeOptions,
  attention,
}: {
  view: CasesView;
  phase: number | null;
  assignee: string | null;
  assigneeOptions: StaffPick[];
  serviceType: string | null;
  serviceTypeOptions: ServiceTypePick[];
  attention: AttentionFilter | null;
}) {
  const router = useRouter();

  function buildHref(next: {
    phase?: number | null;
    assignee?: string | null;
    serviceType?: string | null;
    attention?: AttentionFilter | null;
  }) {
    const params = new URLSearchParams();
    if (view === "list") params.set("view", "list");

    const nextPhase = next.phase === undefined ? phase : next.phase;
    if (nextPhase !== null && nextPhase !== undefined) {
      params.set("phase", String(nextPhase));
    }

    const nextAssignee = next.assignee === undefined ? assignee : next.assignee;
    if (nextAssignee) params.set("assignee", nextAssignee);

    const nextServiceType =
      next.serviceType === undefined ? serviceType : next.serviceType;
    if (nextServiceType) params.set("service_type", nextServiceType);

    const nextAttention =
      next.attention === undefined ? attention : next.attention;
    if (nextAttention) params.set("attention", nextAttention);

    const qs = params.toString();
    return qs ? `/dashboard/cases?${qs}` : "/dashboard/cases";
  }

  function pushPhase(value: string) {
    const parsed = Number.parseInt(value, 10);
    const next = parsed >= 1 && parsed <= 5 ? parsed : null;
    router.push(buildHref({ phase: next }));
  }

  const hasFilters =
    phase !== null ||
    assignee !== null ||
    serviceType !== null ||
    attention !== null;

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
        onChange={(v) => router.push(buildHref({ assignee: v === "" ? null : v }))}
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
        onChange={(v) =>
          router.push(buildHref({ serviceType: v === "" ? null : v }))
        }
      >
        <option value="">All services</option>
        {serviceTypeOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Attention"
        value={attention ?? ""}
        onChange={(v) =>
          router.push(
            buildHref({ attention: v === "" ? null : (v as AttentionFilter) }),
          )
        }
      >
        <option value="">Everything</option>
        {ATTENTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </FilterSelect>

      {hasFilters && (
        <Link
          href={view === "list" ? "/dashboard/cases?view=list" : "/dashboard/cases"}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
      <span className="font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-border bg-card px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      >
        {children}
      </select>
    </label>
  );
}

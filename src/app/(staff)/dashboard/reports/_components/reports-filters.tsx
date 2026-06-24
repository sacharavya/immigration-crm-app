"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";

type Option = { id: string; name: string };

type Props = {
  serviceTypeId: string | null;
  rcicId: string | null;
  staffId: string | null;
  statusFilter: string | null;
  phaseFilter: string | null;
  decisionFilter: string | null;
  from: string | null;
  to: string | null;
  serviceTypeOptions: Option[];
  rcicOptions: Option[];
  staffOptions: Option[];
};

const STATUS_OPTIONS = [
  { value: "retainer_pending", label: "Retainer pending" },
  { value: "documentation_in_progress", label: "Documents in progress" },
  { value: "documentation_review", label: "Documents review" },
  { value: "submitted_to_ircc", label: "Submitted to IRCC" },
  { value: "passport_requested", label: "Approved" },
  { value: "refused", label: "Refused" },
  { value: "closed", label: "Closed" },
];

const PHASE_OPTIONS = [
  { value: "1", label: "Phase 1: Retainer" },
  { value: "2", label: "Phase 2: Documents" },
  { value: "3", label: "Phase 3: Review" },
  { value: "4", label: "Phase 4: Submitted" },
  { value: "5", label: "Phase 5: Decision" },
];

const DECISION_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "refused", label: "Refused" },
  { value: "pending", label: "Pending decision" },
];

export function ReportsFilters({
  serviceTypeId,
  rcicId,
  staffId,
  statusFilter,
  phaseFilter,
  decisionFilter,
  from,
  to,
  serviceTypeOptions,
  rcicOptions,
  staffOptions,
}: Props) {
  const router = useRouter();

  function buildHref(next: Partial<Record<string, string | null>>) {
    const current: Record<string, string | null> = {
      service_type: serviceTypeId,
      rcic: rcicId,
      staff: staffId,
      status: statusFilter,
      phase: phaseFilter,
      decision: decisionFilter,
      from,
      to,
    };
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/dashboard/reports?${qs}` : "/dashboard/reports";
  }

  function push(next: Partial<Record<string, string | null>>) {
    router.push(buildHref(next));
  }

  const hasFilters =
    Boolean(serviceTypeId) ||
    Boolean(rcicId) ||
    Boolean(staffId) ||
    Boolean(statusFilter) ||
    Boolean(phaseFilter) ||
    Boolean(decisionFilter) ||
    Boolean(from) ||
    Boolean(to);

  return (
    <div className="border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Service type">
          <select
            value={serviceTypeId ?? ""}
            onChange={(e) => push({ service_type: e.target.value || null })}
            className="h-8 w-full border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {serviceTypeOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label="RCIC">
          <select
            value={rcicId ?? ""}
            onChange={(e) => push({ rcic: e.target.value || null })}
            className="h-8 w-full border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {rcicOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Staff member">
          <select
            value={staffId ?? ""}
            onChange={(e) => push({ staff: e.target.value || null })}
            className="h-8 w-full border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            value={statusFilter ?? ""}
            onChange={(e) => push({ status: e.target.value || null })}
            className="h-8 w-full border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Phase">
          <select
            value={phaseFilter ?? ""}
            onChange={(e) => push({ phase: e.target.value || null })}
            className="h-8 w-full border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {PHASE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Decision">
          <select
            value={decisionFilter ?? ""}
            onChange={(e) => push({ decision: e.target.value || null })}
            className="h-8 w-full border border-stone-200 bg-white px-2 text-sm"
          >
            <option value="">All</option>
            {DECISION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="From">
          <Input
            type="date"
            value={from ?? ""}
            onChange={(e) => push({ from: e.target.value || null })}
            className="h-8 w-36"
          />
        </Field>

        <Field label="To">
          <Input
            type="date"
            value={to ?? ""}
            onChange={(e) => push({ to: e.target.value || null })}
            className="h-8 w-36"
          />
        </Field>

        {hasFilters && (
          <Link
            href="/dashboard/reports"
            className="inline-flex h-8 items-center gap-1 px-2 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900"
          >
            <X className="h-3 w-3" />
            Clear all
          </Link>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-stone-500">{label}</span>
      {children}
    </label>
  );
}

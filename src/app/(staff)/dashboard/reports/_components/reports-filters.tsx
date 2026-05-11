"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";

type Pick = { id: string; name: string };

type Props = {
  serviceTypeId: string | null;
  rcicId: string | null;
  from: string | null;
  to: string | null;
  serviceTypeOptions: Pick[];
  rcicOptions: Pick[];
};

export function ReportsFilters({
  serviceTypeId,
  rcicId,
  from,
  to,
  serviceTypeOptions,
  rcicOptions,
}: Props) {
  const router = useRouter();

  function buildHref(next: Partial<Props>) {
    const params = new URLSearchParams();
    const s = next.serviceTypeId === undefined ? serviceTypeId : next.serviceTypeId;
    if (s) params.set("service_type", s);
    const r = next.rcicId === undefined ? rcicId : next.rcicId;
    if (r) params.set("rcic", r);
    const f = next.from === undefined ? from : next.from;
    if (f) params.set("from", f);
    const t = next.to === undefined ? to : next.to;
    if (t) params.set("to", t);
    const qs = params.toString();
    return qs ? `/dashboard/reports?${qs}` : "/dashboard/reports";
  }

  function pushNow(next: Partial<Props>) {
    router.push(buildHref(next));
  }

  const hasFilters =
    Boolean(serviceTypeId) ||
    Boolean(rcicId) ||
    Boolean(from) ||
    Boolean(to);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-3">
      <Field label="Service">
        <select
          value={serviceTypeId ?? ""}
          onChange={(e) => pushNow({ serviceTypeId: e.target.value || null })}
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="">All services</option>
          {serviceTypeOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="RCIC">
        <select
          value={rcicId ?? ""}
          onChange={(e) => pushNow({ rcicId: e.target.value || null })}
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="">All RCICs</option>
          {rcicOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="From">
        <Input
          type="date"
          value={from ?? ""}
          onChange={(e) => pushNow({ from: e.target.value || null })}
          className="h-8 w-40"
        />
      </Field>
      <Field label="To">
        <Input
          type="date"
          value={to ?? ""}
          onChange={(e) => pushNow({ to: e.target.value || null })}
          className="h-8 w-40"
        />
      </Field>
      {hasFilters && (
        <Link
          href="/dashboard/reports"
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <X className="h-3 w-3" />
          Clear
        </Link>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium uppercase tracking-wider text-stone-500">
        {label}
      </span>
      {children}
    </label>
  );
}

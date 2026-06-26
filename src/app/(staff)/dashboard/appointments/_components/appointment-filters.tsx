"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Input } from "@/components/ui/input";

import type {
  AppointmentStatus,
  AppointmentTypeOption,
  StaffOption,
} from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const STATUS_OPTIONS: Array<{
  value: AppointmentStatus | "all";
  label: string;
}> = [
  { value: "confirmed", label: "Confirmed" },
  { value: "all", label: "All statuses" },
  // APPT-8: paid-consultation queue surfaces.
  { value: "awaiting_review", label: "Needs review" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
];

export function AppointmentFilters({
  currentView,
  types,
  staff,
  statusFilter,
  fromDate,
  toDate,
}: {
  currentView: "list" | "calendar";
  types: AppointmentTypeOption[];
  staff: StaffOption[];
  statusFilter: string;
  fromDate: string;
  toDate: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`/dashboard/appointments?${next.toString()}`);
    });
  }

  const isoToDateInput = (iso: string) => iso.slice(0, 10);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-stone-200 bg-white p-3">
      <div className="inline-flex rounded-md border border-stone-200 bg-stone-50 p-0.5">
        <button
          type="button"
          onClick={() => update("view", "list")}
          className={`rounded-[5px] px-3 py-1 text-xs font-medium ${
            currentView === "list"
              ? "bg-white text-[var(--navy)] shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => update("view", "calendar")}
          className={`rounded-[5px] px-3 py-1 text-xs font-medium ${
            currentView === "calendar"
              ? "bg-white text-[var(--navy)] shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Calendar
        </button>
      </div>

      <FilterField label="From">
        <Input
          type="date"
          value={isoToDateInput(fromDate)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return update("from", null);
            if (!ISO_DATE.test(v)) return;
            update("from", new Date(`${v}T00:00:00Z`).toISOString());
          }}
          className="h-9"
        />
      </FilterField>

      <FilterField label="To">
        <Input
          type="date"
          value={isoToDateInput(toDate)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return update("to", null);
            if (!ISO_DATE.test(v)) return;
            update("to", new Date(`${v}T23:59:59Z`).toISOString());
          }}
          className="h-9"
        />
      </FilterField>

      <FilterField label="Status">
        <select
          value={statusFilter}
          onChange={(e) => update("status", e.target.value)}
          className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Type">
        <select
          defaultValue={params.get("type") ?? ""}
          onChange={(e) => update("type", e.target.value || null)}
          className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm"
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Staff">
        <select
          defaultValue={params.get("staff") ?? ""}
          onChange={(e) => update("staff", e.target.value || null)}
          className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm"
        >
          <option value="">Anyone</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.first_name} {s.last_name}
            </option>
          ))}
        </select>
      </FilterField>

      {pending && (
        <span className="text-xs text-stone-400">Updating…</span>
      )}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </span>
      {children}
    </label>
  );
}

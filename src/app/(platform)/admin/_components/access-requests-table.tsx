"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Card, CardContent } from "@/components/ui/card";

import { updateAccessRequestStatus } from "../actions";

export type AccessRequest = {
  id: string;
  firm_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  rcic_number: string | null;
  firm_size: string | null;
  current_software: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

const STATUSES = ["new", "contacted", "onboarding", "active", "declined"] as const;

const STATUS_STYLE: Record<string, string> = {
  new: "bg-amber-50 text-amber-900",
  contacted: "bg-sky-50 text-sky-900",
  onboarding: "bg-indigo-50 text-indigo-900",
  active: "bg-emerald-50 text-emerald-800",
  declined: "bg-stone-100 text-stone-600",
};

const SIZE_LABEL: Record<string, string> = {
  solo: "Solo",
  "2-5": "2–5",
  "6-15": "6–15",
  "16+": "16+",
};

function StatusPicker({ row }: { row: AccessRequest }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <select
          value={row.status}
          disabled={pending}
          onChange={(e) => {
            const status = e.target.value;
            setError(null);
            start(async () => {
              const res = await updateAccessRequestStatus({ id: row.id, status });
              if (res && "error" in res && res.error) setError(res.error);
              else router.refresh();
            });
          }}
          className={`rounded-md px-2 py-1 text-xs font-medium capitalize outline-none ${
            STATUS_STYLE[row.status] ?? "bg-stone-100 text-stone-600"
          }`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="bg-white text-stone-900">
              {s}
            </option>
          ))}
        </select>
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />}
      </div>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}

export function AccessRequestsTable({ items }: { items: AccessRequest[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-stone-500">
          No access requests yet. Submissions from the public site land here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="px-4 py-3 font-medium">Firm</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Current software</th>
            <th className="px-4 py-3 font-medium">Notes</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Received</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr
              key={r.id}
              className="border-b border-stone-100 align-top last:border-0 hover:bg-stone-50"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-stone-900">{r.firm_name}</div>
                {r.rcic_number && (
                  <div className="text-xs text-stone-400">
                    RCIC# {r.rcic_number}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="text-stone-900">{r.contact_name}</div>
                <a
                  href={`mailto:${r.email}`}
                  className="text-xs text-stone-500 hover:text-stone-900 hover:underline"
                >
                  {r.email}
                </a>
                {r.phone && (
                  <div className="text-xs text-stone-500">{r.phone}</div>
                )}
              </td>
              <td className="px-4 py-3 text-stone-600">
                {r.firm_size ? (SIZE_LABEL[r.firm_size] ?? r.firm_size) : "—"}
              </td>
              <td className="px-4 py-3 text-stone-600">
                {r.current_software || "—"}
              </td>
              <td className="max-w-[24rem] px-4 py-3 text-stone-600">
                {r.message || "—"}
              </td>
              <td className="px-4 py-3">
                <StatusPicker row={r} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-stone-500">
                {new Date(r.created_at).toLocaleDateString("en-CA", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

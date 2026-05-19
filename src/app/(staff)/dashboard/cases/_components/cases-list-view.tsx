"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ActionChip } from "@/components/cases/action-chip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ChipOutput } from "@/lib/cases/action-chip";
import { assigneeColor } from "@/lib/utils/assignee-color";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/lib/supabase/types";

type CaseStatus = Database["crm"]["Enums"]["case_status"];

export type CaseRow = {
  id: string;
  caseNumber: string;
  status: CaseStatus;
  clientName: string;
  serviceName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  paymentProgress: number;
  // Same retainer-signal pair as BoardCase. Drives the pill override
  // when status is retainer_pending but the retainer is already signed.
  retainerSigned: boolean;
  retainerSatisfied: boolean;
  // FLOW-3a: dynamic action chip; null if no view row.
  chip: ChipOutput | null;
};

const statusPill: Record<CaseStatus, { label: string; className: string }> = {
  retainer_pending: {
    label: "Retainer Pending",
    className: "bg-gray-200 text-gray-700",
  },
  documentation_in_progress: {
    label: "Documentation",
    className: "bg-blue-100 text-blue-800",
  },
  documentation_review: {
    label: "In Review",
    className: "bg-blue-100 text-blue-800",
  },
  submitted_to_ircc: {
    label: "Submitted",
    className: "bg-amber-100 text-amber-800",
  },
  passport_requested: {
    label: "Approved",
    className: "bg-green-100 text-green-800",
  },
  refused: {
    label: "Refused",
    className: "bg-red-100 text-red-800",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-200 text-gray-700",
  },
};

export function CasesListView({ rows }: { rows: CaseRow[] }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.clientName.toLowerCase().includes(q) ||
        r.caseNumber.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
          <Input
            type="search"
            placeholder="Search by client name or case number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-white pl-9"
          />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <Table className="w-full table-auto">
          <TableHeader>
            <TableRow className="border-b border-stone-100 bg-stone-50/30 hover:bg-stone-50/30">
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Case
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Client
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Service
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Phase
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Assigned
              </TableHead>
              <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Paid
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-sm text-stone-500"
                >
                  {rows.length === 0
                    ? "No cases yet."
                    : "No cases match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const pill =
                  r.status === "retainer_pending" && r.retainerSigned
                    ? {
                        label: r.retainerSatisfied
                          ? "Retainer Signed"
                          : "Awaiting Payment",
                        className: "bg-emerald-100 text-emerald-800",
                      }
                    : statusPill[r.status];
                const open = () => router.push(`/dashboard/cases/${r.id}`);
                return (
                  <TableRow
                    key={r.id}
                    onClick={open}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open();
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open case ${r.caseNumber}`}
                    className="cursor-pointer transition-colors hover:bg-stone-50 focus:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--gold)]"
                  >
                    <TableCell className="font-mono text-sm text-stone-700">
                      {r.caseNumber}
                    </TableCell>
                    <TableCell className="font-medium">{r.clientName}</TableCell>
                    <TableCell className="text-stone-700">
                      {r.serviceName}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        {r.chip && <ActionChip chip={r.chip} size="sm" />}
                        <Badge
                          className={`${pill.className} rounded-full px-2.5 py-0.5 text-[10px] font-medium`}
                        >
                          {pill.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.assigneeName ? (
                        (() => {
                          const c = assigneeColor(r.assigneeId);
                          return (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${c.bg} ${c.fg} ${c.ring}`}
                            >
                              {r.assigneeName}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-stone-400">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${r.paymentProgress}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-sm tabular-nums text-stone-700">
                          {r.paymentProgress}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="border-t border-stone-100 bg-stone-50/30 px-4 py-2.5 text-xs text-stone-500">
          {filtered.length} of {rows.length} active case
          {rows.length === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}

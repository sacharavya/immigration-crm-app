"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { assigneeColor } from "@/lib/utils/assignee-color";

export type DecisionOutcome = "approved" | "refused" | "withdrawn" | "other";

export type ArchiveRow = {
  id: string;
  caseNumber: string;
  clientName: string;
  serviceName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  decision: DecisionOutcome;
  closedAt: string | null;
  decidedAt: string | null;
};

const DECISION_BADGE: Record<
  DecisionOutcome,
  { label: string; className: string }
> = {
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  refused: { label: "Refused", className: "bg-red-100 text-red-800" },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-stone-200 text-stone-700",
  },
  other: { label: "Other", className: "bg-stone-100 text-stone-600" },
};

export function ArchiveListView({ rows }: { rows: ArchiveRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

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
                Decision
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Assigned
              </TableHead>
              <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Closed
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
                    ? "No closed cases yet."
                    : "No cases match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const decision = DECISION_BADGE[r.decision];
                const open = () =>
                  router.push(`/dashboard/cases/${r.id}`);
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
                      <Badge
                        className={`${decision.className} rounded-full px-2.5 py-0.5 text-[11px] font-medium`}
                      >
                        {decision.label}
                      </Badge>
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
                    <TableCell className="text-right text-xs tabular-nums text-stone-500">
                      {r.closedAt
                        ? format(new Date(r.closedAt), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="border-t border-stone-100 bg-stone-50/30 px-4 py-2.5 text-xs text-stone-500">
          {filtered.length} of {rows.length} archived case
          {rows.length === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}

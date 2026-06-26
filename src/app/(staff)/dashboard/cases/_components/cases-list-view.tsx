"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  BallDot,
  DocsProgress,
  PaymentIndicator,
  PriorityPill,
  WorkerAvatar,
} from "@/components/cases/board-card-parts";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BoardCardModel, CaseSignal } from "@/lib/cases/board-card";
import { compareByPressing } from "@/lib/cases/board-card";
import { cn } from "@/lib/utils/index";
import { PHASE_LABELS } from "@/lib/utils/phase";

// Column keys that can drive the sort. "pressing" is the default - at risk and
// overdue float to the top, matching the board's reading order.
type SortKey =
  | "pressing"
  | "caseNumber"
  | "clientName"
  | "serviceName"
  | "phase"
  | "status"
  | "signal"
  | "docs"
  | "payment"
  | "worker"
  | "priority"
  | "phaseAge";

type SortState = { key: SortKey; dir: "asc" | "desc" };

const SIGNAL_RANK: Record<CaseSignal, number> = {
  at_risk: 0,
  stalled: 1,
  healthy: 2,
};

const PAYMENT_RANK: Record<BoardCardModel["payment"]["state"], number> = {
  unpaid: 0,
  partial: 1,
  none: 2,
  paid: 3,
};

const PRIORITY_RANK: Record<BoardCardModel["priority"], number> = {
  critical: 0,
  high: 1,
  none: 2,
};

const BALL_RANK: Record<BoardCardModel["ballInCourt"], number> = {
  firm: 0,
  client: 1,
  ircc: 2,
};

const SIGNAL_CHIP: Record<CaseSignal, { label: string; className: string }> = {
  at_risk: {
    label: "At risk",
    className:
      "bg-[color:var(--destructive-subtle)] text-[color:var(--destructive-text)]",
  },
  stalled: {
    label: "Stalled",
    className: "bg-[color:var(--warning-subtle)] text-[color:var(--warning-text)]",
  },
  healthy: {
    label: "On track",
    className: "text-[color:var(--subtle-foreground)]",
  },
};

const BALL_TEXT: Record<BoardCardModel["ballInCourt"], string> = {
  firm: "text-primary",
  client: "text-[color:var(--warning-text)]",
  ircc: "text-muted-foreground",
};

function compare(a: BoardCardModel, b: BoardCardModel, key: SortKey): number {
  switch (key) {
    case "pressing":
      return compareByPressing(a, b);
    case "caseNumber":
      return a.caseNumber.localeCompare(b.caseNumber);
    case "clientName":
      return a.clientName.localeCompare(b.clientName);
    case "serviceName":
      return (a.serviceName ?? "").localeCompare(b.serviceName ?? "");
    case "phase":
      return a.phase - b.phase;
    case "status":
      return (
        BALL_RANK[a.ballInCourt] - BALL_RANK[b.ballInCourt] ||
        a.statusText.localeCompare(b.statusText)
      );
    case "signal":
      return SIGNAL_RANK[a.signal] - SIGNAL_RANK[b.signal];
    case "docs": {
      const ra = a.docsRequired > 0 ? a.docsReceived / a.docsRequired : -1;
      const rb = b.docsRequired > 0 ? b.docsReceived / b.docsRequired : -1;
      return ra - rb;
    }
    case "payment":
      return PAYMENT_RANK[a.payment.state] - PAYMENT_RANK[b.payment.state];
    case "worker":
      return (a.workerName ?? "~").localeCompare(b.workerName ?? "~");
    case "priority":
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    case "phaseAge":
      return a.phaseAgeDays - b.phaseAgeDays;
  }
}

export function CasesListView({ rows }: { rows: BoardCardModel[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "pressing", dir: "asc" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter(
          (r) =>
            r.clientName.toLowerCase().includes(q) ||
            r.caseNumber.toLowerCase().includes(q),
        )
      : rows;
    const sorted = [...base].sort((a, b) => compare(a, b, sort.key));
    return sort.dir === "desc" ? sorted.reverse() : sorted;
  }, [rows, query, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Input
          type="search"
          placeholder="Search by client name or case number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-card pl-9"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--subtle-foreground)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
        <Table className="w-full table-auto">
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <SortHeader label="Case" col="caseNumber" sort={sort} onSort={toggleSort} />
              <SortHeader label="Client" col="clientName" sort={sort} onSort={toggleSort} />
              <SortHeader label="Service" col="serviceName" sort={sort} onSort={toggleSort} />
              <SortHeader label="Phase" col="phase" sort={sort} onSort={toggleSort} />
              <SortHeader label="Status" col="status" sort={sort} onSort={toggleSort} />
              <SortHeader label="Signal" col="signal" sort={sort} onSort={toggleSort} />
              <SortHeader label="Documents" col="docs" sort={sort} onSort={toggleSort} />
              <SortHeader label="Payment" col="payment" sort={sort} onSort={toggleSort} />
              <SortHeader label="Worker" col="worker" sort={sort} onSort={toggleSort} />
              <SortHeader label="Priority" col="priority" sort={sort} onSort={toggleSort} />
              <SortHeader
                label="Phase age"
                col="phaseAge"
                sort={sort}
                onSort={toggleSort}
                align="right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center text-sm text-muted-foreground"
                >
                  {rows.length === 0
                    ? "No cases yet."
                    : "No cases match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const open = () => router.push(`/dashboard/cases/${r.id}`);
                const signal = SIGNAL_CHIP[r.signal];
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
                    aria-label={`Open case ${r.caseNumber} for ${r.clientName}`}
                    className="cursor-pointer transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {r.caseNumber}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {r.clientName}
                    </TableCell>
                    <TableCell>
                      {r.serviceName ? (
                        <span className="text-muted-foreground">{r.serviceName}</span>
                      ) : (
                        <span className="font-medium text-[color:var(--warning-text)]">
                          Service not set
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.phase}. {PHASE_LABELS[r.phase]}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-sm font-medium",
                          BALL_TEXT[r.ballInCourt],
                        )}
                      >
                        <BallDot ball={r.ballInCourt} />
                        <span className="line-clamp-1">{r.statusText}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                          signal.className,
                        )}
                      >
                        {signal.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DocsProgress received={r.docsReceived} required={r.docsRequired} />
                    </TableCell>
                    <TableCell>
                      <PaymentIndicator state={r.payment.state} label={r.payment.label} />
                    </TableCell>
                    <TableCell>
                      <WorkerAvatar name={r.workerName} withName />
                    </TableCell>
                    <TableCell>
                      {r.priority === "none" ? (
                        <span className="text-[color:var(--subtle-foreground)]">None</span>
                      ) : (
                        <PriorityPill priority={r.priority} />
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                      {r.phaseAgeDays}d
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          {filtered.length} of {rows.length} active case
          {rows.length === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  col,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  col: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === col;
  const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        <Icon
          aria-hidden
          className={cn("h-3 w-3", active ? "opacity-100" : "opacity-40")}
        />
      </button>
    </TableHead>
  );
}

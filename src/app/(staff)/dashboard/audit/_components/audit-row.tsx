"use client";

import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils/index";

export type AuditRowData = {
  id: number;
  occurredAt: string;
  actorName: string | null;
  schemaName: string;
  tableName: string;
  operation: "I" | "U" | "D";
  rowId: string | null;
  changedColumns: string[] | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
};

const OP_LABEL: Record<AuditRowData["operation"], string> = {
  I: "Insert",
  U: "Update",
  D: "Delete",
};

const OP_TONE: Record<AuditRowData["operation"], string> = {
  I: "bg-emerald-100 text-emerald-800",
  U: "bg-blue-100 text-blue-800",
  D: "bg-red-100 text-red-800",
};

export function AuditRow({ row }: { row: AuditRowData }) {
  const [open, setOpen] = useState(false);
  const summary =
    row.changedColumns && row.changedColumns.length > 0
      ? row.changedColumns.slice(0, 5).join(", ") +
        (row.changedColumns.length > 5
          ? ` +${row.changedColumns.length - 5} more`
          : "")
      : row.operation === "U"
        ? "—"
        : null;

  return (
    <li className="border-b border-stone-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50"
      >
        <ChevronRight
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-stone-400 transition-transform",
            open && "rotate-90",
          )}
        />
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
            OP_TONE[row.operation],
          )}
        >
          {OP_LABEL[row.operation]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-mono text-xs text-stone-500">
              {row.schemaName}.{row.tableName}
            </span>
            {row.rowId && (
              <span className="font-mono text-[11px] text-stone-400">
                {row.rowId.slice(0, 8)}…
              </span>
            )}
          </div>
          {summary && (
            <p className="mt-0.5 text-xs text-stone-500">
              <span className="text-stone-400">changed:</span> {summary}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right text-xs text-stone-500">
          <div className="tabular-nums">
            {format(new Date(row.occurredAt), "MMM d, HH:mm:ss")}
          </div>
          <div className="text-stone-400">{row.actorName ?? "system"}</div>
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-100 bg-stone-50 px-4 py-3 text-xs">
          {row.operation === "U" ? (
            <DiffPanel old={row.oldValues} next={row.newValues} />
          ) : row.operation === "I" ? (
            <SnapshotPanel label="Inserted" data={row.newValues} />
          ) : (
            <SnapshotPanel label="Deleted" data={row.oldValues} />
          )}
        </div>
      )}
    </li>
  );
}

function DiffPanel({
  old: oldValues,
  next: newValues,
}: {
  old: Record<string, unknown> | null;
  next: Record<string, unknown> | null;
}) {
  if (!oldValues || !newValues) {
    return <p className="text-stone-500">No diff available.</p>;
  }
  const keys = Array.from(
    new Set([...Object.keys(oldValues), ...Object.keys(newValues)]),
  ).sort();
  const changed = keys.filter(
    (k) => JSON.stringify(oldValues[k]) !== JSON.stringify(newValues[k]),
  );
  if (changed.length === 0) {
    return <p className="text-stone-500">Row touched but values match.</p>;
  }
  return (
    <table className="w-full table-fixed text-xs">
      <thead>
        <tr className="text-left text-stone-500">
          <th className="w-1/4 py-1 pr-2 font-semibold">Column</th>
          <th className="w-1/3 py-1 pr-2 font-semibold">Before</th>
          <th className="py-1 font-semibold">After</th>
        </tr>
      </thead>
      <tbody>
        {changed.map((k) => (
          <tr key={k} className="align-top">
            <td className="py-1 pr-2 font-mono text-stone-700">{k}</td>
            <td className="py-1 pr-2 font-mono text-red-700">
              {fmt(oldValues[k])}
            </td>
            <td className="py-1 font-mono text-emerald-700">
              {fmt(newValues[k])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SnapshotPanel({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown> | null;
}) {
  if (!data) return <p className="text-stone-500">No snapshot.</p>;
  return (
    <div>
      <p className="mb-1 text-stone-500">{label} row:</p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border border-stone-200 bg-white p-2 font-mono text-[11px] text-stone-700">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function fmt(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "—";
  if (typeof v === "string") return v.length > 80 ? v.slice(0, 80) + "…" : v;
  return JSON.stringify(v);
}

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

// ---------------------------------------------------------------------------
// Human-readable sentence generation
// ---------------------------------------------------------------------------

const OP_LABEL: Record<AuditRowData["operation"], string> = {
  I: "Created",
  U: "Updated",
  D: "Deleted",
};

const OP_TONE: Record<AuditRowData["operation"], string> = {
  I: "bg-emerald-100 text-emerald-800",
  U: "bg-[var(--navy-100)] text-[var(--navy-700)]",
  D: "bg-[var(--maple-100)] text-[var(--maple-700)]",
};

const TABLE_LABELS: Record<string, string> = {
  clients: "Client",
  cases: "Case",
  staff: "Staff member",
  tasks: "Task",
  payments: "Payment",
  invoices: "Invoice",
  communications: "Communication",
  case_events: "Case event",
  retainer_agreements: "Retainer agreement",
  appointments: "Appointment",
  documents: "Document",
  case_required_documents: "Document requirement",
  appointment_types: "Appointment type",
  appointment_settings: "Appointment settings",
  service_types: "Service type",
  service_templates: "Service template",
  template_documents: "Template document",
};

const COLUMN_LABELS: Record<string, string> = {
  status: "Status",
  assigned_rcic: "Assigned RCIC",
  assigned_paralegal: "Assigned paralegal",
  legal_name_full: "Legal name",
  email: "Email",
  phone_primary: "Phone",
  quoted_fee_cad: "Quoted fee",
  immigration_status: "Immigration status",
  immigration_status_expiry: "Status expiry",
  amount_cad: "Amount",
  received_date: "Received date",
  is_refund: "Refund",
  signed_at: "Signed at",
  voided_at: "Voided at",
  submitted_at: "Submitted at",
  decided_at: "Decided at",
  closed_at: "Closed at",
  starts_at: "Start time",
  cancelled_at: "Cancelled at",
  cancellation_reason: "Cancellation reason",
  reason: "Reason",
  staff_notes: "Staff notes",
  assigned_staff_id: "Assigned to",
  graph_sync_status: "Calendar sync",
  payment_reviewed_at: "Payment reviewed",
  fee_cad_at_booking: "Booking fee",
  document_label: "Document label",
  document_code: "Document code",
};

function humanizeTable(schema: string, table: string): string {
  return TABLE_LABELS[table] ?? `${schema}.${table}`;
}

function humanizeColumn(col: string): string {
  return COLUMN_LABELS[col] ?? col.replace(/_/g, " ");
}

function describeSentence(row: AuditRowData): string {
  const entity = humanizeTable(row.schemaName, row.tableName);
  const changed = row.changedColumns ?? [];

  // Inserts with special names
  if (row.operation === "I") {
    if (row.tableName === "payments") return "Payment recorded";
    if (row.tableName === "case_events") return "Case event recorded";
    if (row.tableName === "communications") return "Communication logged";
    return `${entity} created`;
  }

  if (row.operation === "D") {
    return `${entity} deleted`;
  }

  // Updates: describe what changed meaningfully
  if (changed.length === 0) return `${entity} updated`;

  if (row.tableName === "cases" && changed.includes("status")) {
    const newStatus = row.newValues?.status;
    if (newStatus) {
      const statusLabels: Record<string, string> = {
        retainer_pending: "Retainer Pending",
        documentation_in_progress: "Documents in Progress",
        documentation_review: "Documents Review",
        submitted_to_ircc: "Submitted to IRCC",
        passport_requested: "Approved",
        refused: "Refused",
        closed: "Closed",
      };
      return `Case advanced to ${statusLabels[newStatus as string] ?? newStatus}`;
    }
  }

  if (row.tableName === "appointments" && changed.includes("status")) {
    const newStatus = row.newValues?.status;
    return `Appointment ${newStatus ?? "updated"}`;
  }

  if (row.tableName === "appointments" && changed.includes("assigned_staff_id")) {
    return "Appointment assignee changed";
  }

  if (row.tableName === "retainer_agreements" && changed.includes("signed_at")) {
    return "Retainer agreement signed";
  }

  if (row.tableName === "retainer_agreements" && changed.includes("voided_at")) {
    return "Retainer agreement voided";
  }

  if (row.tableName === "clients" && changed.includes("immigration_status")) {
    return "Immigration status updated";
  }

  if (row.tableName === "documents" && changed.includes("status")) {
    const newStatus = row.newValues?.status;
    return `Document ${newStatus ?? "updated"}`;
  }

  // Generic: list first 3 changed columns in human terms
  const labels = changed.slice(0, 3).map(humanizeColumn);
  const suffix = changed.length > 3 ? ` and ${changed.length - 3} more` : "";
  return `${entity}: ${labels.join(", ")}${suffix}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditRow({ row }: { row: AuditRowData }) {
  const [open, setOpen] = useState(false);
  const sentence = describeSentence(row);

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
            "shrink-0 px-2 py-0.5 text-[11px] font-medium",
            OP_TONE[row.operation],
          )}
        >
          {OP_LABEL[row.operation]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-stone-800">{sentence}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-400">
            <span className="font-mono">
              {row.schemaName}.{row.tableName}
            </span>
            {row.rowId && (
              <span className="font-mono">{row.rowId.slice(0, 8)}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-stone-500">
          <div className="tabular-nums">
            {format(new Date(row.occurredAt), "MMM d, HH:mm")}
          </div>
          <div className="text-stone-400">{row.actorName ?? "System"}</div>
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-100 bg-stone-50 px-4 py-3 text-xs">
          {row.operation === "U" ? (
            <DiffPanel old={row.oldValues} next={row.newValues} />
          ) : row.operation === "I" ? (
            <SnapshotPanel label="Created" data={row.newValues} />
          ) : (
            <SnapshotPanel label="Deleted" data={row.oldValues} />
          )}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Diff panel (expanded view)
// ---------------------------------------------------------------------------

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
    return <p className="text-stone-500">Row touched but values unchanged.</p>;
  }
  return (
    <div className="space-y-2">
      {changed.map((k) => (
        <div key={k} className="flex items-start gap-3">
          <span className="w-40 shrink-0 font-medium text-stone-600">
            {humanizeColumn(k)}
          </span>
          <span className="text-[var(--destructive)] line-through">
            {fmtValue(oldValues[k])}
          </span>
          <span className="text-stone-400">to</span>
          <span className="font-medium text-stone-800">
            {fmtValue(newValues[k])}
          </span>
        </div>
      ))}
    </div>
  );
}

function SnapshotPanel({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown> | null;
}) {
  if (!data) return <p className="text-stone-500">No data recorded.</p>;

  // Show key fields as a clean list, not raw JSON
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  if (entries.length === 0) {
    return <p className="text-stone-500">Empty record.</p>;
  }

  return (
    <div className="space-y-1">
      <p className="text-stone-500">{label}:</p>
      {entries.slice(0, 15).map(([k, v]) => (
        <div key={k} className="flex items-start gap-3">
          <span className="w-40 shrink-0 text-stone-500">
            {humanizeColumn(k)}
          </span>
          <span className="text-stone-700">{fmtValue(v)}</span>
        </div>
      ))}
      {entries.length > 15 && (
        <p className="text-stone-400">
          and {entries.length - 15} more fields
        </p>
      )}
    </div>
  );
}

function fmtValue(v: unknown): string {
  if (v === null) return "empty";
  if (v === undefined) return "empty";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string") {
    if (v.length === 0) return "empty";
    if (v.length > 100) return v.slice(0, 100) + "...";
    return v;
  }
  if (typeof v === "number") return String(v);
  return JSON.stringify(v);
}

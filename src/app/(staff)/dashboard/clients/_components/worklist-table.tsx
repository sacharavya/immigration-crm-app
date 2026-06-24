"use client";

import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import {
  STAGE_LABELS,
  type BallInCourt,
  type ClientStage,
  type UrgencyTier,
  type WorklistRow,
} from "@/lib/clients/worklist";
import {
  IMMIGRATION_STATUS_LABELS,
  NO_EXPIRY_STATUSES,
  type ImmigrationStatusType,
} from "@/lib/validators/client-immigration";

// ---------------------------------------------------------------------------
// Color maps (using existing BBI tokens)
// ---------------------------------------------------------------------------

const STAGE_COLORS: Record<ClientStage, string> = {
  lead: "bg-stone-100 text-stone-600",
  retained: "bg-[var(--navy-100)] text-[var(--navy-700)]",
  preparing: "bg-[var(--navy-100)] text-[var(--navy-700)]",
  submitted: "bg-amber-100 text-amber-800",
  decision: "bg-emerald-100 text-emerald-800",
  closed: "bg-stone-200 text-stone-500",
};

const BALL_COLORS: Record<BallInCourt, { bg: string; text: string; label: string }> = {
  firm: { bg: "bg-[var(--navy-100)]", text: "text-[var(--navy-700)]", label: "Firm" },
  client: { bg: "bg-amber-100", text: "text-amber-800", label: "Client" },
  ircc: { bg: "bg-stone-100", text: "text-stone-600", label: "IRCC" },
};

const URGENCY_BORDER: Record<UrgencyTier, string> = {
  critical: "border-l-2 border-l-[var(--destructive)]",
  attention: "border-l-2 border-l-amber-500",
  normal: "border-l-2 border-l-transparent",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function expiryCountdown(
  expiry: string | null,
  status: ImmigrationStatusType | null,
): { text: string; urgency: "critical" | "attention" | "normal" } | null {
  if (!expiry || !status) return null;
  if (NO_EXPIRY_STATUSES.has(status)) return { text: "No expiry", urgency: "normal" };

  const days = Math.floor(
    (new Date(expiry + "T00:00:00Z").getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000,
  );

  if (days < 0) return { text: `Expired ${Math.abs(days)} days ago`, urgency: "critical" };
  if (days === 0) return { text: "Expires today", urgency: "critical" };
  if (days <= 30) return { text: `Expires in ${days} days`, urgency: "critical" };
  if (days <= 60) return { text: `Expires in ${days} days`, urgency: "attention" };
  if (days <= 365) return { text: `Expires in ${Math.floor(days / 30)} months`, urgency: "normal" };
  return { text: `Expires in ${Math.floor(days / 365)} years`, urgency: "normal" };
}

function deadlineLabel(isoDate: string): { text: string; overdue: boolean } {
  const days = Math.floor(
    (new Date(isoDate + "T00:00:00Z").getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000,
  );
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { text: "Due today", overdue: false };
  return { text: `Due in ${days}d`, overdue: false };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorklistTable({
  rows,
  staffById,
}: {
  rows: WorklistRow[];
  staffById: Record<string, string>;
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-stone-200 bg-white px-6 py-12 text-center text-sm text-stone-500">
        No clients match the current filters.
      </div>
    );
  }

  return (
    <div className="border border-stone-200 bg-white">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_160px_1fr_120px_28px] gap-3 border-b border-stone-200 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-stone-400">
        <div>Client</div>
        <div>Stage</div>
        <div>Immigration status</div>
        <div>Next action</div>
        <div>Owner</div>
        <div />
      </div>

      {/* Rows */}
      {rows.map((row) => {
        const ownerName = row.assigned_rcic ? staffById[row.assigned_rcic] : null;
        const countdown = expiryCountdown(row.immigration_status_expiry, row.immigration_status);
        const ball = BALL_COLORS[row.nextAction.ball];

        return (
          <Link
            key={row.id}
            href={`/dashboard/clients/${row.id}`}
            className={`grid grid-cols-[1fr_100px_160px_1fr_120px_28px] gap-3 items-center px-4 py-3 text-sm transition-colors hover:bg-stone-50 ${URGENCY_BORDER[row.urgency]} border-b border-stone-100 last:border-b-0`}
          >
            {/* Client */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--navy)] text-xs font-medium text-white">
                {initials(row.legal_name_full)}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium text-stone-900">
                  {row.legal_name_full}
                </div>
                <div className="truncate text-xs text-stone-400">
                  {row.client_number}
                </div>
              </div>
            </div>

            {/* Stage */}
            <div>
              <span
                className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${STAGE_COLORS[row.stage]}`}
              >
                {STAGE_LABELS[row.stage]}
              </span>
            </div>

            {/* Immigration status */}
            <div className="min-w-0">
              {row.immigration_status ? (
                <div>
                  <div className="truncate text-xs text-stone-700">
                    {IMMIGRATION_STATUS_LABELS[row.immigration_status]}
                    {row.immigration_status_detail && (
                      <span className="text-stone-400"> - {row.immigration_status_detail}</span>
                    )}
                  </div>
                  {countdown && (
                    <div
                      className={`text-[11px] ${
                        countdown.urgency === "critical"
                          ? "font-medium text-[var(--destructive)]"
                          : countdown.urgency === "attention"
                            ? "text-amber-700"
                            : "text-stone-400"
                      }`}
                    >
                      {countdown.text}
                    </div>
                  )}
                </div>
              ) : row.immigration_status_detail ? (
                // No immigration_status set on client, but an approved case
                // exists. Show the service type as the inferred status.
                <div className="truncate text-xs text-stone-600">
                  {row.immigration_status_detail}
                  {row.last_decision_status === "passport_requested" && (
                    <span className="ml-1 text-emerald-600">(Approved)</span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-stone-400">None</span>
              )}
            </div>

            {/* Next action */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-stone-700">
                  {row.nextAction.text}
                </span>
                <span
                  className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium ${ball.bg} ${ball.text}`}
                >
                  {ball.label}
                </span>
              </div>
              {row.nextAction.deadline && (
                <div
                  className={`text-[11px] ${
                    deadlineLabel(row.nextAction.deadline).overdue
                      ? "font-medium text-[var(--destructive)]"
                      : "text-stone-400"
                  }`}
                >
                  {deadlineLabel(row.nextAction.deadline).text}
                </div>
              )}
            </div>

            {/* Owner */}
            <div className="truncate text-xs text-stone-600">
              {ownerName ?? (
                <span className="text-stone-400">Unassigned</span>
              )}
            </div>

            {/* Chevron */}
            <ChevronRight className="h-4 w-4 text-stone-300" />
          </Link>
        );
      })}
    </div>
  );
}

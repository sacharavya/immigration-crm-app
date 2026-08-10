"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import {
  STAGE_LABELS,
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
  if (!expiry) return null;
  if (status && NO_EXPIRY_STATUSES.has(status)) return { text: "No expiry", urgency: "normal" };

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

function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorklistTable({
  rows,
  staffById,
  agentById,
}: {
  rows: WorklistRow[];
  staffById: Record<string, string>;
  agentById: Record<string, string>;
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
      <div className="grid grid-cols-[1fr_200px_100px_160px_120px_28px] gap-3 border-b border-stone-200 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-stone-400">
        <div>Client</div>
        <div>Contact</div>
        <div>Stage</div>
        <div>Immigration status</div>
        <div>Owner</div>
        <div />
      </div>

      {/* Rows */}
      {rows.map((row) => {
        const ownerName = row.assigned_rcic ? staffById[row.assigned_rcic] : null;
        // Effective status: the stored value, or one inferred from an approved
        // case's service type so every decided row reads consistently.
        const effStatus = row.immigration_status ?? row.immigration_status_inferred;
        const countdown = expiryCountdown(row.immigration_status_expiry, effStatus);
        const phone = formatPhone(row.phone_primary);
        const decision =
          row.last_decision_status === "passport_requested"
            ? { label: "Approved", className: "text-emerald-600" }
            : row.last_decision_status === "refused"
              ? { label: "Refused", className: "text-[var(--destructive)]" }
              : null;

        return (
          <Link
            key={row.id}
            href={`/dashboard/clients/${row.id}`}
            className={`grid grid-cols-[1fr_200px_100px_160px_120px_28px] gap-3 items-center px-4 py-3 text-sm transition-colors hover:bg-stone-50 ${URGENCY_BORDER[row.urgency]} border-b border-stone-100 last:border-b-0`}
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
                {row.created_by_agent && (
                  <div className="mt-0.5 inline-flex max-w-full items-center truncate bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                    Referred by: {agentById[row.created_by_agent] ?? "Referral"}
                  </div>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-1 min-w-0 text-xs">
              {row.email ? (
                <span className="truncate text-stone-700">{row.email}</span>
              ) : (
                <span className="text-stone-300">—</span>
              )}
              {phone ? (
                <span className="truncate text-stone-500">{phone}</span>
              ) : (
                <span className="text-stone-300">—</span>
              )}
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
              {effStatus ? (
                <div className="truncate text-xs text-stone-700">
                  {IMMIGRATION_STATUS_LABELS[effStatus]}
                  {row.immigration_status_detail && (
                    <span className="text-stone-400"> - {row.immigration_status_detail}</span>
                  )}
                  {decision && (
                    <span className={`ml-1 ${decision.className}`}>({decision.label})</span>
                  )}
                </div>
              ) : row.immigration_status_detail ? (
                // No status stored or inferable, but a decided (refused) case
                // exists. Show the service type with the decision outcome.
                <div className="truncate text-xs text-stone-600">
                  {row.immigration_status_detail}
                  {decision && (
                    <span className={`ml-1 ${decision.className}`}>({decision.label})</span>
                  )}
                </div>
              ) : decision ? (
                // No status and no service-type detail, but a decision
                // was recorded — surface the outcome on its own.
                <span className={`text-xs ${decision.className}`}>{decision.label}</span>
              ) : (
                <span className="text-xs text-stone-400">None</span>
              )}
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

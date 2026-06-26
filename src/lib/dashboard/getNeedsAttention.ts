// Rank the cases waiting on the firm, most urgent first, reusing the shared
// board derivations so the dashboard and the board never disagree. Each row
// carries exactly one reason and one resolving action.

import { PHASE_LABELS } from "@/lib/utils/phase";

import type { EnrichedCard } from "./boardCards";
import type { AttentionTier, NeedsAttentionRow } from "./types";

// How many rows to show before the rest move behind "View all".
export const NEEDS_ATTENTION_LIMIT = 6;

const TIER_RANK: Record<AttentionTier, number> = {
  critical: 0,
  high: 1,
  action: 2,
  aging: 3,
};

const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

function caseHref(id: string): string {
  return `/dashboard/cases/${id}`;
}

// Assign a single tier to a case: the most urgent signal it carries. A case
// that is both at risk and unpaid surfaces once, as critical.
function classify(
  entry: EnrichedCard,
): (NeedsAttentionRow & { sortKey: number }) | null {
  const { card } = entry;

  // Tier 1: at-risk submission deadline.
  if (card.signal === "at_risk") {
    const days = entry.daysUntilExpiry ?? 0;
    const reason =
      days < 0
        ? `Permit expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago, not yet submitted`
        : `Permit expires in ${days} day${days === 1 ? "" : "s"}, not yet submitted`;
    return {
      caseId: card.id,
      clientName: card.clientName,
      tier: "critical",
      reason,
      actionLabel: "Submit file",
      href: caseHref(card.id),
      sortKey: days, // ascending: overdue (negative) first
    };
  }

  // Tier 2: unpaid retainer blocking the start.
  if (
    card.status === "retainer_pending" &&
    entry.retainerSigned &&
    entry.outstandingCad > 0
  ) {
    return {
      caseId: card.id,
      clientName: card.clientName,
      tier: "high",
      reason: `Retainer unpaid, ${cad.format(entry.outstandingCad)} outstanding`,
      actionLabel: "Send reminder",
      href: caseHref(card.id),
      sortKey: -entry.outstandingCad,
    };
  }

  // Tier 3: client uploads awaiting firm review.
  if (
    entry.awaitingReview > 0 &&
    (card.status === "documentation_in_progress" ||
      card.status === "documentation_review")
  ) {
    return {
      caseId: card.id,
      clientName: card.clientName,
      tier: "action",
      reason: `${entry.awaitingReview} new client upload${entry.awaitingReview === 1 ? "" : "s"} to review`,
      actionLabel: "Review",
      href: `${caseHref(card.id)}?tab=checklist`,
      sortKey: -entry.awaitingReview,
    };
  }

  // Tier 4: stalled in phase. Submitted and Decision never stall.
  if (card.signal === "stalled") {
    return {
      caseId: card.id,
      clientName: card.clientName,
      tier: "aging",
      reason: `Stalled ${card.phaseAgeDays} days in ${PHASE_LABELS[card.phase]}`,
      actionLabel: "Open",
      href: caseHref(card.id),
      sortKey: -card.phaseAgeDays,
    };
  }

  return null;
}

export function getNeedsAttention(cards: EnrichedCard[]): NeedsAttentionRow[] {
  const rows = cards
    .map(classify)
    .filter((r): r is NeedsAttentionRow & { sortKey: number } => r !== null);

  rows.sort((a, b) => {
    const tierDiff = TIER_RANK[a.tier] - TIER_RANK[b.tier];
    if (tierDiff !== 0) return tierDiff;
    return a.sortKey - b.sortKey;
  });

  return rows.slice(0, NEEDS_ATTENTION_LIMIT).map((r) => ({
    caseId: r.caseId,
    clientName: r.clientName,
    tier: r.tier,
    reason: r.reason,
    actionLabel: r.actionLabel,
    href: r.href,
  }));
}

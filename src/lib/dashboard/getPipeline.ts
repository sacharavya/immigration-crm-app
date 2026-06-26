// Active cases by phase, with the "on us" count (ball in the firm's court)
// derived from the same board model the board uses, so the two agree.

import { PHASES } from "@/lib/utils/phase";

import type { EnrichedCard } from "./boardCards";
import type { PipelinePhase } from "./types";

// The Submitted phase reads "with IRCC" rather than an on-us count.
const SUBMITTED_PHASE = 4;

export function getPipeline(cards: EnrichedCard[]): PipelinePhase[] {
  return PHASES.map((p) => {
    const inPhase = cards.filter((c) => c.card.phase === p.number);
    const onUs = inPhase.filter((c) => c.card.ballInCourt === "firm").length;
    return {
      phase: p.number,
      label: p.label,
      count: inPhase.length,
      onUs,
      href: `/dashboard/cases?view=board&phase=${p.number}`,
      withIrcc: p.number === SUBMITTED_PHASE,
    };
  });
}

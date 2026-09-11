/**
 * Tests for deriveBoardCard - the cases-board card model.
 *
 * Run via: npm test (Node's built-in runner via tsx, no jest/vitest).
 *
 * A fixed `now` lets us assert exact phase ages and signals. Each test maps to
 * an acceptance criterion: ball in court, the new-uploads override, at-risk vs
 * stalled vs submitted, the documents count, payment state, and priority.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ChipOutput } from "./action-chip";
import { deriveBoardCard, type DeriveBoardCardInput } from "./board-card";
import type { SubmissionRisk } from "./submission-risk";
import type { CaseStatus } from "@/lib/utils/phase";

const FIXED_NOW = new Date("2026-06-25T12:00:00Z");

function daysAgo(days: number): string {
  return new Date(FIXED_NOW.getTime() - days * 86_400_000).toISOString();
}

function chip(over: Partial<ChipOutput> = {}): ChipOutput {
  return {
    text: "Awaiting client documents",
    responsibility: "client",
    urgency: "normal",
    waiting_days: null,
    ...over,
  };
}

function make(over: Partial<DeriveBoardCardInput> = {}): DeriveBoardCardInput {
  return {
    id: "c1",
    caseNumber: "BBI-001",
    clientName: "Ada Lovelace",
    serviceName: "Work Permit",
    status: "documentation_in_progress" as CaseStatus,
    priority: "normal",
    workerId: "w1",
    workerName: "Pat Worker",
    updatedAt: daysAgo(1),
    submittedAt: null,
    chip: chip(),
    risk: null,
    docs: { required: 4, received: 1, awaitingReview: 0 },
    payment: { totalCad: 1000, collectedCad: 0 },
    now: FIXED_NOW,
    ...over,
  };
}

describe("deriveBoardCard - ball in court", () => {
  it("maps chip 'us' to a firm move", () => {
    const card = make({ chip: chip({ responsibility: "us", text: "Submit to IRCC" }) });
    assert.equal(deriveBoardCard(card).ballInCourt, "firm");
  });

  it("maps chip 'client' to a client move", () => {
    assert.equal(deriveBoardCard(make()).ballInCourt, "client");
  });

  it("maps chip 'ircc' (and passive) to an IRCC move", () => {
    const ircc = make({
      status: "submitted_to_ircc",
      chip: chip({ responsibility: "ircc", text: "Awaiting IRCC response" }),
    });
    assert.equal(deriveBoardCard(ircc).ballInCourt, "ircc");
    const passive = make({
      status: "submitted_to_ircc",
      chip: chip({ responsibility: "passive", text: "Biometrics scheduled" }),
    });
    assert.equal(deriveBoardCard(passive).ballInCourt, "ircc");
  });
});

describe("deriveBoardCard - new uploads override", () => {
  it("flips a client wait to 'Review N new uploads' as a firm move", () => {
    const card = deriveBoardCard(
      make({
        status: "documentation_in_progress",
        chip: chip({ responsibility: "client", text: "Awaiting client documents" }),
        docs: { required: 4, received: 2, awaitingReview: 2 },
      }),
    );
    assert.equal(card.ballInCourt, "firm");
    assert.equal(card.statusText, "Review 2 new uploads");
  });

  it("singularises one upload", () => {
    const card = deriveBoardCard(
      make({ docs: { required: 4, received: 1, awaitingReview: 1 } }),
    );
    assert.equal(card.statusText, "Review 1 new upload");
  });

  it("does not override after submission", () => {
    const card = deriveBoardCard(
      make({
        status: "submitted_to_ircc",
        chip: chip({ responsibility: "ircc", text: "Awaiting IRCC response" }),
        docs: { required: 4, received: 4, awaitingReview: 1 },
      }),
    );
    assert.equal(card.statusText, "Awaiting IRCC response");
  });
});

describe("deriveBoardCard - signal and urgency", () => {
  it("at risk wins: red edge with the deadline line", () => {
    const risk: SubmissionRisk = {
      daysUntilExpiry: 20,
      overdue: false,
      fileBefore: "2026-07-15",
    };
    const card = deriveBoardCard(make({ risk, updatedAt: daysAgo(40) }));
    assert.equal(card.signal, "at_risk");
    assert.equal(card.urgency?.kind, "at_risk");
    assert.match(card.urgency!.text, /^File before/);
  });

  it("an overdue permit reads 'expired N days ago'", () => {
    const risk: SubmissionRisk = {
      daysUntilExpiry: -3,
      overdue: true,
      fileBefore: "2026-06-22",
    };
    const card = deriveBoardCard(make({ risk }));
    assert.equal(card.urgency?.text, "Permit expired 3 days ago");
  });

  it("stalled: amber edge after the threshold pre-submission", () => {
    const card = deriveBoardCard(
      make({ status: "documentation_in_progress", updatedAt: daysAgo(20) }),
    );
    assert.equal(card.signal, "stalled");
    assert.equal(card.urgency?.kind, "stalled");
    assert.equal(card.urgency?.text, "Stalled 20 days");
  });

  it("a submitted case shows neither stalled nor at risk, just 'submitted N days ago'", () => {
    const card = deriveBoardCard(
      make({
        status: "submitted_to_ircc",
        chip: chip({ responsibility: "ircc", text: "Awaiting IRCC response" }),
        updatedAt: daysAgo(30),
        submittedAt: daysAgo(30),
      }),
    );
    assert.equal(card.signal, "healthy");
    assert.equal(card.urgency?.kind, "submitted");
    assert.equal(card.urgency?.text, "Submitted 30 days ago");
  });

  it("a fresh case is healthy with no urgency line", () => {
    const card = deriveBoardCard(make({ updatedAt: daysAgo(2) }));
    assert.equal(card.signal, "healthy");
    assert.equal(card.urgency, null);
  });
});

describe("deriveBoardCard - documents and payment", () => {
  it("documents reflect received over required", () => {
    const card = deriveBoardCard(
      make({ docs: { required: 5, received: 3, awaitingReview: 0 } }),
    );
    assert.equal(card.docsRequired, 5);
    assert.equal(card.docsReceived, 3);
  });

  it("payment: paid, partial, unpaid, and none", () => {
    assert.equal(
      deriveBoardCard(make({ payment: { totalCad: 1000, collectedCad: 1000 } }))
        .payment.state,
      "paid",
    );
    const partial = deriveBoardCard(
      make({ payment: { totalCad: 1000, collectedCad: 400 } }),
    ).payment;
    assert.equal(partial.state, "partial");
    assert.match(partial.label, /\$400 of \$1,000/);
    const unpaid = deriveBoardCard(
      make({ payment: { totalCad: 1000, collectedCad: 0 } }),
    ).payment;
    assert.equal(unpaid.state, "unpaid");
    assert.match(unpaid.label, /\$1,000 due/);
    assert.equal(
      deriveBoardCard(make({ payment: { totalCad: 0, collectedCad: 0 } }))
        .payment.state,
      "none",
    );
  });
});

describe("deriveBoardCard - priority", () => {
  it("'normal' reads as none (no pill)", () => {
    assert.equal(deriveBoardCard(make({ priority: "normal" })).priority, "none");
    assert.equal(deriveBoardCard(make({ priority: null })).priority, "none");
  });

  it("preserves high and critical", () => {
    assert.equal(deriveBoardCard(make({ priority: "high" })).priority, "high");
    assert.equal(
      deriveBoardCard(make({ priority: "critical" })).priority,
      "critical",
    );
  });
});

describe("deriveBoardCard - decision badge", () => {
  it("maps passport_requested to approved", () => {
    const card = make({ status: "passport_requested" as CaseStatus });
    assert.equal(deriveBoardCard(card).decision, "approved");
  });

  it("maps refused to refused", () => {
    const card = make({ status: "refused" as CaseStatus });
    assert.equal(deriveBoardCard(card).decision, "refused");
  });

  it("is null outside the decision phase", () => {
    assert.equal(deriveBoardCard(make()).decision, null);
  });
});

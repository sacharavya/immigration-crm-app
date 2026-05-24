/**
 * Tests for computeActionChip — one per vocabulary row.
 *
 * Run via: npm run test:chip
 * (uses Node's built-in test runner via tsx — no jest/vitest install).
 *
 * The fixed `now` timestamp lets us assert exact waiting_days values.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  computeActionChip,
  type ChipInput,
} from "./action-chip";

const FIXED_NOW = new Date("2026-05-17T12:00:00Z");

function daysAgo(days: number): string {
  return new Date(
    FIXED_NOW.getTime() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function makeInput(overrides: {
  case?: Partial<ChipInput["case"]>;
  retainer?: ChipInput["retainer"];
  payments?: Partial<ChipInput["payments"]>;
  documents?: Partial<ChipInput["documents"]>;
  latest_event?: ChipInput["latest_event"];
  additional_docs?: ChipInput["additional_docs"];
  now?: Date;
}): ChipInput {
  return {
    case: {
      status: "retainer_pending",
      biometrics_status: "pending",
      updated_at: FIXED_NOW.toISOString(),
      retainer_minimum_cad: null,
      quoted_fee_cad: 1000,
      ...overrides.case,
    },
    retainer:
      overrides.retainer === undefined ? null : overrides.retainer,
    payments: { collected_cad: 0, ...overrides.payments },
    documents: {
      required: 0,
      uploaded: 0,
      accepted: 0,
      rejected: 0,
      last_rejected_at: null,
      ...overrides.documents,
    },
    latest_event:
      overrides.latest_event === undefined ? null : overrides.latest_event,
    additional_docs:
      overrides.additional_docs === undefined ? null : overrides.additional_docs,
    now: overrides.now ?? FIXED_NOW,
  };
}

describe("computeActionChip", () => {
  describe("Phase 1: Retainer Pending", () => {
    it("returns 'Prepare retainer' when no retainer record", () => {
      const r = computeActionChip(makeInput({}));
      assert.equal(r.text, "Prepare retainer");
      assert.equal(r.responsibility, "us");
      assert.equal(r.urgency, "normal");
    });

    it("returns 'Prepare retainer' when retainer is draft without fee breakdown", () => {
      const r = computeActionChip(
        makeInput({
          retainer: { status: "draft", sent_at: null, has_fee_breakdown: false },
        }),
      );
      assert.equal(r.text, "Prepare retainer");
    });

    it("returns 'Send retainer to client' when retainer is draft with fee breakdown", () => {
      const r = computeActionChip(
        makeInput({
          retainer: { status: "draft", sent_at: null, has_fee_breakdown: true },
        }),
      );
      assert.equal(r.text, "Send retainer to client");
      assert.equal(r.responsibility, "us");
    });

    it("returns 'Awaiting client signature' (normal) under 7 days", () => {
      const r = computeActionChip(
        makeInput({
          retainer: {
            status: "pending_signature",
            sent_at: daysAgo(3),
            has_fee_breakdown: true,
          },
        }),
      );
      assert.equal(r.text, "Awaiting client signature");
      assert.equal(r.responsibility, "client");
      assert.equal(r.urgency, "normal");
      assert.equal(r.waiting_days, 3);
    });

    it("returns 'Awaiting client signature · 10 days' (sensitive) between 7-13 days", () => {
      const r = computeActionChip(
        makeInput({
          retainer: {
            status: "pending_signature",
            sent_at: daysAgo(10),
            has_fee_breakdown: true,
          },
        }),
      );
      assert.equal(r.text, "Awaiting client signature · 10 days");
      assert.equal(r.urgency, "sensitive");
    });

    it("returns 'Awaiting client signature · 14 days' (overdue) at 14+ days", () => {
      const r = computeActionChip(
        makeInput({
          retainer: {
            status: "pending_signature",
            sent_at: daysAgo(14),
            has_fee_breakdown: true,
          },
        }),
      );
      assert.equal(r.text, "Awaiting client signature · 14 days");
      assert.equal(r.urgency, "overdue");
    });

    it("returns 'Record retainer payment' when signed without minimum payment", () => {
      const r = computeActionChip(
        makeInput({
          case: { retainer_minimum_cad: 500 },
          retainer: { status: "signed", sent_at: daysAgo(1), has_fee_breakdown: true },
          payments: { collected_cad: 0 },
        }),
      );
      assert.equal(r.text, "Record retainer payment");
      assert.equal(r.responsibility, "us");
    });

    it("returns 'Advance to Documents' when signed and minimum collected", () => {
      const r = computeActionChip(
        makeInput({
          case: { retainer_minimum_cad: 500 },
          retainer: { status: "signed", sent_at: daysAgo(1), has_fee_breakdown: true },
          payments: { collected_cad: 500 },
        }),
      );
      assert.equal(r.text, "Advance to Documents");
    });

    it("returns 'Prepare retainer' when retainer is void/expired", () => {
      const r = computeActionChip(
        makeInput({
          retainer: { status: "void", sent_at: null, has_fee_breakdown: true },
        }),
      );
      assert.equal(r.text, "Prepare retainer");
    });
  });

  describe("Phase 2: Documents in progress", () => {
    const base = { case: { status: "documentation_in_progress" as const } };

    it("returns 'Mark required documents' when none required yet", () => {
      const r = computeActionChip(makeInput({ ...base }));
      assert.equal(r.text, "Mark required documents");
    });

    it("returns 'Awaiting client documents' when required > uploaded", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          documents: { required: 5, uploaded: 2 },
        }),
      );
      assert.equal(r.text, "Awaiting client documents");
      assert.equal(r.responsibility, "client");
    });

    it("returns 'Awaiting client re-upload' (normal) when rejection is recent", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          documents: {
            required: 5,
            uploaded: 4,
            rejected: 1,
            last_rejected_at: daysAgo(2),
          },
        }),
      );
      assert.equal(r.text, "Awaiting client re-upload");
      assert.equal(r.urgency, "normal");
    });

    it("returns 'Awaiting client re-upload · 8 days' (sensitive) when rejection is stale", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          documents: {
            required: 5,
            uploaded: 4,
            rejected: 1,
            last_rejected_at: daysAgo(8),
          },
        }),
      );
      assert.equal(r.text, "Awaiting client re-upload · 8 days");
      assert.equal(r.urgency, "sensitive");
    });

    it("returns 'Review uploaded documents' when all uploaded but not all accepted", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          documents: { required: 5, uploaded: 5, accepted: 3 },
        }),
      );
      assert.equal(r.text, "Review uploaded documents");
      assert.equal(r.responsibility, "us");
    });

    it("returns 'Advance to Review' when all uploaded and accepted", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          documents: { required: 5, uploaded: 5, accepted: 5 },
        }),
      );
      assert.equal(r.text, "Advance to Review");
    });
  });

  describe("Phase 3: Documentation Review", () => {
    const base = { case: { status: "documentation_review" as const } };

    it("returns 'RCIC reviewing documents' when not yet fully accepted", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          documents: { required: 5, accepted: 3 },
        }),
      );
      assert.equal(r.text, "RCIC reviewing documents");
    });

    it("returns 'Submit to IRCC' when all required docs accepted", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          documents: { required: 5, accepted: 5 },
        }),
      );
      assert.equal(r.text, "Submit to IRCC");
    });
  });

  describe("Phase 4: Submitted to IRCC", () => {
    const base = { case: { status: "submitted_to_ircc" as const } };

    it("returns 'Awaiting IRCC response' by default", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          case: { status: "submitted_to_ircc", updated_at: daysAgo(10) },
        }),
      );
      assert.equal(r.text, "Awaiting IRCC response");
      assert.equal(r.responsibility, "ircc");
      assert.equal(r.urgency, "normal");
      assert.equal(r.waiting_days, 10);
    });

    it("returns 'Awaiting IRCC response · N days' (sensitive) after 90+ days", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          case: { status: "submitted_to_ircc", updated_at: daysAgo(95) },
        }),
      );
      assert.equal(r.text, "Awaiting IRCC response · 95 days");
      assert.equal(r.urgency, "sensitive");
    });

    it("returns 'Schedule biometrics with client' on biometrics_requested event", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          latest_event: {
            event_type: "biometrics_requested",
            occurred_at: daysAgo(1),
            event_data: {},
          },
        }),
      );
      assert.equal(r.text, "Schedule biometrics with client");
      assert.equal(r.responsibility, "us");
      assert.equal(r.urgency, "sensitive");
    });

    it("returns 'Biometrics on <date>' when scheduled with a date", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          latest_event: {
            event_type: "biometrics_scheduled",
            occurred_at: daysAgo(1),
            event_data: { scheduled_date: "2026-06-01" },
          },
        }),
      );
      assert.match(r.text, /^Biometrics on /);
      assert.equal(r.responsibility, "passive");
    });

    it("returns 'Biometrics scheduled' fallback when no date in event data", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          latest_event: {
            event_type: "biometrics_scheduled",
            occurred_at: daysAgo(1),
            event_data: {},
          },
        }),
      );
      assert.equal(r.text, "Biometrics scheduled");
    });

    it("returns 'Respond to IRCC by <date>' on additional_info_requested with due date", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          latest_event: {
            event_type: "additional_info_requested",
            occurred_at: daysAgo(1),
            event_data: { due_date: "2026-06-15" },
          },
        }),
      );
      assert.match(r.text, /^Respond to IRCC by /);
      assert.equal(r.urgency, "sensitive");
    });

    it("returns 'Respond to IRCC' fallback when no due date in event data", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          latest_event: {
            event_type: "additional_info_requested",
            occurred_at: daysAgo(1),
            event_data: {},
          },
        }),
      );
      assert.equal(r.text, "Respond to IRCC");
    });

    it("returns 'Interview on <date>' when interview is scheduled", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          latest_event: {
            event_type: "interview_scheduled",
            occurred_at: daysAgo(1),
            event_data: { interview_date: "2026-07-04" },
          },
        }),
      );
      assert.match(r.text, /^Interview on /);
      assert.equal(r.responsibility, "passive");
    });

    it("returns 'Review returned application' on application_returned event", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          latest_event: {
            event_type: "application_returned",
            occurred_at: daysAgo(1),
            event_data: {},
          },
        }),
      );
      assert.equal(r.text, "Review returned application");
      assert.equal(r.responsibility, "us");
    });

    it("returns 'Upload additional documents · due …' (sensitive) when request is open and on-time", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          additional_docs: {
            requested: 2,
            uploaded: 0,
            accepted: 0,
            latest_request_due: "2026-06-30",
            submitted_after_request: false,
          },
        }),
      );
      assert.match(r.text, /^Upload additional documents · due /);
      assert.equal(r.responsibility, "client");
      assert.equal(r.urgency, "sensitive");
    });

    it("returns 'Upload additional documents · due …' (overdue) when the due date has passed", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          additional_docs: {
            requested: 2,
            uploaded: 1,
            accepted: 0,
            latest_request_due: "2026-04-01",
            submitted_after_request: false,
          },
        }),
      );
      assert.equal(r.urgency, "overdue");
      assert.equal(r.responsibility, "client");
    });

    it("returns 'Review additional documents' when all uploaded but not all accepted", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          additional_docs: {
            requested: 2,
            uploaded: 2,
            accepted: 1,
            latest_request_due: null,
            submitted_after_request: false,
          },
        }),
      );
      assert.equal(r.text, "Review additional documents");
      assert.equal(r.responsibility, "us");
    });

    it("returns 'Submit additional documents to IRCC' when all accepted", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          additional_docs: {
            requested: 2,
            uploaded: 2,
            accepted: 2,
            latest_request_due: null,
            submitted_after_request: false,
          },
        }),
      );
      assert.equal(r.text, "Submit additional documents to IRCC");
      assert.equal(r.responsibility, "us");
      assert.equal(r.urgency, "sensitive");
    });

    it("falls back to 'Awaiting IRCC response' after additional_info_submitted closes out the request", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          additional_docs: {
            requested: 2,
            uploaded: 2,
            accepted: 2,
            latest_request_due: null,
            submitted_after_request: true,
          },
        }),
      );
      assert.equal(r.text, "Awaiting IRCC response");
    });

    it("falls back to 'Awaiting IRCC response' after biometrics_completed", () => {
      const r = computeActionChip(
        makeInput({
          ...base,
          case: { status: "submitted_to_ircc", updated_at: daysAgo(10) },
          latest_event: {
            event_type: "biometrics_completed",
            occurred_at: daysAgo(1),
            event_data: {},
          },
        }),
      );
      assert.equal(r.text, "Awaiting IRCC response");
    });
  });

  describe("Phase 5: Decision outcomes", () => {
    it("returns 'Submit passport to IRCC' (sensitive) within 7 days of approval", () => {
      const r = computeActionChip(
        makeInput({
          case: { status: "passport_requested", updated_at: daysAgo(3) },
        }),
      );
      assert.equal(r.text, "Submit passport to IRCC");
      assert.equal(r.urgency, "sensitive");
    });

    it("returns 'Submit passport to IRCC · 10 days' (overdue) after 7 days", () => {
      const r = computeActionChip(
        makeInput({
          case: { status: "passport_requested", updated_at: daysAgo(10) },
        }),
      );
      assert.equal(r.text, "Submit passport to IRCC · 10 days");
      assert.equal(r.urgency, "overdue");
    });

    it("returns 'Discuss refusal with client' for refused cases", () => {
      const r = computeActionChip(
        makeInput({
          case: { status: "refused" },
        }),
      );
      assert.equal(r.text, "Discuss refusal with client");
      assert.equal(r.responsibility, "us");
    });
  });

  describe("Closed", () => {
    it("returns 'Closed' with passive responsibility", () => {
      const r = computeActionChip(
        makeInput({ case: { status: "closed" } }),
      );
      assert.equal(r.text, "Closed");
      assert.equal(r.responsibility, "passive");
    });
  });
});

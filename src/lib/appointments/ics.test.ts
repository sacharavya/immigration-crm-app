/**
 * Tests for buildIcs — the .ics generator.
 *
 * Run via: npm test (node:test through tsx).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildIcs } from "./ics";

const baseInput = {
  uid: "00000000-0000-0000-0000-000000000001",
  subject: "Initial Consultation with genzdatalabs Immigration",
  description: "Your Initial Consultation appointment.",
  starts_at: "2026-06-02T14:00:00Z", // 10:00 EDT
  ends_at: "2026-06-02T14:30:00Z",
  location: "Online: https://teams.microsoft.com/abc",
  organizer_email: "info@genzdatalabs.com",
  organizer_name: "genzdatalabs Immigration",
  attendee_email: "jane@example.com",
  attendee_name: "Jane Doe",
};

describe("buildIcs", () => {
  it("emits a valid VCALENDAR/VEVENT envelope", () => {
    const ics = buildIcs(baseInput);
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /\r\nBEGIN:VEVENT\r\n/);
    assert.match(ics, /\r\nEND:VEVENT\r\n/);
    assert.match(ics, /\r\nEND:VCALENDAR\r\n$/);
    assert.match(ics, /\r\nVERSION:2\.0\r\n/);
  });

  it("formats DTSTART/DTEND in UTC compact form", () => {
    const ics = buildIcs(baseInput);
    assert.match(ics, /\r\nDTSTART:20260602T140000Z\r\n/);
    assert.match(ics, /\r\nDTEND:20260602T143000Z\r\n/);
  });

  it("scopes UID to the firm and embeds organizer + attendee", () => {
    const ics = buildIcs(baseInput);
    assert.match(
      ics,
      /\r\nUID:00000000-0000-0000-0000-000000000001@genzdatalabs\.com\r\n/,
    );
    assert.match(
      ics,
      /\r\nORGANIZER;CN=genzdatalabs Immigration:mailto:info@genzdatalabs\.com\r\n/,
    );
    assert.match(
      ics,
      /\r\nATTENDEE;CN=Jane Doe;RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:jane@example\.com\r\n/,
    );
  });

  it("escapes commas and semicolons per RFC 5545", () => {
    const ics = buildIcs({
      ...baseInput,
      subject: "Review: passport, visa; biometrics",
      location: "211-2390 Eglinton Ave E, Toronto, ON",
    });
    assert.match(
      ics,
      /\r\nSUMMARY:Review: passport\\, visa\\; biometrics\r\n/,
    );
    assert.match(
      ics,
      /\r\nLOCATION:211-2390 Eglinton Ave E\\, Toronto\\, ON\r\n/,
    );
  });

  it("flips METHOD + STATUS for cancellations and bumps SEQUENCE for updates", () => {
    const confirmed = buildIcs(baseInput);
    assert.match(confirmed, /\r\nMETHOD:REQUEST\r\n/);
    assert.match(confirmed, /\r\nSTATUS:CONFIRMED\r\n/);
    assert.match(confirmed, /\r\nSEQUENCE:0\r\n/);

    const cancelled = buildIcs({
      ...baseInput,
      status: "CANCELLED",
      sequence: 2,
    });
    assert.match(cancelled, /\r\nMETHOD:CANCEL\r\n/);
    assert.match(cancelled, /\r\nSTATUS:CANCELLED\r\n/);
    assert.match(cancelled, /\r\nSEQUENCE:2\r\n/);
  });
});

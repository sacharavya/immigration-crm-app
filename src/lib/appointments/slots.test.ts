/**
 * Tests for generateOpenSlots — the pure open-slot generator.
 *
 * Run via: npm test (Node's built-in runner through tsx, no jest/vitest).
 *
 * Baseline: America/Toronto. 2026-05-25 is a Monday and falls in EDT
 * (UTC-4), so 09:00 Toronto == 13:00 UTC. All UTC assertions below derive
 * from that offset. The DST tests use March 2025 to exercise the
 * spring-forward boundary.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { generateOpenSlots, type SlotsInput } from "./slots";

function makeInput(overrides: {
  settings?: Partial<SlotsInput["settings"]>;
  duration_minutes?: number;
  busy_intervals?: SlotsInput["busy_intervals"];
  now?: Date;
}): SlotsInput {
  return {
    settings: {
      hours_by_weekday: {
        mon: [{ start: "09:00", end: "17:00" }],
        tue: [{ start: "09:00", end: "17:00" }],
        wed: [{ start: "09:00", end: "17:00" }],
        thu: [{ start: "09:00", end: "17:00" }],
        fri: [{ start: "09:00", end: "17:00" }],
      },
      slot_increment_minutes: 30,
      buffer_between_appointments_minutes: 0,
      minimum_lead_time_hours: 0,
      maximum_horizon_days: 7,
      timezone: "America/Toronto",
      ...overrides.settings,
    },
    duration_minutes: overrides.duration_minutes ?? 30,
    busy_intervals: overrides.busy_intervals ?? [],
    now: overrides.now ?? new Date("2026-05-25T13:00:00Z"), // Monday 09:00 Toronto
  };
}

describe("generateOpenSlots", () => {
  it("1. returns no slots on a weekend with weekday-only hours", () => {
    const slots = generateOpenSlots(
      makeInput({
        now: new Date("2026-05-30T12:00:00Z"), // Saturday
        settings: { maximum_horizon_days: 1 }, // Sat + Sun only
      }),
    );
    assert.equal(slots.length, 0);
  });

  it("2. returns 16 slots on a normal 9-5 weekday (30-min)", () => {
    const slots = generateOpenSlots(
      makeInput({ settings: { maximum_horizon_days: 0 } }),
    );
    assert.equal(slots.length, 16);
  });

  it("3. excludes slots within the minimum lead time", () => {
    const slots = generateOpenSlots(
      makeInput({
        settings: { minimum_lead_time_hours: 2, maximum_horizon_days: 0 },
      }),
    );
    // 9:00-5:00 = 16 slots; lead time 2h excludes 9:00/9:30/10:00/10:30
    assert.equal(slots.length, 12);
    assert.equal(slots[0].start_utc, "2026-05-25T15:00:00.000Z"); // 11:00 Toronto
  });

  it("4. excludes slots beyond the maximum horizon", () => {
    const slots = generateOpenSlots(
      makeInput({ settings: { maximum_horizon_days: 1 } }),
    );
    // Monday + Tuesday fully = 32 slots; nothing on Wednesday (05-27)
    assert.equal(slots.length, 32);
    assert.ok(
      slots.every((s) => !s.start_utc.startsWith("2026-05-27")),
      "no slot should land on Wednesday",
    );
  });

  it("5. excludes a slot overlapping a busy interval", () => {
    const slots = generateOpenSlots(
      makeInput({
        settings: { maximum_horizon_days: 0 },
        busy_intervals: [
          // 10:00-10:30 Toronto = 14:00-14:30 UTC
          { start: "2026-05-25T14:00:00Z", end: "2026-05-25T14:30:00Z" },
        ],
      }),
    );
    assert.equal(slots.length, 15);
    assert.ok(
      !slots.some((s) => s.start_utc === "2026-05-25T14:00:00.000Z"),
      "10:00 slot should be excluded",
    );
  });

  it("6. excludes slots entirely inside a busy interval", () => {
    const slots = generateOpenSlots(
      makeInput({
        settings: { maximum_horizon_days: 0 },
        busy_intervals: [
          // whole workday busy: 09:00-17:00 Toronto = 13:00-21:00 UTC
          { start: "2026-05-25T13:00:00Z", end: "2026-05-25T21:00:00Z" },
        ],
      }),
    );
    assert.equal(slots.length, 0);
  });

  it("7. includes slots adjacent to a busy interval (no overlap)", () => {
    const slots = generateOpenSlots(
      makeInput({
        settings: { maximum_horizon_days: 0 },
        busy_intervals: [
          { start: "2026-05-25T14:00:00Z", end: "2026-05-25T14:30:00Z" }, // 10:00-10:30
        ],
      }),
    );
    // 9:30-10:00 ends exactly at busy start; 10:30-11:00 starts at busy end
    assert.ok(slots.some((s) => s.start_utc === "2026-05-25T13:30:00.000Z"));
    assert.ok(slots.some((s) => s.start_utc === "2026-05-25T14:30:00.000Z"));
  });

  it("8. buffer pushes an otherwise-free slot into a busy interval", () => {
    const busy = [
      { start: "2026-05-25T14:00:00Z", end: "2026-05-25T14:30:00Z" }, // 10:00-10:30
    ];
    const withoutBuffer = generateOpenSlots(
      makeInput({
        settings: {
          maximum_horizon_days: 0,
          buffer_between_appointments_minutes: 0,
        },
        busy_intervals: busy,
      }),
    );
    const withBuffer = generateOpenSlots(
      makeInput({
        settings: {
          maximum_horizon_days: 0,
          buffer_between_appointments_minutes: 15,
        },
        busy_intervals: busy,
      }),
    );
    // 9:30-10:00 is free with no buffer but excluded once a 15-min buffer
    // bleeds its end (10:00 -> 10:15) into the busy window.
    assert.ok(
      withoutBuffer.some((s) => s.start_utc === "2026-05-25T13:30:00.000Z"),
    );
    assert.ok(
      !withBuffer.some((s) => s.start_utc === "2026-05-25T13:30:00.000Z"),
    );
  });

  it("9. multi-range day generates both ranges but not during lunch", () => {
    const slots = generateOpenSlots(
      makeInput({
        settings: {
          hours_by_weekday: {
            mon: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
          maximum_horizon_days: 0,
        },
      }),
    );
    // 9-12 = 6 slots, 13-17 = 8 slots => 14
    assert.equal(slots.length, 14);
    // no slot starts at 12:00 (16:00 UTC) or 12:30 (16:30 UTC)
    assert.ok(
      !slots.some(
        (s) =>
          s.start_utc === "2026-05-25T16:00:00.000Z" ||
          s.start_utc === "2026-05-25T16:30:00.000Z",
      ),
      "no slot during the lunch hour",
    );
  });

  it("10. slots are generated in the firm timezone, not UTC", () => {
    const slots = generateOpenSlots(
      makeInput({ settings: { maximum_horizon_days: 0 } }),
    );
    // First slot is 09:00 Toronto == 13:00 UTC, NOT 09:00 UTC.
    assert.equal(slots[0].start_utc, "2026-05-25T13:00:00.000Z");
  });

  it("11. DST spring-forward day yields fewer slots across the lost hour", () => {
    // 2025-03-09 (Sunday): clocks jump 02:00 EST -> 03:00 EDT.
    // A 01:00-05:00 window is wall-clock 4h but only 3 real hours.
    const dstDay = generateOpenSlots(
      makeInput({
        now: new Date("2025-03-09T06:00:00Z"), // 01:00 EST
        settings: {
          hours_by_weekday: { sun: [{ start: "01:00", end: "05:00" }] },
          maximum_horizon_days: 0,
        },
      }),
    );
    // 3 real hours / 30 min = 6 slots (a naive calc would give 8).
    assert.equal(dstDay.length, 6);

    // Control: a normal Sunday (no transition) gives the full 8.
    const normalDay = generateOpenSlots(
      makeInput({
        now: new Date("2025-03-16T05:00:00Z"), // 01:00 EDT
        settings: {
          hours_by_weekday: { sun: [{ start: "01:00", end: "05:00" }] },
          maximum_horizon_days: 0,
        },
      }),
    );
    assert.equal(normalDay.length, 8);
  });

  it("12. 15-min increment with 30-min duration creates overlapping starts", () => {
    const slots = generateOpenSlots(
      makeInput({
        settings: { slot_increment_minutes: 15, maximum_horizon_days: 0 },
      }),
    );
    // starts every 15 min from 9:00 to 16:30 => 31 slots
    assert.equal(slots.length, 31);
    assert.equal(slots[0].start_utc, "2026-05-25T13:00:00.000Z"); // 9:00
    assert.equal(slots[1].start_utc, "2026-05-25T13:15:00.000Z"); // 9:15
    // slot 0 (9:00-9:30) overlaps slot 1 (9:15-9:45)
    assert.ok(slots[0].end_utc > slots[1].start_utc);
  });

  it("13. empty hours_by_weekday produces no slots even on weekdays", () => {
    const slots = generateOpenSlots(
      makeInput({ settings: { hours_by_weekday: {} } }),
    );
    assert.equal(slots.length, 0);
  });

  it("14. first slot is at/after now when now is mid-range", () => {
    const slots = generateOpenSlots(
      makeInput({
        now: new Date("2026-05-25T14:00:00Z"), // 10:00 Toronto, mid-range
        settings: { maximum_horizon_days: 0 },
      }),
    );
    // range opens at 9:00 but the first slot is 10:00 (now), not 9:00
    assert.equal(slots[0].start_utc, "2026-05-25T14:00:00.000Z");
    assert.equal(slots.length, 14); // 10:00..16:30
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";

import { defaultFileName, formatBytes, SIZE_PRESETS } from "../presets";

// ---------------------------------------------------------------------------
// defaultFileName
// ---------------------------------------------------------------------------

test("defaultFileName: formats the local date with zero padding", () => {
  assert.equal(
    defaultFileName(new Date(2026, 0, 5)),
    "Submission_Package_2026-01-05.pdf",
  );
  assert.equal(
    defaultFileName(new Date(2026, 11, 31)),
    "Submission_Package_2026-12-31.pdf",
  );
});

// ---------------------------------------------------------------------------
// formatBytes
// ---------------------------------------------------------------------------

test("formatBytes: bytes below 1000 stay in B", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(999), "999 B");
});

test("formatBytes: decimal units with sensible precision", () => {
  assert.equal(formatBytes(1000), "1.00 KB");
  assert.equal(formatBytes(4_000_000), "4.00 MB");
  assert.equal(formatBytes(2_500_000), "2.50 MB");
  assert.equal(formatBytes(10_000_000), "10.0 MB");
  assert.equal(formatBytes(123_456_789), "123 MB");
  assert.equal(formatBytes(1_500_000_000), "1.50 GB");
});

test("formatBytes: garbage in, zero out", () => {
  assert.equal(formatBytes(-5), "0 B");
  assert.equal(formatBytes(Number.NaN), "0 B");
});

// ---------------------------------------------------------------------------
// SIZE_PRESETS shape
// ---------------------------------------------------------------------------

test("SIZE_PRESETS: expected targets", () => {
  const byKey = new Map(SIZE_PRESETS.map((p) => [p.key, p.targetBytes]));
  assert.equal(byKey.get("ircc-portal"), 4_000_000);
  assert.equal(byKey.get("portal-2mb"), 2_000_000);
  assert.equal(byKey.get("oinp"), 10_000_000);
  assert.equal(byKey.get("merge-only"), null);
  assert.equal(new Set(SIZE_PRESETS.map((p) => p.key)).size, 5);
});

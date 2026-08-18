import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scaleForDpi,
  scaleForMaxEdge,
  toGrayscaleRgba,
} from "../pdfium/raster-math";

// ---------------------------------------------------------------------------
// scaleForDpi
// ---------------------------------------------------------------------------

test("scaleForDpi: 72 dpi is 1px per point", () => {
  assert.deepEqual(scaleForDpi(612, 792, 72), { width: 612, height: 792 });
});

test("scaleForDpi: letter page at 150 dpi", () => {
  assert.deepEqual(scaleForDpi(612, 792, 150), { width: 1275, height: 1650 });
});

test("scaleForDpi: rounds to nearest pixel", () => {
  // 100.5pt at 96 dpi = 134.0 exactly; 100pt = 133.33 -> 133.
  assert.deepEqual(scaleForDpi(100, 100, 96), { width: 133, height: 133 });
});

test("scaleForDpi: never returns less than 1px", () => {
  assert.deepEqual(scaleForDpi(1, 1, 10), { width: 1, height: 1 });
});

// ---------------------------------------------------------------------------
// scaleForMaxEdge
// ---------------------------------------------------------------------------

test("scaleForMaxEdge: portrait, height is the long edge", () => {
  assert.deepEqual(scaleForMaxEdge(612, 792, 396), { width: 306, height: 396 });
});

test("scaleForMaxEdge: landscape, width is the long edge", () => {
  assert.deepEqual(scaleForMaxEdge(792, 612, 396), { width: 396, height: 306 });
});

test("scaleForMaxEdge: square scales both edges to max", () => {
  assert.deepEqual(scaleForMaxEdge(500, 500, 200), { width: 200, height: 200 });
});

test("scaleForMaxEdge: extreme aspect ratio keeps short edge at 1px minimum", () => {
  assert.deepEqual(scaleForMaxEdge(1, 10000, 100), { width: 1, height: 100 });
});

// ---------------------------------------------------------------------------
// toGrayscaleRgba
// ---------------------------------------------------------------------------

test("toGrayscaleRgba: converts in place with Rec. 601 weights, alpha untouched", () => {
  const data = new Uint8ClampedArray([
    255, 0, 0, 200, // red -> 76
    0, 255, 0, 100, // green -> 150
    0, 0, 255, 50, // blue -> 29
  ]);
  toGrayscaleRgba(data);
  assert.deepEqual(
    Array.from(data),
    [76, 76, 76, 200, 150, 150, 150, 100, 29, 29, 29, 50],
  );
});

test("toGrayscaleRgba: gray stays gray, works on Uint8Array too", () => {
  const data = new Uint8Array([128, 128, 128, 255]);
  toGrayscaleRgba(data);
  assert.deepEqual(Array.from(data), [128, 128, 128, 255]);
});

test("toGrayscaleRgba: empty buffer is a no-op", () => {
  const data = new Uint8ClampedArray(0);
  toGrayscaleRgba(data);
  assert.equal(data.length, 0);
});

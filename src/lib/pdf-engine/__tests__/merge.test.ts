import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import { mergePages, type MergeInput } from "../ops/merge";
import type { Rotation } from "../types";

// Two pages per doc so index selection is actually exercised.
async function makeDoc(w: number, h: number, marker: string): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 2; i++) {
    const page = doc.addPage([w, h]);
    page.drawText(`${marker}-${i}`, { x: 10, y: 10, size: 8 });
  }
  return doc;
}

test("mergePages: interleaved order, sizes, rotations, progress", async () => {
  const a = await makeDoc(100, 200, "A");
  const b = await makeDoc(300, 400, "B");

  const items: MergeInput[] = [
    { doc: a, pageIndex: 0, rotation: 0 },
    { doc: b, pageIndex: 0, rotation: 90 },
    { doc: a, pageIndex: 1, rotation: 90 },
    { doc: b, pageIndex: 1, rotation: 0 },
  ];

  const progress: Array<[number, number]> = [];
  const merged = await mergePages(items, (done, total) => progress.push([done, total]));

  assert.equal(merged.getPageCount(), 4);

  const expected: Array<{ w: number; h: number; angle: number }> = [
    { w: 100, h: 200, angle: 0 },
    { w: 300, h: 400, angle: 90 },
    { w: 100, h: 200, angle: 90 },
    { w: 300, h: 400, angle: 0 },
  ];
  merged.getPages().forEach((page, i) => {
    const { width, height } = page.getSize();
    assert.equal(width, expected[i].w, `page ${i} width`);
    assert.equal(height, expected[i].h, `page ${i} height`);
    assert.equal(page.getRotation().angle, expected[i].angle, `page ${i} rotation`);
  });

  assert.deepEqual(progress, [
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ]);
});

test("mergePages: adds to the source page's existing rotation, normalized", async () => {
  const src = await makeDoc(100, 200, "R");
  src.getPage(0).setRotation(degrees(270));

  const rotation: Rotation = 180;
  const merged = await mergePages([{ doc: src, pageIndex: 0, rotation }]);

  // 270 + 180 = 450 -> 90
  assert.equal(merged.getPage(0).getRotation().angle, 90);
});

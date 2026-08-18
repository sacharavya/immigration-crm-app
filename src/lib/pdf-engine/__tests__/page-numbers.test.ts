import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { formatPageNumber, stampPageNumbers } from "../ops/page-numbers";

test("formatPageNumber: all four formats", () => {
  assert.equal(formatPageNumber("n", 3, 12), "3");
  assert.equal(formatPageNumber("n-of-total", 3, 12), "3 of 12");
  assert.equal(formatPageNumber("page-n", 3, 12), "Page 3");
  assert.equal(formatPageNumber("page-n-of-total", 3, 12), "Page 3 of 12");
});

test("stampPageNumbers: 3-page doc stamps without throwing, embeds Helvetica", async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.addPage();
  doc.addPage();

  await stampPageNumbers(doc, {
    format: "page-n-of-total",
    position: "bottom-center",
    startAt: 1,
    fontSize: 10,
    marginPt: 24,
  });

  // Object streams would deflate the font dict and hide the literal name.
  const bytes = await doc.save({ useObjectStreams: false });
  assert.ok(Buffer.from(bytes).toString("latin1").includes("Helvetica"));
});

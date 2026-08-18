import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { loadSource } from "../ops/load";
import { applyMetadata } from "../ops/metadata";

// Smallest valid PNG: 1x1 pixel.
const ONE_BY_ONE_PNG = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

test("loadSource round-trips a pdf-lib document", async () => {
  const src = await PDFDocument.create();
  src.addPage();
  src.addPage();
  const bytes = await src.save();

  const loaded = await loadSource({ bytes, mime: "application/pdf" });
  assert.equal(loaded.kind, "pdf");
  assert.equal(loaded.pageCount, 2);
  assert.equal(loaded.doc.getPageCount(), 2);
});

test("loadSource rejects garbage bytes with a clear error", async () => {
  const garbage = new TextEncoder().encode("definitely not a pdf");
  await assert.rejects(
    loadSource({ bytes: garbage, mime: "application/pdf" }),
    (err: unknown) =>
      err instanceof Error && err.message.includes("Could not load PDF"),
  );
});

test("applyMetadata: title survives save and reload", async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  applyMetadata(doc, { title: "Visa Bundle", keywords: ["ircc", "bundle"] });

  const bytes = await doc.save();
  const reloaded = await PDFDocument.load(bytes);
  assert.equal(reloaded.getTitle(), "Visa Bundle");
});

test("applyMetadata: absent fields are not set", async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  applyMetadata(doc, {});

  const bytes = await doc.save();
  const reloaded = await PDFDocument.load(bytes);
  assert.equal(reloaded.getTitle(), undefined);
  assert.equal(reloaded.getAuthor(), undefined);
});

test("loadSource converts a PNG to a single-page pdf", async () => {
  const loaded = await loadSource({ bytes: ONE_BY_ONE_PNG, mime: "image/png" });
  assert.equal(loaded.kind, "image");
  assert.equal(loaded.pageCount, 1);
});

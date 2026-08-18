import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  analyzePage,
  compressionLadder,
  compressToTarget,
  type PageRasterizer,
} from "../ops/compress";
import type { CompressionRequest, PageId } from "../types";

const pid = (s: string) => s as PageId;

// Hardcoded valid 1x1 white JPEG (160 bytes).
const TINY_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkI" +
  "CQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
  "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const TINY_JPEG = Uint8Array.from(Buffer.from(TINY_JPEG_B64, "base64"));

class FakeRasterizer implements PageRasterizer {
  calls: Array<{ pageIndex: number; dpi: number; grayscale: boolean }> = [];
  async rasterize(args: {
    pdfBytes: Uint8Array;
    pageIndex: number;
    dpi: number;
    grayscale: boolean;
  }): Promise<{ jpeg: Uint8Array; widthPx: number; heightPx: number }> {
    this.calls.push({
      pageIndex: args.pageIndex,
      dpi: args.dpi,
      grayscale: args.grayscale,
    });
    return { jpeg: TINY_JPEG, widthPx: 1, heightPx: 1 };
  }
}

// Save + reload so analysis sees real encoded streams, as it will in prod.
async function roundTrip(doc: PDFDocument): Promise<PDFDocument> {
  return PDFDocument.load(await doc.save());
}

async function textOnlyDoc(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc
    .addPage([612, 792])
    .drawText("Skilled worker application", { x: 50, y: 700, size: 12, font });
  return roundTrip(doc);
}

async function imageOnlyDoc(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(TINY_JPEG);
  doc
    .addPage([612, 792])
    .drawImage(image, { x: 0, y: 0, width: 612, height: 792 });
  return roundTrip(doc);
}

// Page 0: text only. Page 1: image only.
async function mixedPagesDoc(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc
    .addPage([612, 792])
    .drawText("Skilled worker application", { x: 50, y: 700, size: 12, font });
  const image = await doc.embedJpg(TINY_JPEG);
  doc
    .addPage([612, 792])
    .drawImage(image, { x: 0, y: 0, width: 612, height: 792 });
  return roundTrip(doc);
}

const request = (
  targetBytes: number | null,
  allowGrayscale = false,
): CompressionRequest => ({ targetBytes, allowGrayscale });

test("analyzePage: drawText-only page is text-vector-dominant with selectable text", async () => {
  const doc = await textOnlyDoc();
  const analysis = await analyzePage(doc, 0);
  assert.equal(analysis.classification, "text-vector-dominant");
  assert.equal(analysis.hasSelectableText, true);
  assert.equal(analysis.hasFormFields, false);
});

test("analyzePage: full-page JPEG with no text is image-dominant", async () => {
  const doc = await imageOnlyDoc();
  const analysis = await analyzePage(doc, 0);
  assert.equal(analysis.classification, "image-dominant");
  assert.equal(analysis.hasSelectableText, false);
  assert.equal(analysis.hasFormFields, false);
});

test("compressionLadder: floor 150 default", () => {
  assert.deepEqual(compressionLadder(), [
    { dpi: 200, grayscale: false },
    { dpi: 150, grayscale: false },
  ]);
});

test("compressionLadder: floor 150 with grayscale appends the grayscale lever", () => {
  assert.deepEqual(compressionLadder(150, true), [
    { dpi: 200, grayscale: false },
    { dpi: 150, grayscale: false },
    { dpi: 150, grayscale: true },
  ]);
});

test("compressionLadder: floor 96 keeps every DPI step", () => {
  assert.deepEqual(compressionLadder(96, false), [
    { dpi: 200, grayscale: false },
    { dpi: 150, grayscale: false },
    { dpi: 120, grayscale: false },
    { dpi: 96, grayscale: false },
  ]);
});

test("compressToTarget: null target passes everything through untouched", async () => {
  const doc = await mixedPagesDoc();
  const rasterizer = new FakeRasterizer();
  const { doc: out, result } = await compressToTarget({
    doc,
    pageIds: [pid("p0"), pid("p1")],
    request: request(null),
    rasterizer,
  });
  assert.equal(out, doc);
  assert.equal(result.reachedTarget, true);
  assert.equal(result.pagesRecompressed, 0);
  assert.equal(result.pagesPassedThrough, 2);
  assert.ok(result.outputBytes > 0);
  assert.equal(result.achievableMinimumBytes, result.outputBytes);
  assert.deepEqual(result.warnings, []);
  assert.ok(result.perPage.every((p) => p.action === "passed-through"));
  assert.equal(rasterizer.calls.length, 0);
});

test("compressToTarget: absurdly low target recompresses the image page at the floor", async () => {
  const doc = await mixedPagesDoc();
  const rasterizer = new FakeRasterizer();
  const { result } = await compressToTarget({
    doc,
    pageIds: [pid("p0"), pid("p1")],
    request: request(10),
    rasterizer,
  });
  assert.equal(result.reachedTarget, false);
  assert.ok(result.achievableMinimumBytes > 0);
  assert.equal(result.pagesRecompressed, 1);
  assert.equal(result.pagesPassedThrough, 1);

  const [textPage, imagePage] = result.perPage;
  assert.equal(textPage.pageId, pid("p0"));
  assert.equal(textPage.action, "passed-through");
  assert.equal(imagePage.pageId, pid("p1"));
  assert.equal(imagePage.action, "recompressed");
  assert.equal(imagePage.appliedDpi, 150);
  assert.equal(imagePage.grayscale, false);

  assert.ok(result.warnings.length > 0);
  assert.match(result.warnings[0], /1 page/);
  assert.match(result.warnings[0], /150 DPI/);

  // Only the image page was ever rasterized, never below the floor.
  assert.deepEqual(
    rasterizer.calls.map((c) => c.dpi),
    [200, 150],
  );
  assert.ok(rasterizer.calls.every((c) => c.pageIndex === 1));
});

test("compressToTarget: grayscale is applied as the last lever when allowed", async () => {
  const doc = await mixedPagesDoc();
  const rasterizer = new FakeRasterizer();
  const { result } = await compressToTarget({
    doc,
    pageIds: [pid("p0"), pid("p1")],
    request: request(10, true),
    rasterizer,
  });
  assert.equal(result.reachedTarget, false);
  const imagePage = result.perPage[1];
  assert.equal(imagePage.action, "recompressed");
  assert.equal(imagePage.appliedDpi, 150);
  assert.equal(imagePage.grayscale, true);
  assert.deepEqual(
    rasterizer.calls.map((c) => [c.dpi, c.grayscale]),
    [
      [200, false],
      [150, false],
      [150, true],
    ],
  );
  assert.ok(result.warnings.length > 0);
});

test("compressToTarget: generous target returns untouched with zero recompressed", async () => {
  const doc = await mixedPagesDoc();
  const rasterizer = new FakeRasterizer();
  const { doc: out, result } = await compressToTarget({
    doc,
    pageIds: [pid("p0"), pid("p1")],
    request: request(10 * 1024 * 1024),
    rasterizer,
  });
  assert.equal(out, doc);
  assert.equal(result.reachedTarget, true);
  assert.equal(result.pagesRecompressed, 0);
  assert.equal(result.pagesPassedThrough, 2);
  assert.equal(rasterizer.calls.length, 0);
});

test("compressToTarget: text-only doc with missed target warns it cannot shrink", async () => {
  const doc = await textOnlyDoc();
  const rasterizer = new FakeRasterizer();
  const { result } = await compressToTarget({
    doc,
    pageIds: [pid("p0")],
    request: request(10),
    rasterizer,
  });
  assert.equal(result.reachedTarget, false);
  assert.equal(result.pagesRecompressed, 0);
  assert.match(result.warnings[0], /text-dominant/);
  assert.equal(rasterizer.calls.length, 0);
});

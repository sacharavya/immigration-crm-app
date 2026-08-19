import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import {
  analyzePage,
  compressToTarget,
  DPI_FLOOR,
  QUALITY_FLOOR,
  QUALITY_START,
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

// Valid JPEG padded to an exact byte size: pdf-lib only parses the marker
// header, so trailing zeros after the EOI marker are inert.
function paddedJpeg(size: number): Uint8Array {
  const out = new Uint8Array(Math.max(size, TINY_JPEG.length));
  out.set(TINY_JPEG);
  return out;
}

// Deterministic rasterizer: jpeg size = weight(page) * dpi * quality. Greedy
// page order, DPI stages, the binary search, and the floors are all
// observable through `calls` and through the sizes it hands back.
class FakeRasterizer implements PageRasterizer {
  calls: Array<{ pageIndex: number; dpi: number; quality: number }> = [];
  constructor(private readonly weights: Readonly<Record<number, number>>) {}
  async rasterize(args: {
    pdfBytes: Uint8Array;
    pageIndex: number;
    dpi: number;
    quality: number;
  }): Promise<{ jpeg: Uint8Array; widthPx: number; heightPx: number }> {
    this.calls.push({
      pageIndex: args.pageIndex,
      dpi: args.dpi,
      quality: args.quality,
    });
    const weight = this.weights[args.pageIndex] ?? 1;
    return {
      jpeg: paddedJpeg(Math.round(weight * args.dpi * args.quality)),
      widthPx: 1,
      heightPx: 1,
    };
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

async function imageOnlyDoc(jpegSize = 40_000): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(paddedJpeg(jpegSize));
  doc
    .addPage([612, 792])
    .drawImage(image, { x: 0, y: 0, width: 612, height: 792 });
  return roundTrip(doc);
}

// Page 0: text. Page 1: big scan (about 40 KB). Page 2: small scan (12 KB).
async function packageDoc(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc
    .addPage([612, 792])
    .drawText("Skilled worker application", { x: 50, y: 700, size: 12, font });
  const big = await doc.embedJpg(paddedJpeg(40_000));
  doc
    .addPage([612, 792])
    .drawImage(big, { x: 0, y: 0, width: 612, height: 792 });
  const small = await doc.embedJpg(paddedJpeg(12_000));
  doc
    .addPage([612, 792])
    .drawImage(small, { x: 0, y: 0, width: 612, height: 792 });
  return roundTrip(doc);
}

const request = (
  targetBytes: number | null,
  startDpi?: number,
): CompressionRequest => ({ targetBytes, startDpi });

const PKG_IDS = [pid("p0"), pid("p1"), pid("p2")];

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

test("compressToTarget: null target passes everything through untouched", async () => {
  const doc = await packageDoc();
  const rasterizer = new FakeRasterizer({});
  const { doc: out, result } = await compressToTarget({
    doc,
    pageIds: PKG_IDS,
    request: request(null),
    rasterizer,
  });
  assert.equal(out, doc);
  assert.equal(result.reachedTarget, true);
  assert.equal(result.suggestSplit, false);
  assert.equal(result.pagesRecompressed, 0);
  assert.equal(result.pagesPassedThrough, 3);
  assert.ok(result.outputBytes > 0);
  assert.equal(result.achievableMinimumBytes, result.outputBytes);
  assert.deepEqual(result.warnings, []);
  for (const p of result.perPage) {
    assert.equal(p.action, "passed-through");
    assert.ok(p.originalBytes > 0);
    assert.equal(p.finalBytes, p.originalBytes);
    assert.equal(p.appliedDpi, undefined);
    assert.equal(p.appliedQuality, undefined);
  }
  assert.equal(rasterizer.calls.length, 0);
});

test("compressToTarget: generous target returns untouched with zero recompressed", async () => {
  const doc = await packageDoc();
  const rasterizer = new FakeRasterizer({});
  const { doc: out, result } = await compressToTarget({
    doc,
    pageIds: PKG_IDS,
    request: request(10 * 1024 * 1024),
    rasterizer,
  });
  assert.equal(out, doc);
  assert.equal(result.reachedTarget, true);
  assert.equal(result.suggestSplit, false);
  assert.equal(result.pagesRecompressed, 0);
  assert.equal(rasterizer.calls.length, 0);
});

test("compressToTarget: steps the largest page first and stops the moment the target is met", async () => {
  const doc = await packageDoc();
  const originalSize = (await doc.save()).length;
  const rasterizer = new FakeRasterizer({ 1: 2, 2: 1 });
  const { result } = await compressToTarget({
    doc,
    pageIds: PKG_IDS,
    request: request(originalSize - 4_000),
    rasterizer,
  });
  // A single render: the largest page (index 1) at the start DPI already
  // met the target, so the smaller scan was never touched.
  assert.deepEqual(rasterizer.calls, [
    { pageIndex: 1, dpi: 200, quality: QUALITY_START },
  ]);
  assert.equal(result.reachedTarget, true);
  assert.equal(result.suggestSplit, false);
  assert.equal(result.pagesRecompressed, 1);
  assert.equal(result.pagesPassedThrough, 2);
  assert.ok(result.outputBytes <= originalSize - 4_000);

  const big = result.perPage[1];
  assert.equal(big.action, "recompressed");
  assert.equal(big.appliedDpi, 200);
  assert.equal(big.appliedQuality, QUALITY_START);
  assert.equal(big.finalBytes, 2 * 200 * QUALITY_START);
  assert.ok(big.originalBytes > big.finalBytes);

  // The other image page stayed a passthrough despite being a candidate.
  assert.equal(result.perPage[2].action, "passed-through");
  assert.equal(result.perPage[2].finalBytes, result.perPage[2].originalBytes);
});

test("compressToTarget: on miss, walks DPI 200 to 150 then binary-searches quality to the 55 floor, largest page first", async () => {
  const doc = await packageDoc();
  const rasterizer = new FakeRasterizer({ 1: 2, 2: 1 });
  const { result } = await compressToTarget({
    doc,
    pageIds: PKG_IDS,
    request: request(10),
    rasterizer,
  });

  // Binary search probes on [55, 84] when every probe misses: 69, 61, 57, 55.
  const probes = [69, 61, 57, 55];
  const perPageSequence = (pageIndex: number): Array<[number, number, number]> => [
    [pageIndex, 200, QUALITY_START],
    [pageIndex, DPI_FLOOR, QUALITY_START],
    ...probes.map((q): [number, number, number] => [pageIndex, DPI_FLOOR, q]),
  ];
  assert.deepEqual(
    rasterizer.calls.map((c): [number, number, number] => [
      c.pageIndex,
      c.dpi,
      c.quality,
    ]),
    [...perPageSequence(1), ...perPageSequence(2)],
  );

  // Floors are never crossed; 120/96 DPI steps are gone.
  assert.ok(
    rasterizer.calls.every(
      (c) =>
        c.dpi >= DPI_FLOOR &&
        c.quality >= QUALITY_FLOOR &&
        c.quality <= QUALITY_START,
    ),
  );

  assert.equal(result.reachedTarget, false);
  assert.equal(result.suggestSplit, true);
  assert.ok(result.warnings.some((w) => /split/i.test(w)));
  assert.equal(result.outputBytes, result.achievableMinimumBytes);
  assert.equal(result.pagesRecompressed, 2);
  assert.equal(result.pagesPassedThrough, 1);
  assert.equal(result.perPage[0].action, "passed-through");
  for (const i of [1, 2]) {
    assert.equal(result.perPage[i].action, "recompressed");
    assert.equal(result.perPage[i].appliedDpi, DPI_FLOOR);
    assert.equal(result.perPage[i].appliedQuality, QUALITY_FLOOR);
  }
  assert.equal(result.perPage[1].finalBytes, 2 * DPI_FLOOR * QUALITY_FLOOR);
  assert.equal(result.perPage[2].finalBytes, 1 * DPI_FLOOR * QUALITY_FLOOR);
});

test("compressToTarget: binary search lands on a quality within [55, 85) that meets the target", async () => {
  const doc = await imageOnlyDoc();
  const rasterizer = new FakeRasterizer({ 0: 2 });
  // Only reachable in the quality stage: below the floor DPI at quality 85
  // (2 * 150 * 85 = 25,500 plus overhead), above the quality floor
  // (2 * 150 * 55 = 16,500).
  const target = 22_000;
  const { result } = await compressToTarget({
    doc,
    pageIds: [pid("p0")],
    request: request(target),
    rasterizer,
  });
  assert.equal(result.reachedTarget, true);
  assert.equal(result.suggestSplit, false);
  assert.ok(result.outputBytes <= target);

  const page = result.perPage[0];
  assert.equal(page.action, "recompressed");
  assert.equal(page.appliedDpi, DPI_FLOOR);
  const q = page.appliedQuality;
  assert.ok(q !== undefined && q >= QUALITY_FLOOR && q < QUALITY_START);
  assert.equal(page.finalBytes, 2 * DPI_FLOOR * q);

  // Binary search, not a linear walk: first probe is the midpoint of
  // [55, 84] and at most 5 probes cover the whole range.
  const qualityProbes = rasterizer.calls.filter(
    (c) => c.quality !== QUALITY_START,
  );
  assert.equal(qualityProbes[0].quality, 69);
  assert.ok(qualityProbes.length >= 1 && qualityProbes.length <= 5);
});

test("compressToTarget: startDpi is configurable and clamps to the 150 floor", async () => {
  const highStart = new FakeRasterizer({ 0: 1 });
  await compressToTarget({
    doc: await imageOnlyDoc(),
    pageIds: [pid("p0")],
    request: request(10, 300),
    rasterizer: highStart,
  });
  assert.deepEqual(
    highStart.calls.slice(0, 2).map((c) => c.dpi),
    [300, DPI_FLOOR],
  );
  assert.ok(highStart.calls.every((c) => c.dpi >= DPI_FLOOR));

  // A startDpi below the floor collapses to a single stage at the floor.
  const lowStart = new FakeRasterizer({ 0: 1 });
  await compressToTarget({
    doc: await imageOnlyDoc(),
    pageIds: [pid("p0")],
    request: request(10, 96),
    rasterizer: lowStart,
  });
  assert.equal(lowStart.calls[0].dpi, DPI_FLOOR);
  assert.ok(lowStart.calls.every((c) => c.dpi === DPI_FLOOR));
});

test("compressToTarget: renders that inflate the document are reverted, never kept", async () => {
  // A 10 KB source scan whose every re-render is LARGER (weight 2: even the
  // both-floors render is 2 * 150 * 55 = 16,500 bytes). Realistic stand-in
  // for low-DPI or bilevel CCITT sources that inflate as JPEG.
  const doc = await imageOnlyDoc(10_000);
  const originalSize = (await doc.save()).length;
  const rasterizer = new FakeRasterizer({ 0: 2 });
  const { doc: out, result } = await compressToTarget({
    doc,
    pageIds: [pid("p0")],
    request: request(9_000),
    rasterizer,
  });

  // Every stage was tried, and every one was rolled back.
  assert.ok(rasterizer.calls.length > 0);
  assert.equal(out, doc);
  assert.equal(result.reachedTarget, false);
  assert.equal(result.suggestSplit, true);
  // Output never exceeds the input, and the reported achievable minimum is
  // the passthrough size, not an inflated one.
  assert.equal(result.outputBytes, originalSize);
  assert.equal(result.achievableMinimumBytes, originalSize);
  assert.equal(result.pagesRecompressed, 0);
  assert.equal(result.pagesPassedThrough, 1);
  assert.equal(result.perPage[0].action, "passed-through");
  assert.equal(result.perPage[0].finalBytes, result.perPage[0].originalBytes);
});

test("compressToTarget: rotated page is rebuilt with swapped dims and rotation baked in", async () => {
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(paddedJpeg(40_000));
  const page = doc.addPage([612, 792]);
  page.drawImage(image, { x: 0, y: 0, width: 612, height: 792 });
  page.setRotation(degrees(90));
  const rotated = await roundTrip(doc);

  const rasterizer = new FakeRasterizer({ 0: 1 });
  const { doc: out, result } = await compressToTarget({
    doc: rotated,
    pageIds: [pid("p0")],
    request: request(30_000),
    rasterizer,
  });
  assert.equal(result.perPage[0].action, "recompressed");

  // The raster was rendered with /Rotate applied (landscape), so the rebuilt
  // page must be landscape too, with the rotation baked in rather than kept.
  const rebuilt = out.getPage(0);
  assert.deepEqual(rebuilt.getSize(), { width: 792, height: 612 });
  assert.equal(rebuilt.getRotation().angle, 0);
});

test("compressToTarget: text-only doc with missed target warns and suggests splitting", async () => {
  const doc = await textOnlyDoc();
  const rasterizer = new FakeRasterizer({});
  const { result } = await compressToTarget({
    doc,
    pageIds: [pid("p0")],
    request: request(10),
    rasterizer,
  });
  assert.equal(result.reachedTarget, false);
  assert.equal(result.suggestSplit, true);
  assert.equal(result.pagesRecompressed, 0);
  assert.ok(result.warnings.some((w) => /text-dominant/.test(w)));
  assert.ok(result.warnings.some((w) => /split/i.test(w)));
  assert.equal(rasterizer.calls.length, 0);
});

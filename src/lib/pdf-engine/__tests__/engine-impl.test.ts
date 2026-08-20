import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { PdfEngineImpl, type EngineRenderer } from "../engine-impl";
import type {
  DocumentInput,
  PageId,
  ProgressEvent,
  Rotation,
  Thumbnail,
} from "../types";

// ---------------------------------------------------------------------------
// Fixtures + fakes. The fake renderer returns hardcoded 1x1 images so no
// Worker/OffscreenCanvas/WASM path is ever touched in Node.
// ---------------------------------------------------------------------------

const JPEG_1PX = new Uint8Array(
  Buffer.from(
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==",
    "base64",
  ),
);
const PNG_1PX = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

interface RenderCall {
  kind: "png" | "jpeg";
  bytes: Uint8Array;
  pageIndex: number;
  rotation?: Rotation;
}

function makeFakeRenderer(): { renderer: EngineRenderer; calls: RenderCall[] } {
  const calls: RenderCall[] = [];
  const renderer: EngineRenderer = {
    async renderPng(bytes, pageIndex, _maxEdgePx, rotation) {
      calls.push({ kind: "png", bytes, pageIndex, rotation });
      return { width: 1, height: 1, data: PNG_1PX };
    },
    async renderJpeg(bytes, pageIndex) {
      calls.push({ kind: "jpeg", bytes, pageIndex });
      return { width: 1, height: 1, data: JPEG_1PX };
    },
  };
  return { renderer, calls };
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

/** Two blank pages: classified text-vector-dominant, never rasterized. */
async function makeBlankPdf(): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 300]);
  doc.addPage([200, 300]);
  return toArrayBuffer(await doc.save());
}

/**
 * One page that is just an image: classified image-dominant. Big enough
 * (5 KB) that the fake renderer's tiny JPEG always SHRINKS the document,
 * so recompression keeps its renders instead of reverting them.
 */
async function makeImagePdf(): Promise<ArrayBuffer> {
  return makeJpegPdf(5_000);
}

/** Valid JPEG padded to a target byte size; padding after EOI is inert. */
function paddedJpeg(size: number): Uint8Array {
  const out = new Uint8Array(Math.max(size, JPEG_1PX.length));
  out.set(JPEG_1PX);
  return out;
}

/** One image-dominant page whose byte contribution is roughly `size`. */
async function makeJpegPdf(size: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const jpg = await doc.embedJpg(paddedJpeg(size));
  doc.addPage([100, 100]).drawImage(jpg, { x: 0, y: 0, width: 100, height: 100 });
  return toArrayBuffer(await doc.save());
}

function makeInputs(a: ArrayBuffer, b: ArrayBuffer): DocumentInput[] {
  return [
    { name: "blank.pdf", mime: "application/pdf", bytes: a },
    { name: "scan.pdf", mime: "application/pdf", bytes: b },
  ];
}

async function loadedEngine() {
  const { renderer, calls } = makeFakeRenderer();
  const engine = new PdfEngineImpl(renderer);
  const a = await makeBlankPdf();
  const b = await makeImagePdf();
  const sizes = { a: a.byteLength, b: b.byteLength };
  const { documents, model } = await engine.loadDocuments(makeInputs(a, b));
  return { engine, calls, documents, model, sizes };
}

// ---------------------------------------------------------------------------
// loadDocuments
// ---------------------------------------------------------------------------

test("loadDocuments: model shape, totalSourceBytes, document metadata", async () => {
  const { documents, model, sizes } = await loadedEngine();

  assert.equal(documents.length, 2);
  assert.deepEqual(
    documents.map((d) => [d.name, d.kind, d.pageCount, d.sizeBytes]),
    [
      ["blank.pdf", "pdf", 2, sizes.a],
      ["scan.pdf", "pdf", 1, sizes.b],
    ],
  );

  assert.equal(model.pages.length, 3);
  assert.equal(model.totalSourceBytes, sizes.a + sizes.b);
  assert.deepEqual(
    model.pages.map((p) => [p.documentId, p.sourcePageIndex, p.rotation]),
    [
      [documents[0].id, 0, 0],
      [documents[0].id, 1, 0],
      [documents[1].id, 0, 0],
    ],
  );
  // Page ids are unique.
  assert.equal(new Set(model.pages.map((p) => p.id)).size, 3);
});

test("loadDocuments: reports loading progress per document", async () => {
  const { renderer } = makeFakeRenderer();
  const engine = new PdfEngineImpl(renderer);
  const events: ProgressEvent[] = [];
  await engine.loadDocuments(
    makeInputs(await makeBlankPdf(), await makeImagePdf()),
    (e) => events.push(e),
  );
  assert.deepEqual(
    events.map((e) => [e.phase, e.completed, e.total, e.note]),
    [
      ["loading", 1, 2, "blank.pdf"],
      ["loading", 2, 2, "scan.pdf"],
    ],
  );
});

test("loadDocuments: a bad input becomes a session warning, not an error", async () => {
  const { renderer } = makeFakeRenderer();
  const engine = new PdfEngineImpl(renderer);
  const garbage = toArrayBuffer(new TextEncoder().encode("not a pdf"));
  const { documents, model } = await engine.loadDocuments([
    { name: "good.pdf", mime: "application/pdf", bytes: await makeBlankPdf() },
    { name: "broken.pdf", mime: "application/pdf", bytes: garbage },
  ]);
  assert.equal(documents.length, 1);
  assert.equal(model.pages.length, 2);

  const result = await engine.build({});
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /broken\.pdf/);
});

test("loadDocuments: throws when every input fails", async () => {
  const { renderer } = makeFakeRenderer();
  const engine = new PdfEngineImpl(renderer);
  const garbage = toArrayBuffer(new TextEncoder().encode("nope"));
  await assert.rejects(
    engine.loadDocuments([
      { name: "bad.pdf", mime: "application/pdf", bytes: garbage },
    ]),
    /bad\.pdf/,
  );
});

// ---------------------------------------------------------------------------
// Model transforms
// ---------------------------------------------------------------------------

test("reorder, rotate, delete flow", async () => {
  const { engine, model } = await loadedEngine();
  const [p0, p1, p2] = model.pages.map((p) => p.id);

  const reordered = await engine.reorder([p2, p0, p1]);
  assert.deepEqual(
    reordered.pages.map((p) => p.id),
    [p2, p0, p1],
  );

  const rotated = await engine.rotate(p0, 90);
  assert.equal(rotated.pages.find((p) => p.id === p0)?.rotation, 90);

  const afterDelete = await engine.deletePages([p1]);
  assert.deepEqual(
    afterDelete.pages.map((p) => p.id),
    [p2, p0],
  );
});

test("deletePages: non-evicting, applyModel can restore the deleted pages", async () => {
  const { engine, model, documents } = await loadedEngine();
  const blankPages = model.pages
    .filter((p) => p.documentId === documents[0].id)
    .map((p) => p.id);

  // Structural peek at private state; tests only.
  const docs = (engine as unknown as { docs: Map<string, unknown> }).docs;
  assert.equal(docs.size, 2);

  const after = await engine.deletePages(blankPages);
  assert.equal(after.pages.length, 1);
  // Documents stay held until reset() so undo can bring pages back.
  assert.equal(docs.size, 2);
  assert.equal(after.totalSourceBytes, model.totalSourceBytes);

  // The surviving page still renders from its own source document.
  const thumb: Thumbnail = await engine.renderThumbnail(after.pages[0].id, 64);
  assert.equal(thumb.pageId, after.pages[0].id);
  assert.deepEqual(thumb.png, PNG_1PX);

  // Undo: restore the pre-delete snapshot wholesale.
  const restored = await engine.applyModel(model.pages);
  assert.equal(restored.pages.length, model.pages.length);
  const restoredThumb = await engine.renderThumbnail(model.pages[0].id, 64);
  assert.equal(restoredThumb.pageId, model.pages[0].id);
});

test("applyModel: validates refs and does not mutate on failure", async () => {
  const { engine, model } = await loadedEngine();

  // Unknown document.
  await assert.rejects(
    engine.applyModel([
      { ...model.pages[0], documentId: "ghost" as never },
    ]),
    /unknown document/,
  );
  // Out-of-range page index.
  await assert.rejects(
    engine.applyModel([{ ...model.pages[0], sourcePageIndex: 99 }]),
    /out of range/,
  );
  // Duplicate page id.
  await assert.rejects(
    engine.applyModel([model.pages[0], model.pages[0]]),
    /duplicate page id/,
  );
  // Failed calls left the model untouched.
  const current = await engine.getModel();
  assert.equal(current.pages.length, model.pages.length);

  // Subset + reorder + rotation change applies cleanly (split scenario).
  const subset = [{ ...model.pages[1], rotation: 90 as const }];
  const applied = await engine.applyModel(subset);
  assert.equal(applied.pages.length, 1);
  assert.equal(applied.pages[0].rotation, 90);
});

test("renderThumbnail: unknown page id throws", async () => {
  const { engine } = await loadedEngine();
  await assert.rejects(
    engine.renderThumbnail("nope" as PageId, 64),
    /Unknown page id/,
  );
});

test("renderThumbnail: rasterizes the owning document at the source index", async () => {
  const { engine, calls, model, documents, sizes } = await loadedEngine();
  const secondOfBlank = model.pages.find(
    (p) => p.documentId === documents[0].id && p.sourcePageIndex === 1,
  );
  assert.ok(secondOfBlank);
  await engine.renderThumbnail(secondOfBlank.id, 64);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].kind, "png");
  assert.equal(calls[0].pageIndex, 1);
  assert.equal(calls[0].bytes.length, sizes.a);
});

test("getModel: returned model is isolated from engine state", async () => {
  const { engine } = await loadedEngine();
  const copy = await engine.getModel();
  copy.pages.pop();
  copy.pages[0].rotation = 180;
  copy.totalSourceBytes = 0;

  const fresh = await engine.getModel();
  assert.equal(fresh.pages.length, 3);
  assert.equal(fresh.pages[0].rotation, 0);
  assert.notEqual(fresh.totalSourceBytes, 0);
});

// ---------------------------------------------------------------------------
// preflight + build
// ---------------------------------------------------------------------------

test("preflightCompression: counts image-dominant pages and estimates size", async () => {
  const { engine, sizes } = await loadedEngine();
  const preflight = await engine.preflightCompression({
    compression: { targetBytes: 1 },
  });
  assert.equal(preflight.pagesToRecompress, 1);
  assert.equal(preflight.pagesToPassThrough, 2);
  assert.deepEqual(preflight.pagesWithSelectableText, []);
  assert.deepEqual(preflight.pagesWithFormFields, []);
  assert.equal(preflight.estimatedOutputBytes, sizes.a + sizes.b);
});

test("preflightCompression: no target means nothing gets recompressed", async () => {
  const { engine } = await loadedEngine();
  const preflight = await engine.preflightCompression({});
  assert.equal(preflight.pagesToRecompress, 0);
  assert.equal(preflight.pagesToPassThrough, 3);
});

test("build without compression: holds a loadable merged PDF, returns a report", async () => {
  const { engine, calls } = await loadedEngine();
  const events: ProgressEvent[] = [];
  const report = await engine.build(
    { metadata: { title: "Bundle" } },
    (e) => events.push(e),
  );

  assert.equal(report.compression, null);
  assert.deepEqual(report.worstPages, []);
  assert.deepEqual(report.warnings, []);
  assert.ok(report.outputSize > 0);
  // The report never carries the bytes; they stay held in the session.
  assert.ok(!("bytes" in report));
  assert.equal(calls.length, 0);

  const { bytes, sizeBytes } = await engine.takeOutput();
  assert.equal(sizeBytes, report.outputSize);
  assert.equal(bytes.length, sizeBytes);
  const merged = await PDFDocument.load(bytes);
  assert.equal(merged.getPageCount(), 3);
  assert.equal(merged.getTitle(), "Bundle");

  const phases = new Set(events.map((e) => e.phase));
  assert.ok(phases.has("merging"));
  assert.ok(phases.has("finalizing"));
});

test("build with an impossible target: reachedTarget false, floors applied, suggestSplit", async () => {
  const { engine, calls, model, documents } = await loadedEngine();
  const report = await engine.build({
    compression: { targetBytes: 10 },
  });

  const compression = report.compression;
  assert.ok(compression);
  assert.equal(compression.reachedTarget, false);
  assert.equal(compression.suggestSplit, true);
  assert.ok(compression.warnings.some((w) => /split/i.test(w)));
  assert.equal(compression.pagesRecompressed, 1);
  assert.equal(compression.pagesPassedThrough, 2);
  assert.equal(compression.perPage.length, 3);

  const imagePageId = model.pages.find(
    (p) => p.documentId === documents[1].id,
  )?.id;
  assert.ok(imagePageId);
  assert.deepEqual(report.worstPages, [imagePageId]);

  const byId = new Map(compression.perPage.map((p) => [p.pageId, p]));
  for (const page of model.pages) {
    const outcome = byId.get(page.id);
    assert.ok(outcome);
    assert.ok(outcome.originalBytes > 0);
    if (page.documentId === documents[1].id) {
      assert.equal(outcome.action, "recompressed");
      assert.equal(outcome.classification, "image-dominant");
      // Exhausted at both hard floors.
      assert.equal(outcome.appliedDpi, 150);
      assert.equal(outcome.appliedQuality, 55);
      assert.equal(outcome.finalBytes, JPEG_1PX.length);
    } else {
      assert.equal(outcome.action, "passed-through");
      assert.equal(outcome.finalBytes, outcome.originalBytes);
      assert.equal(outcome.appliedDpi, undefined);
      assert.equal(outcome.appliedQuality, undefined);
    }
  }

  // The fake rasterizer was actually exercised for the image page.
  assert.ok(calls.some((c) => c.kind === "jpeg"));
  assert.equal(compression.outputBytes, compression.achievableMinimumBytes);

  const { bytes } = await engine.takeOutput();
  const merged = await PDFDocument.load(bytes);
  assert.equal(merged.getPageCount(), 3);
});

test("worstPages: equal quality and DPI fall back to largest byte reduction first", async () => {
  const { renderer } = makeFakeRenderer();
  const engine = new PdfEngineImpl(renderer);
  const { model } = await engine.loadDocuments([
    { name: "small.pdf", mime: "application/pdf", bytes: await makeJpegPdf(5_000) },
    { name: "big.pdf", mime: "application/pdf", bytes: await makeJpegPdf(50_000) },
  ]);
  const report = await engine.build({ compression: { targetBytes: 10 } });
  assert.ok(report.compression);
  assert.equal(report.compression.pagesRecompressed, 2);
  // Both pages end at (150, 55) with identical finalBytes (the constant fake
  // jpeg), so the bigger page shed more bytes and ranks worst.
  assert.deepEqual(report.worstPages, [model.pages[1].id, model.pages[0].id]);
});

// ---------------------------------------------------------------------------
// Verification gate: renderComparison / takeOutput / discardOutput
// ---------------------------------------------------------------------------

test("renderComparison: throws before any build is held", async () => {
  const { engine, model } = await loadedEngine();
  await assert.rejects(
    engine.renderComparison(model.pages[0].id, 64),
    /build/i,
  );
});

test("build holds output; renderComparison renders source and built page; takeOutput transfers once", async () => {
  const { engine, calls, model, documents, sizes } = await loadedEngine();
  const imagePage = model.pages.find((p) => p.documentId === documents[1].id);
  assert.ok(imagePage);
  const report = await engine.build({ compression: { targetBytes: 10 } });

  const pair = await engine.renderComparison(imagePage.id, 128);
  assert.equal(pair.pageId, imagePage.id);
  assert.equal(pair.appliedDpi, 150);
  assert.equal(pair.appliedQuality, 55);
  assert.deepEqual(pair.original.png, PNG_1PX);
  assert.deepEqual(pair.compressed.png, PNG_1PX);

  // Source render comes from the source document; the compressed render
  // comes from the held build, at the page's position in the built output.
  const pngCalls = calls.filter((c) => c.kind === "png");
  assert.equal(pngCalls.length, 2);
  assert.equal(pngCalls[0].bytes.length, sizes.b);
  assert.equal(pngCalls[0].pageIndex, 0);
  assert.equal(pngCalls[1].bytes.length, report.outputSize);
  assert.equal(pngCalls[1].pageIndex, 2);

  // A passed-through page compares too, with no applied settings.
  const blankPair = await engine.renderComparison(model.pages[0].id, 128);
  assert.equal(blankPair.appliedDpi, null);
  assert.equal(blankPair.appliedQuality, null);

  const { bytes, sizeBytes } = await engine.takeOutput();
  assert.equal(sizeBytes, report.outputSize);
  assert.equal(bytes.length, sizeBytes);

  // Taking clears the held build: both gates are shut afterwards.
  await assert.rejects(engine.takeOutput(), /build/i);
  await assert.rejects(engine.renderComparison(imagePage.id, 64), /build/i);
});

test("renderComparison: original render carries the user rotation baked into the build", async () => {
  const { engine, calls, model, documents } = await loadedEngine();
  const imagePage = model.pages.find((p) => p.documentId === documents[1].id);
  assert.ok(imagePage);
  await engine.rotate(imagePage.id, 90);
  await engine.build({});
  calls.length = 0;

  await engine.renderComparison(imagePage.id, 64);
  const pngCalls = calls.filter((c) => c.kind === "png");
  assert.equal(pngCalls.length, 2);
  // Source render gets the snapshotted rotation; the built page already
  // carries it in its /Rotate, so that render gets none.
  assert.equal(pngCalls[0].rotation, 90);
  assert.equal(pngCalls[1].rotation, undefined);

  // The snapshot survives later model mutations.
  await engine.rotate(imagePage.id, 180);
  calls.length = 0;
  await engine.renderComparison(imagePage.id, 64);
  assert.equal(calls.filter((c) => c.kind === "png")[0].rotation, 90);
});

test("discardOutput: clears the held build without returning it", async () => {
  const { engine } = await loadedEngine();
  await engine.build({});
  await engine.discardOutput();
  await assert.rejects(engine.takeOutput(), /build/i);
});

test("reset: empties model, documents, warnings, and any held build", async () => {
  const { engine } = await loadedEngine();
  await engine.build({});
  await engine.reset();
  const model = await engine.getModel();
  assert.deepEqual(model, { pages: [], totalSourceBytes: 0 });
  const docs = (engine as unknown as { docs: Map<string, unknown> }).docs;
  assert.equal(docs.size, 0);
  await assert.rejects(engine.takeOutput(), /build/i);
});

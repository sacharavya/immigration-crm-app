import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { PdfEngineImpl, type EngineRenderer } from "../engine-impl";
import type {
  DocumentInput,
  PageId,
  ProgressEvent,
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
}

function makeFakeRenderer(): { renderer: EngineRenderer; calls: RenderCall[] } {
  const calls: RenderCall[] = [];
  const renderer: EngineRenderer = {
    async renderPng(bytes, pageIndex) {
      calls.push({ kind: "png", bytes, pageIndex });
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

/** One page that is just an image: classified image-dominant. */
async function makeImagePdf(): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const png = await doc.embedPng(PNG_1PX);
  doc.addPage([100, 100]).drawImage(png, { x: 0, y: 0, width: 100, height: 100 });
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

test("deletePages: evicts a document once all of its pages are gone", async () => {
  const { engine, model, documents } = await loadedEngine();
  const blankPages = model.pages
    .filter((p) => p.documentId === documents[0].id)
    .map((p) => p.id);

  // Structural peek at private state; tests only.
  const docs = (engine as unknown as { docs: Map<string, unknown> }).docs;
  assert.equal(docs.size, 2);

  const after = await engine.deletePages(blankPages);
  assert.equal(after.pages.length, 1);
  assert.equal(docs.size, 1);

  // The surviving page still renders from its own source document.
  const thumb: Thumbnail = await engine.renderThumbnail(after.pages[0].id, 64);
  assert.equal(thumb.pageId, after.pages[0].id);
  assert.deepEqual(thumb.png, PNG_1PX);
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

test("build without compression: loadable merged PDF with correct page count", async () => {
  const { engine, calls } = await loadedEngine();
  const events: ProgressEvent[] = [];
  const result = await engine.build(
    { metadata: { title: "Bundle" } },
    (e) => events.push(e),
  );

  assert.equal(result.compression, null);
  assert.equal(result.outputSize, result.bytes.length);
  assert.deepEqual(result.warnings, []);
  assert.equal(calls.length, 0);

  const merged = await PDFDocument.load(result.bytes);
  assert.equal(merged.getPageCount(), 3);
  assert.equal(merged.getTitle(), "Bundle");

  const phases = new Set(events.map((e) => e.phase));
  assert.ok(phases.has("merging"));
  assert.ok(phases.has("finalizing"));
});

test("build with an impossible target: reachedTarget false, per-page outcomes", async () => {
  const { engine, calls, model, documents } = await loadedEngine();
  const result = await engine.build({
    compression: { targetBytes: 10 },
  });

  const compression = result.compression;
  assert.ok(compression);
  assert.equal(compression.reachedTarget, false);
  assert.equal(compression.pagesRecompressed, 1);
  assert.equal(compression.pagesPassedThrough, 2);
  assert.equal(compression.perPage.length, 3);

  const byId = new Map(compression.perPage.map((p) => [p.pageId, p]));
  for (const page of model.pages) {
    const outcome = byId.get(page.id);
    assert.ok(outcome);
    if (page.documentId === documents[1].id) {
      assert.equal(outcome.action, "recompressed");
      assert.equal(outcome.classification, "image-dominant");
    } else {
      assert.equal(outcome.action, "passed-through");
    }
  }

  // The fake rasterizer was actually exercised for the image page.
  assert.ok(calls.some((c) => c.kind === "jpeg"));
  assert.equal(compression.outputBytes, compression.achievableMinimumBytes);

  const merged = await PDFDocument.load(result.bytes);
  assert.equal(merged.getPageCount(), 3);
});

test("reset: empties model, documents, and warnings", async () => {
  const { engine } = await loadedEngine();
  await engine.reset();
  const model = await engine.getModel();
  assert.deepEqual(model, { pages: [], totalSourceBytes: 0 });
  const docs = (engine as unknown as { docs: Map<string, unknown> }).docs;
  assert.equal(docs.size, 0);
});

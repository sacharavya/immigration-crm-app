import { test } from "node:test";
import assert from "node:assert/strict";
import type { DocumentId, PageId, PageModel, PageRef } from "../types";
import { reorderModel } from "../ops/reorder";
import { rotateInModel } from "../ops/rotate";
import { deleteFromModel } from "../ops/delete-pages";

// Branded ids fabricated for tests only.
const pid = (s: string) => s as PageId;
const did = (s: string) => s as DocumentId;

function makeModel(): PageModel {
  const pages: PageRef[] = [
    { id: pid("a"), documentId: did("d1"), sourcePageIndex: 0, rotation: 0 },
    { id: pid("b"), documentId: did("d1"), sourcePageIndex: 1, rotation: 90 },
    { id: pid("c"), documentId: did("d2"), sourcePageIndex: 0, rotation: 0 },
  ];
  return { pages, totalSourceBytes: 1234 };
}

// ---------------------------------------------------------------------------
// reorderModel
// ---------------------------------------------------------------------------

test("reorderModel: reorders pages to the given order", () => {
  const model = makeModel();
  const snapshot = structuredClone(model);

  const result = reorderModel(model, [pid("c"), pid("a"), pid("b")]);

  assert.deepEqual(
    result.pages.map((p) => p.id),
    ["c", "a", "b"],
  );
  assert.equal(result.totalSourceBytes, 1234);
  assert.notEqual(result, model);
  assert.notEqual(result.pages, model.pages);
  assert.deepEqual(model, snapshot);
});

test("reorderModel: identity order returns an equal but fresh model", () => {
  const model = makeModel();
  const snapshot = structuredClone(model);

  const result = reorderModel(model, [pid("a"), pid("b"), pid("c")]);

  assert.deepEqual(result, model);
  assert.notEqual(result.pages, model.pages);
  assert.deepEqual(model, snapshot);
});

test("reorderModel: throws when ids are missing (too few)", () => {
  const model = makeModel();
  const snapshot = structuredClone(model);

  assert.throws(
    () => reorderModel(model, [pid("a"), pid("b")]),
    /expected exactly 3 page ids, got 2/,
  );
  assert.deepEqual(model, snapshot);
});

test("reorderModel: throws on extra ids (too many)", () => {
  const model = makeModel();
  assert.throws(
    () => reorderModel(model, [pid("a"), pid("b"), pid("c"), pid("x")]),
    /expected exactly 3 page ids, got 4/,
  );
});

test("reorderModel: throws on duplicate id", () => {
  const model = makeModel();
  assert.throws(
    () => reorderModel(model, [pid("a"), pid("a"), pid("b")]),
    /duplicate page id "a"/,
  );
});

test("reorderModel: throws on unknown id", () => {
  const model = makeModel();
  assert.throws(
    () => reorderModel(model, [pid("a"), pid("b"), pid("x")]),
    /unknown page id "x"/,
  );
});

// ---------------------------------------------------------------------------
// rotateInModel
// ---------------------------------------------------------------------------

test("rotateInModel: sets absolute rotation for the target page", () => {
  const model = makeModel();
  const snapshot = structuredClone(model);

  const result = rotateInModel(model, pid("b"), 270);

  assert.equal(result.pages[1]?.rotation, 270);
  assert.equal(result.pages[0]?.rotation, 0);
  assert.equal(result.pages[2]?.rotation, 0);
  assert.equal(result.totalSourceBytes, 1234);
  assert.notEqual(result.pages, model.pages);
  // Absolute, not additive: rotating again to 0 lands on 0.
  const back = rotateInModel(result, pid("b"), 0);
  assert.equal(back.pages[1]?.rotation, 0);
  assert.deepEqual(model, snapshot);
});

test("rotateInModel: copies only the changed PageRef", () => {
  const model = makeModel();
  const result = rotateInModel(model, pid("b"), 180);

  assert.notEqual(result.pages[1], model.pages[1]);
  assert.equal(result.pages[0], model.pages[0]);
  assert.equal(result.pages[2], model.pages[2]);
});

test("rotateInModel: throws on unknown page id", () => {
  const model = makeModel();
  const snapshot = structuredClone(model);

  assert.throws(
    () => rotateInModel(model, pid("nope"), 90),
    /unknown page id "nope"/,
  );
  assert.deepEqual(model, snapshot);
});

// ---------------------------------------------------------------------------
// deleteFromModel
// ---------------------------------------------------------------------------

test("deleteFromModel: removes the given pages, keeps order", () => {
  const model = makeModel();
  const snapshot = structuredClone(model);

  const result = deleteFromModel(model, [pid("b")]);

  assert.deepEqual(
    result.pages.map((p) => p.id),
    ["a", "c"],
  );
  assert.equal(result.totalSourceBytes, 1234);
  assert.notEqual(result.pages, model.pages);
  assert.deepEqual(model, snapshot);
});

test("deleteFromModel: deleting all pages yields an empty model", () => {
  const model = makeModel();
  const snapshot = structuredClone(model);

  const result = deleteFromModel(model, [pid("a"), pid("b"), pid("c")]);

  assert.deepEqual(result.pages, []);
  assert.equal(result.totalSourceBytes, 1234);
  assert.deepEqual(model, snapshot);
});

test("deleteFromModel: deleting nothing returns an equal but fresh model", () => {
  const model = makeModel();
  const result = deleteFromModel(model, []);

  assert.deepEqual(result, model);
  assert.notEqual(result.pages, model.pages);
});

test("deleteFromModel: throws on unknown id", () => {
  const model = makeModel();
  const snapshot = structuredClone(model);

  assert.throws(
    () => deleteFromModel(model, [pid("x")]),
    /unknown page id "x"/,
  );
  assert.deepEqual(model, snapshot);
});

test("deleteFromModel: throws when any id in the batch is unknown", () => {
  const model = makeModel();
  const snapshot = structuredClone(model);

  assert.throws(
    () => deleteFromModel(model, [pid("a"), pid("x")]),
    /unknown page id "x"/,
  );
  // Nothing was deleted before the throw.
  assert.deepEqual(model, snapshot);
});

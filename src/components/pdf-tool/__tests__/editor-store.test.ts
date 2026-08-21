import { test } from "node:test";
import assert from "node:assert/strict";

import type { PageId, PageModel } from "@/lib/pdf-engine/types";

import {
  editorReducer,
  HISTORY_CAP,
  initialEditorState,
  ZOOM_MAX,
  ZOOM_MIN,
  type EditorState,
} from "../editor/editor-store";

const pid = (s: string): PageId => s as PageId;

function mkModel(tag: string): PageModel {
  return {
    pages: [
      {
        id: pid(`${tag}-p1`),
        documentId: `${tag}-doc` as PageModel["pages"][number]["documentId"],
        sourcePageIndex: 0,
        rotation: 0,
      },
    ],
    totalSourceBytes: 0,
  };
}

function fresh(): EditorState {
  return initialEditorState("Test_Package");
}

// ---------------------------------------------------------------------------
// Selection semantics
// ---------------------------------------------------------------------------

test("select/click replaces the selection and sets anchor + current", () => {
  let s = fresh();
  s = editorReducer(s, { type: "select/toggle", pageId: pid("a") });
  s = editorReducer(s, { type: "select/toggle", pageId: pid("b") });
  s = editorReducer(s, { type: "select/click", pageId: pid("c") });
  assert.deepEqual([...s.selection], ["c"]);
  assert.equal(s.anchor, "c");
  assert.equal(s.currentPage, "c");
});

test("select/toggle adds and removes single pages", () => {
  let s = fresh();
  s = editorReducer(s, { type: "select/click", pageId: pid("a") });
  s = editorReducer(s, { type: "select/toggle", pageId: pid("b") });
  assert.deepEqual(new Set(s.selection), new Set(["a", "b"]));
  s = editorReducer(s, { type: "select/toggle", pageId: pid("a") });
  assert.deepEqual([...s.selection], ["b"]);
  assert.equal(s.anchor, "a");
});

test("select/range selects between anchor and target inclusive, both directions", () => {
  const order = ["p1", "p2", "p3", "p4", "p5"].map(pid);
  let s = fresh();
  s = editorReducer(s, { type: "select/click", pageId: pid("p2") });
  s = editorReducer(s, { type: "select/range", pageId: pid("p5"), order });
  assert.deepEqual(new Set(s.selection), new Set(["p2", "p3", "p4", "p5"]));
  // Anchor stays at p2; ranging backwards from it works too.
  s = editorReducer(s, { type: "select/range", pageId: pid("p1"), order });
  assert.deepEqual(new Set(s.selection), new Set(["p1", "p2"]));
  assert.equal(s.anchor, "p2");
});

test("select/range without a usable anchor degrades to a click", () => {
  const order = ["p1", "p2"].map(pid);
  const s = editorReducer(fresh(), {
    type: "select/range",
    pageId: pid("p2"),
    order,
  });
  assert.deepEqual([...s.selection], ["p2"]);
  assert.equal(s.anchor, "p2");
});

test("select/prune drops dead ids from selection, anchor, and current", () => {
  let s = fresh();
  s = editorReducer(s, { type: "select/click", pageId: pid("a") });
  s = editorReducer(s, { type: "select/toggle", pageId: pid("b") });
  // Anchor and current now sit on b; pruning b must clear both.
  s = editorReducer(s, { type: "select/prune", alive: [pid("a")] });
  assert.deepEqual([...s.selection], ["a"]);
  assert.equal(s.anchor, null);
  assert.equal(s.currentPage, null);
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

test("history push, undo, redo round-trip", () => {
  const m1 = mkModel("m1");
  const m2 = mkModel("m2");
  let s = fresh();
  s = editorReducer(s, { type: "history/push", model: m1 });
  assert.deepEqual(s.history, { past: [m1], future: [] });

  // Undo: m1 comes off past; the current model (m2) is parked on future.
  s = editorReducer(s, { type: "history/undo", current: m2 });
  assert.deepEqual(s.history, { past: [], future: [m2] });

  // Redo: m2 comes off future; the current model (m1) returns to past.
  s = editorReducer(s, { type: "history/redo", current: m1 });
  assert.deepEqual(s.history, { past: [m1], future: [] });
});

test("history/push clears the redo stack", () => {
  let s = fresh();
  s = editorReducer(s, { type: "history/push", model: mkModel("m1") });
  s = editorReducer(s, { type: "history/undo", current: mkModel("m2") });
  assert.equal(s.history.future.length, 1);
  s = editorReducer(s, { type: "history/push", model: mkModel("m3") });
  assert.equal(s.history.future.length, 0);
});

test("history/undo and redo on empty stacks are no-ops", () => {
  const s = fresh();
  assert.equal(editorReducer(s, { type: "history/undo", current: mkModel("x") }), s);
  assert.equal(editorReducer(s, { type: "history/redo", current: mkModel("x") }), s);
});

test("history past is capped, dropping the oldest snapshots", () => {
  let s = fresh();
  const models: PageModel[] = [];
  for (let i = 0; i < HISTORY_CAP + 5; i += 1) {
    const m = mkModel(`m${i}`);
    models.push(m);
    s = editorReducer(s, { type: "history/push", model: m });
  }
  assert.equal(s.history.past.length, HISTORY_CAP);
  assert.equal(s.history.past[0], models[5]);
  assert.equal(s.history.past[HISTORY_CAP - 1], models[HISTORY_CAP + 4]);
});

// ---------------------------------------------------------------------------
// Zoom
// ---------------------------------------------------------------------------

test("zoom/set clamps to bounds", () => {
  assert.equal(editorReducer(fresh(), { type: "zoom/set", zoom: 3 }).zoom, ZOOM_MAX);
  assert.equal(editorReducer(fresh(), { type: "zoom/set", zoom: 0.1 }).zoom, ZOOM_MIN);
});

test("zoom/step moves by 0.1 without float drift and clamps at bounds", () => {
  let s = fresh();
  s = editorReducer(s, { type: "zoom/step", direction: 1 });
  assert.equal(s.zoom, 1.1);
  s = editorReducer(s, { type: "zoom/step", direction: -1 });
  s = editorReducer(s, { type: "zoom/step", direction: -1 });
  assert.equal(s.zoom, 0.9);

  s = editorReducer(s, { type: "zoom/set", zoom: ZOOM_MAX });
  s = editorReducer(s, { type: "zoom/step", direction: 1 });
  assert.equal(s.zoom, ZOOM_MAX);
  s = editorReducer(s, { type: "zoom/set", zoom: ZOOM_MIN });
  s = editorReducer(s, { type: "zoom/step", direction: -1 });
  assert.equal(s.zoom, ZOOM_MIN);
});

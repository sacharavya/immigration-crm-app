import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diffFieldSchemas } from "../diff";
import type { FormFieldSchema } from "../types";

function f(path: string, label?: string): FormFieldSchema {
  return { path, type: "text", required: false, repeating: false, ...(label ? { label } : {}) };
}

describe("diffFieldSchemas", () => {
  it("classifies added, removed, and unchanged", () => {
    const prev = [f("a"), f("b"), f("c")];
    const next = [f("a"), f("c"), f("d")];
    const diff = diffFieldSchemas(prev, next);
    assert.deepEqual(diff.added, ["d"]);
    assert.deepEqual(diff.removed, ["b"]);
    assert.deepEqual(diff.renamed, []);
    assert.equal(diff.unchanged, 2);
  });

  it("pairs renames by matching label", () => {
    const prev = [f("form1.P1.OldName", "Family name")];
    const next = [f("form1.P1.NewName", "Family name")];
    const diff = diffFieldSchemas(prev, next);
    assert.deepEqual(diff.renamed, [
      { from: "form1.P1.OldName", to: "form1.P1.NewName" },
    ]);
    assert.deepEqual(diff.added, []);
    assert.deepEqual(diff.removed, []);
  });

  it("pairs renames by shared path suffix when a parent moved", () => {
    const prev = [f("form1.Page1.FamilyName")];
    const next = [f("form1.Section2.FamilyName")];
    const diff = diffFieldSchemas(prev, next);
    assert.deepEqual(diff.renamed, [
      { from: "form1.Page1.FamilyName", to: "form1.Section2.FamilyName" },
    ]);
  });

  it("leaves ambiguous suffix matches as added and removed", () => {
    const prev = [f("a.Name")];
    const next = [f("b.Name"), f("c.Name")];
    const diff = diffFieldSchemas(prev, next);
    assert.deepEqual(diff.renamed, []);
    assert.deepEqual(diff.removed, ["a.Name"]);
    assert.deepEqual(diff.added.sort(), ["b.Name", "c.Name"]);
  });

  it("handles empty previous schema (first version)", () => {
    const diff = diffFieldSchemas([], [f("a"), f("b")]);
    assert.deepEqual(diff.added, ["a", "b"]);
    assert.equal(diff.unchanged, 0);
  });
});

/**
 * Tests for rootFolderParts — the root-folder path splitter that decides
 * where the case folder tree is anchored inside the configured drive.
 *
 * Run via: npm test (node:test through tsx).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rootFolderParts } from "./paths";

// Mirrors the SharePoint-illegal-character replacement in
// src/lib/graph/folders.ts, so the test exercises the real pairing.
function sanitize(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim();
}

describe("rootFolderParts", () => {
  it("returns no segments for blank input, anchoring at the drive root", () => {
    assert.deepEqual(rootFolderParts("", sanitize), []);
    assert.deepEqual(rootFolderParts("   ", sanitize), []);
  });

  it("returns a single segment for a plain folder name", () => {
    assert.deepEqual(rootFolderParts("Test-CRM", sanitize), ["Test-CRM"]);
  });

  it("nests on slashes and trims whitespace around segments", () => {
    assert.deepEqual(rootFolderParts(" Sandbox / Cases ", sanitize), [
      "Sandbox",
      "Cases",
    ]);
  });

  it("drops empty segments from doubled or trailing slashes", () => {
    assert.deepEqual(rootFolderParts("Sandbox//Cases/", sanitize), [
      "Sandbox",
      "Cases",
    ]);
  });

  it("refuses traversal segments so the tree stays under the chosen folder", () => {
    assert.deepEqual(rootFolderParts("../../etc", sanitize), ["etc"]);
    assert.deepEqual(rootFolderParts("Sandbox/../Other", sanitize), [
      "Sandbox",
      "Other",
    ]);
    assert.deepEqual(rootFolderParts("./Sandbox", sanitize), ["Sandbox"]);
  });

  it("sanitizes characters SharePoint rejects", () => {
    assert.deepEqual(rootFolderParts('Cases: "2026"', sanitize), [
      "Cases_ _2026_",
    ]);
  });
});

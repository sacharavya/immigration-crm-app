import { test } from "node:test";
import assert from "node:assert/strict";

import { missingInputNames } from "../use-pdf-engine";

test("missingInputNames names the inputs that did not come back", () => {
  assert.deepEqual(
    missingInputNames(["a.pdf", "b.pdf", "c.pdf"], ["a.pdf", "c.pdf"]),
    ["b.pdf"],
  );
});

test("missingInputNames handles duplicate names by count", () => {
  assert.deepEqual(
    missingInputNames(["scan.pdf", "scan.pdf", "x.pdf"], ["scan.pdf", "x.pdf"]),
    ["scan.pdf"],
  );
});

test("missingInputNames is empty when everything loaded", () => {
  assert.deepEqual(missingInputNames(["a.pdf"], ["a.pdf"]), []);
});

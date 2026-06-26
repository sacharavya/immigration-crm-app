/**
 * Tests for maskDateValue, the date field mask. Run via: npm test.
 *
 * The headline rule: eight typed digits become YYYY-MM-DD with the year fixed
 * at four digits, never the old "200222-02-22" where the year ran to six.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { maskDateValue } from "./date-mask";

describe("maskDateValue", () => {
  it("formats eight digits as YYYY-MM-DD, year capped at four", () => {
    assert.equal(maskDateValue("20020222"), "2002-02-22");
  });

  it("never lets the year exceed four digits", () => {
    // The reported bug: extra digits used to inflate the year.
    assert.equal(maskDateValue("200222"), "2002-22");
    assert.equal(maskDateValue("2002022299"), "2002-02-22");
  });

  it("inserts hyphens progressively as the user types", () => {
    assert.equal(maskDateValue("2"), "2");
    assert.equal(maskDateValue("2002"), "2002");
    assert.equal(maskDateValue("20020"), "2002-0");
    assert.equal(maskDateValue("200202"), "2002-02");
    assert.equal(maskDateValue("2002020"), "2002-02-0");
  });

  it("ignores non-digits and accepts a pasted ISO date", () => {
    assert.equal(maskDateValue("2002-02-22"), "2002-02-22");
    assert.equal(maskDateValue("2002/02/22"), "2002-02-22");
    assert.equal(maskDateValue("abc"), "");
  });

  it("returns empty for an empty field", () => {
    assert.equal(maskDateValue(""), "");
  });
});

// Money arithmetic: the fee breakdown must agree with the retainer PDF
// renderer on every HST shape, or staff see understated balances.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeCaseFeeBreakdown,
  computeCaseOutstanding,
  hstForRetainer,
} from "./fee-totals";

describe("hstForRetainer", () => {
  it("computes 13 percent of the service fee when hst_cad is NULL", () => {
    assert.equal(hstForRetainer(100, null), 13);
    assert.equal(hstForRetainer(1234.5, null), 160.49);
  });

  it("keeps an explicit zero (HST checkbox cleared)", () => {
    assert.equal(hstForRetainer(100, 0), 0);
  });

  it("keeps an explicit override, including string numerics", () => {
    assert.equal(hstForRetainer(100, 26), 26);
    assert.equal(hstForRetainer(100, "13.00"), 13);
  });
});

describe("computeCaseFeeBreakdown", () => {
  const caseRow = { quoted_fee_cad: 100, government_fee_cad: 150 };

  it("signed retainer with NULL hst: 13 percent applied", () => {
    const b = computeCaseFeeBreakdown(caseRow, {
      government_fee_cad: 150,
      hst_cad: null,
    });
    assert.equal(b.hstCad, 13);
    assert.equal(b.totalCad, 263);
  });

  it("signed retainer with explicit zero hst: no tax line", () => {
    const b = computeCaseFeeBreakdown(caseRow, {
      government_fee_cad: 150,
      hst_cad: 0,
    });
    assert.equal(b.hstCad, 0);
    assert.equal(b.totalCad, 250);
  });

  it("no retainer: no HST, case-row government fee used", () => {
    const b = computeCaseFeeBreakdown(caseRow, null);
    assert.equal(b.hstCad, 0);
    assert.equal(b.governmentFeeCad, 150);
    assert.equal(b.totalCad, 250);
  });

  it("outstanding never goes negative", () => {
    assert.equal(
      computeCaseOutstanding(caseRow, { government_fee_cad: 150, hst_cad: null }, 263),
      0,
    );
    assert.equal(
      computeCaseOutstanding(caseRow, { government_fee_cad: 150, hst_cad: null }, 200),
      63,
    );
  });
});

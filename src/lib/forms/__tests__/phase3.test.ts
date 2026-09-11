// FORMS-3 unit tests: transforms, normalizers, profile path resolution,
// mapping copy-forward and the activation gate mirror.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  copyMappingForward,
  fieldStatus,
  requiredGateBlockers,
  type FormMapping,
} from "../mapping";
import { splitName, toE164 } from "../normalize";
import { PROFILE_PATHS, resolveProfilePath } from "../profile";
import type { ApplicantProfile } from "../profile";
import { applyTransform } from "../transforms";

const CTX = { countryNames: { CA: "Canada", NP: "Nepal" } };

describe("transforms", () => {
  it("date_ddmmyyyy formats ISO dates and passes junk through", () => {
    assert.equal(applyTransform("date_ddmmyyyy", "2001-08-21", CTX), "21/08/2001");
    assert.equal(applyTransform("date_ddmmyyyy", "unknown", CTX), "unknown");
  });

  it("date_yyyymmdd truncates timestamps", () => {
    assert.equal(
      applyTransform("date_yyyymmdd", "2001-08-21T10:00:00Z", CTX),
      "2001-08-21",
    );
  });

  it("uppercase, country_name, yes_no, checkbox_from_bool", () => {
    assert.equal(applyTransform("uppercase", "Kathmandu", CTX), "KATHMANDU");
    assert.equal(applyTransform("country_name", "np", CTX), "Nepal");
    assert.equal(applyTransform("country_name", "XX", CTX), "XX");
    assert.equal(applyTransform("yes_no", true, CTX), "Yes");
    assert.equal(applyTransform("yes_no", false, CTX), "No");
    assert.equal(applyTransform("yes_no", null, CTX), "");
    assert.equal(applyTransform("checkbox_from_bool", true, CTX), true);
  });

  it("unknown or absent transform passes the value through", () => {
    assert.equal(applyTransform(undefined, "x", CTX), "x");
    assert.equal(applyTransform("nope", "x", CTX), "x");
  });
});

describe("normalize", () => {
  it("splitName takes the last token as family", () => {
    assert.deepEqual(splitName("Pranisha Uprety"), {
      given: "Pranisha",
      family: "Uprety",
    });
    assert.deepEqual(splitName("Damodar Prasad Khatiwada"), {
      given: "Damodar Prasad",
      family: "Khatiwada",
    });
    assert.deepEqual(splitName("Madonna"), { given: "Madonna", family: null });
  });

  it("toE164 handles plus, NANP, and international digits", () => {
    assert.equal(toE164("+977 9841 234567"), "+9779841234567");
    assert.equal(toE164("(437) 733-7525"), "+14377337525");
    assert.equal(toE164("1 437 733 7525"), "+14377337525");
    assert.equal(toE164("00977 9841234567"), "+9779841234567");
    assert.equal(toE164(""), null);
    assert.equal(toE164(null), null);
  });
});

describe("profile path resolution", () => {
  const profile: ApplicantProfile = {
    applicant: {
      given_name: "Pranisha",
      address: { city: "Kathmandu" },
      education: [
        { institution: "Tribhuvan University" },
        { institution: "Seneca College" },
      ],
      family: {
        spouse: { given_name: "Saurav" },
        children: [{ dob: "2020-01-15" }],
      },
    },
  };

  it("resolves scalar, nested, array, and person paths", () => {
    assert.equal(resolveProfilePath(profile, "applicant.given_name"), "Pranisha");
    assert.equal(resolveProfilePath(profile, "applicant.address.city"), "Kathmandu");
    assert.equal(
      resolveProfilePath(profile, "applicant.education[].institution", 1),
      "Seneca College",
    );
    assert.equal(
      resolveProfilePath(profile, "applicant.family.spouse.given_name"),
      "Saurav",
    );
    assert.equal(
      resolveProfilePath(profile, "applicant.family.children[].dob"),
      "2020-01-15",
    );
  });

  it("returns undefined off the end of arrays and missing branches", () => {
    assert.equal(
      resolveProfilePath(profile, "applicant.education[].institution", 5),
      undefined,
    );
    assert.equal(resolveProfilePath(profile, "applicant.uci"), undefined);
  });

  it("every catalog path resolves without throwing on an empty profile", () => {
    const empty: ApplicantProfile = { applicant: {} };
    for (const spec of PROFILE_PATHS) {
      resolveProfilePath(empty, spec.path);
    }
  });
});

describe("mapping copy-forward", () => {
  const prev: FormMapping = {
    "form1.P1.Name": { source: "profile", profile_path: "applicant.given_name", required: true },
    "form1.P1.Gone": { source: "profile", profile_path: "applicant.uci", required: false },
    "form1.P1.Old": { source: "constant", constant_value: "X", required: false },
  };

  it("carries existing, follows renames, marks vanished broken", () => {
    const next = copyMappingForward(
      prev,
      ["form1.P1.Name", "form1.P2.Old"],
      [{ from: "form1.P1.Old", to: "form1.P2.Old" }],
    );
    assert.deepEqual(next["form1.P1.Name"], prev["form1.P1.Name"]);
    assert.deepEqual(next["form1.P2.Old"], prev["form1.P1.Old"]);
    assert.equal(next["form1.P1.Gone"]?.broken, true);
    assert.equal(next["form1.P1.Old"], undefined);
  });

  it("fieldStatus covers all five states", () => {
    assert.equal(fieldStatus(undefined), "unmapped");
    assert.equal(fieldStatus({ source: "profile", profile_path: "a", required: false }), "mapped");
    assert.equal(fieldStatus({ source: "profile", required: false }), "unmapped");
    assert.equal(fieldStatus({ source: "constant", constant_value: "x", required: false }), "mapped");
    assert.equal(fieldStatus({ source: "manual", required: false }), "manual");
    assert.equal(fieldStatus({ source: "skip", required: false }), "skip");
    assert.equal(
      fieldStatus({ source: "profile", profile_path: "a", required: false, broken: true }),
      "broken",
    );
  });

  it("requiredGateBlockers flags skip, unmapped-profile, and broken required entries", () => {
    const mapping: FormMapping = {
      ok: { source: "profile", profile_path: "applicant.dob", required: true },
      okManual: { source: "manual", required: true },
      badSkip: { source: "skip", required: true },
      badBroken: { source: "profile", profile_path: "a", required: true, broken: true },
      fineSkip: { source: "skip", required: false },
    };
    assert.deepEqual(requiredGateBlockers(mapping).sort(), ["badBroken", "badSkip"]);
  });
});

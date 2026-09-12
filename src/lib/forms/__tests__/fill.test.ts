// FORMS-4 fill engine tests: an AcroForm round-trip (fill then reload and
// assert values) and an XFA round-trip (fill then re-read the datasets
// packet and assert the XML carries the values).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";

import { readXfaPacket } from "../extract";
import { buildDatasetsXml, fillAcroForm, fillXfa } from "../fill";
import type { FormMapping } from "../mapping";
import type { ApplicantProfile } from "../profile";

const CTX = { countryNames: { NP: "Nepal", CA: "Canada" } };

const PROFILE: ApplicantProfile = {
  applicant: {
    given_name: "Pranisha",
    family_name: "Uprety",
    dob: "1993-04-18",
    country_of_citizenship: "NP",
    education: [
      { institution: "Tribhuvan University" },
      { institution: "Seneca College" },
    ],
  },
};

async function makeAcroFixture(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  const form = doc.getForm();
  const name = form.createTextField("FamilyName");
  name.addToPage(page, { x: 50, y: 700, width: 200, height: 20 });
  const dob = form.createTextField("DOB");
  dob.addToPage(page, { x: 50, y: 650, width: 200, height: 20 });
  const country = form.createDropdown("Citizenship");
  country.setOptions(["Nepal", "Canada"]);
  country.addToPage(page, { x: 50, y: 600, width: 150, height: 20 });
  const consent = form.createCheckBox("Consent");
  consent.addToPage(page, { x: 50, y: 550, width: 15, height: 15 });
  return doc.save();
}

const MAPPING: FormMapping = {
  FamilyName: {
    source: "profile",
    profile_path: "applicant.family_name",
    transform: "uppercase",
    required: true,
  },
  DOB: {
    source: "profile",
    profile_path: "applicant.dob",
    transform: "date_ddmmyyyy",
    required: true,
  },
  Citizenship: {
    source: "profile",
    profile_path: "applicant.country_of_citizenship",
    transform: "country_name",
    required: false,
  },
  Consent: { source: "constant", constant_value: "true", required: false },
  Missing: {
    source: "profile",
    profile_path: "applicant.uci",
    required: false,
  },
  Manual: { source: "manual", required: false },
};

describe("fillAcroForm", () => {
  it("writes transformed values and reports blanks with reasons", async () => {
    const { bytes, unmapped } = await fillAcroForm(
      await makeAcroFixture(),
      MAPPING,
      PROFILE,
      CTX,
    );
    const doc = await PDFDocument.load(bytes);
    const form = doc.getForm();
    assert.equal(form.getTextField("FamilyName").getText(), "UPRETY");
    assert.equal(form.getTextField("DOB").getText(), "18/04/1993");
    assert.equal(form.getDropdown("Citizenship").getSelected()[0], "Nepal");
    assert.equal(form.getCheckBox("Consent").isChecked(), true);
    const reasons = Object.fromEntries(unmapped.map((u) => [u.path, u.reason]));
    assert.equal(reasons.Missing, "no_data");
    assert.equal(reasons.Manual, "manual");
  });

  it("flattens only when asked", async () => {
    const flat = await fillAcroForm(
      await makeAcroFixture(),
      MAPPING,
      PROFILE,
      CTX,
      { flatten: true },
    );
    const doc = await PDFDocument.load(flat.bytes);
    assert.equal(doc.getForm().getFields().length, 0);
  });
});

describe("buildDatasetsXml / fillXfa", () => {
  const XFA_MAPPING: FormMapping = {
    "form1.Page1.Personal.FamilyName": {
      source: "profile",
      profile_path: "applicant.family_name",
      required: true,
    },
    "form1.Page1.Edu.Institution": {
      source: "profile",
      profile_path: "applicant.education[].institution",
      array_index: 1,
      required: false,
    },
  };

  it("builds nested datasets XML with row slots", () => {
    const { xml } = buildDatasetsXml(XFA_MAPPING, PROFILE, CTX);
    assert.ok(xml.includes("<FamilyName>Uprety</FamilyName>"));
    assert.ok(xml.includes("<Institution>Seneca College</Institution>"));
    assert.ok(xml.startsWith("<xfa:datasets"));
  });

  it("replaces the datasets packet in an XFA PDF", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([600, 800]);
    doc.getForm();
    const ctxPdf = doc.context;
    const stream = ctxPdf.stream("<xfa:datasets><xfa:data><old/></xfa:data></xfa:datasets>");
    const ref = ctxPdf.register(stream);
    const acro = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
    assert.ok(acro);
    acro.set(PDFName.of("XFA"), ctxPdf.obj([PDFString.of("datasets"), ref]));
    const fixture = await doc.save();

    const { bytes } = await fillXfa(fixture, XFA_MAPPING, PROFILE, CTX);
    const out = await PDFDocument.load(bytes);
    const packet = readXfaPacket(out, "datasets");
    assert.ok(packet);
    assert.ok(packet.includes("<FamilyName>Uprety</FamilyName>"));
    assert.ok(!packet.includes("<old/>"));
  });
});

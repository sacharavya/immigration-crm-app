// Extraction tests. Fixtures are generated with pdf-lib right here rather
// than checked in as binaries: an AcroForm PDF with one field of each type,
// and a minimal XFA PDF whose /XFA array carries a datasets packet.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";

import { detectVersionLabel, extractFormSchema } from "../extract";

async function makeAcroFormFixture(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  const form = doc.getForm();

  const name = form.createTextField("applicant.family_name");
  name.addToPage(page, { x: 50, y: 700, width: 200, height: 20 });
  // Alternate text (/TU) becomes the extracted label.
  name.acroField.dict.set(PDFName.of("TU"), PDFString.of("Family name"));

  const consent = form.createCheckBox("consent");
  consent.addToPage(page, { x: 50, y: 650, width: 15, height: 15 });

  const sex = form.createRadioGroup("applicant.sex");
  sex.addOptionToPage("F", page, { x: 50, y: 600, width: 15, height: 15 });
  sex.addOptionToPage("M", page, { x: 80, y: 600, width: 15, height: 15 });

  const country = form.createDropdown("applicant.country");
  country.setOptions(["CA", "NP"]);
  country.addToPage(page, { x: 50, y: 550, width: 100, height: 20 });

  return doc.save();
}

const DATASETS_XML = `<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/">
  <xfa:data>
    <form1>
      <Page1>
        <PersonalDetails>
          <FamilyName/>
          <GivenName/>
        </PersonalDetails>
        <Address>
          <Street/>
          <City/>
        </Address>
        <Address>
          <Street/>
          <City/>
        </Address>
      </Page1>
    </form1>
  </xfa:data>
</xfa:datasets>`;

async function makeXfaFixture(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([600, 800]);
  // Force the AcroForm dict into existence, then attach a raw XFA array:
  // [ (datasets) streamRef ].
  doc.getForm();
  const context = doc.context;
  const stream = context.stream(DATASETS_XML);
  const streamRef = context.register(stream);
  const acroForm = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (!acroForm) throw new Error("fixture: AcroForm dict missing");
  acroForm.set(
    PDFName.of("XFA"),
    context.obj([PDFString.of("datasets"), streamRef]),
  );
  return doc.save();
}

describe("extractFormSchema - AcroForm", () => {
  it("lists every field with its type", async () => {
    const result = await extractFormSchema(await makeAcroFormFixture());
    assert.equal(result.formType, "acroform");
    const byPath = new Map(result.fields.map((f) => [f.path, f]));
    assert.equal(byPath.get("applicant.family_name")?.type, "text");
    assert.equal(byPath.get("applicant.family_name")?.label, "Family name");
    assert.equal(byPath.get("consent")?.type, "checkbox");
    assert.equal(byPath.get("applicant.sex")?.type, "radio");
    assert.equal(byPath.get("applicant.country")?.type, "dropdown");
    assert.equal(result.fields.length, 4);
    assert.ok(result.fields.every((f) => f.required === false));
  });
});

describe("extractFormSchema - XFA", () => {
  it("detects XFA and flattens datasets leaf paths", async () => {
    const result = await extractFormSchema(await makeXfaFixture());
    assert.equal(result.formType, "xfa");
    const paths = new Map(result.fields.map((f) => [f.path, f]));
    assert.ok(paths.has("form1.Page1.PersonalDetails.FamilyName"));
    assert.ok(paths.has("form1.Page1.PersonalDetails.GivenName"));
    assert.equal(
      paths.get("form1.Page1.PersonalDetails.FamilyName")?.repeating,
      false,
    );
    // The repeated Address group marks its leaves repeating.
    assert.equal(paths.get("form1.Page1.Address.Street")?.repeating, true);
    assert.equal(paths.get("form1.Page1.Address.City")?.repeating, true);
  });
});

describe("detectVersionLabel", () => {
  it("finds an IRCC-style label in raw bytes", () => {
    const bytes = new TextEncoder().encode(
      "junk junk IMM 5257 (08-2023) more junk",
    );
    assert.equal(detectVersionLabel(bytes), "08-2023");
  });

  it("rejects non-month patterns and returns null when absent", () => {
    assert.equal(
      detectVersionLabel(new TextEncoder().encode("ratio (99-1234)")),
      null,
    );
    assert.equal(detectVersionLabel(new TextEncoder().encode("nothing")), null);
  });
});

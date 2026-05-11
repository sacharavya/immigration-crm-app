// Pure HTML/CSS rendering of the firm's v1 retainer agreement. Three
// modes are supported by switching one prop:
//
//   preview  — full document with a DRAFT watermark over the page.
//   signing  — full document, client signature box empty (dashed). The
//              public signing page overlays/below this with a pad.
//   final    — full document with both signatures rendered. This is what
//              becomes the PDF.
//
// The verbatim text matches the firm's .docx source. Variables come from
// the data prop. Currency and dates are formatted at render time.
//
// The component is self-contained — all styles are inlined into a
// <style> block so the same markup can be embedded in screen views,
// served from /api/retainer-document, or fed to Puppeteer for PDF
// generation without external CSS resolution.

export type RetainerData = {
  // Case context
  case_number: string;
  service_description: string;

  // Client
  client_legal_name_full: string;
  client_given_name: string;
  client_family_name: string;
  client_address: string;
  client_email: string;
  client_phone: string;

  // RCIC
  rcic_name: string;
  rcic_given_name: string;
  rcic_family_name: string;
  rcic_membership_number: string;
  rcic_address: string;
  rcic_phone: string;
  rcic_office_phone: string;
  rcic_cell_phone: string;
  rcic_email: string;
  rcic_signature_image_url: string;
  rcic_printed_name?: string | null;

  // Fees
  quoted_fee_cad: number;
  government_fee_cad: number;
  first_installment_cad: number;
  second_installment_cad: number;
  hst_cad: number;
  withdrawal_refund_floor_cad: number;

  // Signing event
  date_of_signing: string | null;
  client_signature_image_url: string | null;

  // Letterhead asset (base64 data URL). Inlined so the PDF renderer
  // doesn't need a base URL to resolve /logo.png.
  letterhead_logo_url: string;
};

export type RetainerMode = "preview" | "signing" | "final" | "void";

export type RetainerDocumentProps = {
  data: RetainerData;
  mode: RetainerMode;
  // Only used when mode === "void". Passed through so the void PDF
  // shows the actual voided-on date instead of the date_of_signing
  // (which may be unset or stale).
  voidedAt?: string | null;
};

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtCad(amount: number): string {
  return cadFormatter.format(amount);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "________";
  try {
    return new Date(iso).toLocaleDateString("en-CA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export const RETAINER_STYLES = `
:root {
  --rt-text: #0f172a;
  --rt-muted: #475569;
  --rt-border: #cbd5e1;
}

.retainer-page {
  font-family: Georgia, "Times New Roman", Times, serif;
  color: var(--rt-text);
  background: #ffffff;
  font-size: 12pt;
  line-height: 1.55;
  padding: 28px 32px;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  /* Clip rotated watermark stamps so they can't bleed past the column. */
  overflow: hidden;
}

.retainer-letterhead {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 20px;
  margin: 0 0 24px;
  border-bottom: 2px solid var(--rt-border);
}

.retainer-letterhead img {
  max-height: 80px;
  max-width: 320px;
  width: auto;
  height: auto;
  display: block;
}

.retainer-page h1 {
  font-size: 22pt;
  text-align: center;
  margin: 0 0 8px;
  letter-spacing: 0.04em;
}

.retainer-page h2 {
  font-size: 13pt;
  margin: 22px 0 8px;
  font-weight: 700;
}

.retainer-page h3 {
  font-size: 12pt;
  margin: 14px 0 6px;
  font-weight: 700;
}

.retainer-page p {
  margin: 0 0 10px;
}

.retainer-page ol,
.retainer-page ul {
  margin: 4px 0 12px;
  padding-left: 26px;
}

.retainer-page li {
  margin: 4px 0;
}

.retainer-meta {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  margin: 6px 0 22px;
  border-top: 1px solid var(--rt-border);
  border-bottom: 1px solid var(--rt-border);
  padding: 6px 0;
  font-size: 11pt;
}

.retainer-fees-table,
.retainer-schedule-table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0 14px;
  font-size: 11pt;
}

.retainer-fees-table td,
.retainer-schedule-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--rt-border);
}

.retainer-fees-table .label,
.retainer-schedule-table .label {
  width: 60%;
}

.retainer-fees-table .value,
.retainer-schedule-table .value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  width: 40%;
}

.retainer-fees-table tr.total td {
  border-top: 2px solid var(--rt-text);
  border-bottom: none;
  font-weight: 700;
}

.retainer-contact-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0 18px;
  font-size: 11pt;
}

.retainer-contact-table th {
  text-align: left;
  background: #f8fafc;
  border: 1px solid var(--rt-border);
  padding: 8px 10px;
  font-size: 11pt;
  width: 50%;
}

.retainer-contact-table td {
  border: 1px solid var(--rt-border);
  padding: 6px 10px;
  vertical-align: top;
}

.retainer-contact-table td .row {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 4px;
  margin: 2px 0;
}

.retainer-contact-table td .row .key {
  color: var(--rt-muted);
  font-size: 10.5pt;
}

.retainer-signatures {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-top: 32px;
  page-break-inside: avoid;
}

.retainer-signatures .sig-cell {
  text-align: center;
}

.retainer-signatures .sig-image {
  height: 80px;
  display: flex;
  align-items: end;
  justify-content: center;
  border-bottom: 1px solid var(--rt-text);
  margin-bottom: 6px;
}

.retainer-signatures .sig-image.empty {
  border-bottom: 1px dashed var(--rt-border);
}

.retainer-signatures .sig-image img {
  max-height: 80px;
  max-width: 100%;
  object-fit: contain;
}

.retainer-signatures .sig-caption {
  font-size: 11pt;
  color: var(--rt-muted);
}

.retainer-signatures .sig-printed-name {
  font-size: 11pt;
  margin-top: 4px;
  font-weight: 600;
}

.retainer-footer {
  margin-top: 40px;
  padding-top: 14px;
  border-top: 1px solid var(--rt-border);
  font-size: 10pt;
  color: var(--rt-muted);
  text-align: center;
  line-height: 1.45;
}

/*
 * Watermark stamps. Each .retainer-watermark is an absolutely-
 * positioned, zero-height strip whose child renders a rotated
 * watermark phrase centred horizontally inside the document column.
 * Multiple stamps are emitted at evenly-spaced top percentages so
 * the watermark is visible no matter where the reader is in the
 * agreement (and across pages of the generated PDF).
 */
.retainer-watermark {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
  display: flex;
  justify-content: center;
  z-index: 1000;
}

.retainer-watermark span {
  display: inline-block;
  transform: translateY(-50%) rotate(-20deg);
  transform-origin: center center;
  font-size: 42pt;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.08);
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.retainer-void-banner {
  margin: 0 0 20px;
  padding: 10px 14px;
  border: 1px solid #fecaca;
  border-left-width: 4px;
  border-left-color: #dc2626;
  background: #fef2f2;
  color: #7f1d1d;
  font-size: 11pt;
  border-radius: 4px;
}

.retainer-void-banner strong {
  color: #b91c1c;
  margin-right: 4px;
}

@media print {
  .retainer-page {
    max-width: none;
    padding: 0;
  }
  .retainer-signatures {
    page-break-inside: avoid;
  }
}

@media (max-width: 640px) {
  .retainer-page {
    padding: 20px 16px;
    font-size: 11pt;
  }
  .retainer-letterhead img {
    max-height: 60px;
    max-width: 220px;
  }
  .retainer-meta {
    flex-direction: column;
    gap: 4px;
  }
  .retainer-contact-table,
  .retainer-contact-table tbody,
  .retainer-contact-table tr,
  .retainer-contact-table th,
  .retainer-contact-table td {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
  .retainer-contact-table th {
    border-bottom: none;
  }
  .retainer-signatures {
    grid-template-columns: 1fr;
  }
}
`;

// Vertical positions (% of .retainer-page height) for the repeated
// watermark stamps. Spread evenly enough that at least one stamp is
// visible on every printed page of a typical 5–8 page retainer.
const WATERMARK_TOPS = [12, 32, 52, 72, 92] as const;

export function RetainerDocument({
  data,
  mode,
  voidedAt,
}: RetainerDocumentProps) {
  const subtotal = data.quoted_fee_cad + data.hst_cad;
  const totalCost = subtotal + data.government_fee_cad;
  const dateOfSigning = fmtDate(data.date_of_signing);
  const watermarkText =
    mode === "preview"
      ? "DRAFT — NOT SIGNED"
      : mode === "void"
        ? "VOID"
        : null;
  // Final + void both render the captured signatures (if any) so the
  // void PDF accurately reflects what was on file at the time it was
  // voided. Signing/preview modes leave the client signature blank.
  const showClientSignature =
    (mode === "final" || mode === "void") &&
    Boolean(data.client_signature_image_url);
  // RCIC counter-signature is suppressed until the client has actually
  // signed. The retainer is only "executed" once both parties sign, so
  // a draft / pending preview should never display the RCIC signature
  // image — that's a tell that the document is still in flight.
  const showRcicSignature =
    showClientSignature && Boolean(data.rcic_signature_image_url);
  const printedName = data.rcic_printed_name?.trim() || data.rcic_name;

  return (
    <article className="retainer-page">
      {watermarkText &&
        WATERMARK_TOPS.map((top) => (
          <div
            key={top}
            className="retainer-watermark"
            aria-hidden="true"
            style={{ top: `${top}%` }}
          >
            <span>{watermarkText}</span>
          </div>
        ))}

      {mode === "void" && (
        <div className="retainer-void-banner" role="status">
          <strong>This agreement has been voided.</strong>
          {voidedAt ? <span> Voided on {fmtDate(voidedAt)}.</span> : null}
        </div>
      )}

      {data.letterhead_logo_url && (
        <header className="retainer-letterhead">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.letterhead_logo_url} alt="Big Bang Immigration" />
        </header>
      )}

      <h1>RETAINER AGREEMENT</h1>

      <div className="retainer-meta">
        <span>RCIC Membership Number: {data.rcic_membership_number}</span>
        <span>Client File Number: {data.case_number}</span>
      </div>

      <p>
        This Retainer Agreement is made this {dateOfSigning}, between RCIC{" "}
        {data.rcic_name} (the &ldquo;RCIC&rdquo;), located at{" "}
        {data.rcic_address}, and {data.client_legal_name_full} (the
        &ldquo;Client&rdquo;), located at {data.client_address}.
      </p>

      <p>
        WHEREAS the RCIC and the Client wish to enter into a written
        agreement which contains the agreed upon terms and conditions upon
        which the RCIC will provide his/her services to the Client.
      </p>

      <p>
        AND WHEREAS the RCIC is a member of The College of Immigration and
        Citizenship Consultants (the &ldquo;College&rdquo;), the regulator
        in Canada for immigration consultants.
      </p>

      <p>
        IN CONSIDERATION of the mutual covenants contained in this
        Agreement, the parties agree as follows:
      </p>

      <h2>1. Definitions</h2>
      <p>
        The terms &ldquo;Client&rdquo;, &ldquo;College&rdquo;,
        &ldquo;Disbursement&rdquo; and &ldquo;RCIC&rdquo; shall have the
        meaning given to such terms in the Retainer Agreement Regulation of
        the College.
      </p>

      <h2>2. RCIC Responsibilities and Commitments</h2>
      <p>
        The Client asked the RCIC, and the RCIC has agreed, to act for the
        Client in the matter of {data.service_description} in Canada.
      </p>
      <p>
        In consideration of the fees paid and the matter stated above, the
        RCIC agrees to do the following:
      </p>
      <ol type="a">
        <li>
          Advise the CLIENT with respect to current Canadian Immigration
          Laws / Regulations;
        </li>
        <li>
          Liaise between the Canadian Immigration / Border Authorities and
          the CLIENT;
        </li>
        <li>
          Collate the documents necessary in support of the application
          and advise the CLIENT as to which documents are required in
          support of the application;
        </li>
        <li>Prepare all forms and submissions;</li>
        <li>
          Review, compile, and prepare case submissions and file with the
          relevant visa office;
        </li>
        <li>Keep CLIENT reasonably informed of case progress;</li>
        <li>
          Prepare the CLIENT for any interview related to the application,
          if required;
        </li>
        <li>Answer all reasonable requests from the CLIENT for information;</li>
        <li>
          Hold in strict confidence all information concerning the personal
          and business affairs of the CLIENT acquired during the
          professional relationship, and not disclose such information
          unless disclosure is expressly or impliedly authorized by the
          CLIENT, is required by law, or is otherwise permitted by the
          rules;
        </li>
        <li>
          Not disclose the fact of having been consulted or retained by the
          CLIENT unless the nature of the matter required such disclosure;
        </li>
        <li>
          Subject to being compelled by law or legal process, the Company
          shall preserve the CLIENT&rsquo;s confidential information even
          after the termination of the retainer, whether differences have
          arisen between the Company and the CLIENT;
        </li>
        <li>Monitor the case progress till the decision.</li>
      </ol>

      <h2>3. Client Responsibilities and Commitments</h2>
      <ol type="a">
        <li>
          The Client must provide, upon request from the RCIC:
          <ol type="i">
            <li>All necessary documentation</li>
            <li>
              All documentation in English or French, or with an English or
              French translation
            </li>
            <li>Photo for advertisement after positive visa/permit decision</li>
          </ol>
        </li>
        <li>
          The Client understands that he/she must be accurate and honest in
          the information he/she provides and that any inaccuracies may
          void this Agreement, or seriously affect the outcome of the
          application or the retention of any status he/she may obtain. The
          RCIC&rsquo;s obligations under the Retainer Agreement are null
          and void if the Client knowingly provides any inaccurate,
          misleading or false material information. The Client&rsquo;s
          financial obligations remain.
        </li>
        <li>
          In the event Immigration, Refugees and Citizenship Canada (IRCC)
          or Employment and Social Development Canada (ESDC) should contact
          the Client directly, the Client is instructed to notify the RCIC
          immediately.
        </li>
        <li>
          The Client is to immediately advise the RCIC of any change in
          marital, family, or civil status or change of physical address
          or contact information for any person included in the
          application.
        </li>
        <li>
          In the event of a Joint Retainer Agreement, the Clients agree
          that the RCIC may share information among all clients, as
          required. Furthermore, if a conflict develops that cannot be
          resolved, the RCIC cannot continue to act for both or all the
          Clients and may have to withdraw completely.
        </li>
      </ol>

      <h2>4. Billing Method</h2>
      <p>
        The Client will be billed by flat fee. The details of this billing
        method are as follows:
      </p>
      <table className="retainer-fees-table">
        <tbody>
          <tr>
            <td className="label">Fee:</td>
            <td className="value">{fmtCad(data.quoted_fee_cad)}</td>
          </tr>
          <tr>
            <td className="label">HST (13%):</td>
            <td className="value">{fmtCad(data.hst_cad)}</td>
          </tr>
          <tr>
            <td className="label">Subtotal:</td>
            <td className="value">{fmtCad(subtotal)}</td>
          </tr>
          <tr>
            <td className="label">Government fees:</td>
            <td className="value">{fmtCad(data.government_fee_cad)}</td>
          </tr>
          <tr className="total">
            <td className="label">Total Cost (inclusive of tax):</td>
            <td className="value">{fmtCad(totalCost)}</td>
          </tr>
        </tbody>
      </table>

      <h3>4.1. Payment Schedule</h3>
      <table className="retainer-schedule-table">
        <tbody>
          <tr>
            <td className="label">First Installment (Before starting an application):</td>
            <td className="value">{fmtCad(data.first_installment_cad)}</td>
          </tr>
          <tr>
            <td className="label">Second Installment (During an application):</td>
            <td className="value">{fmtCad(data.second_installment_cad)}</td>
          </tr>
          <tr>
            <td className="label">Government fees:</td>
            <td className="value">{fmtCad(data.government_fee_cad)}</td>
          </tr>
        </tbody>
      </table>
      <p>
        The above amount is to be paid by the Client and is subject to
        change upon mutual agreement of both parties.
      </p>

      <h2>5. Refund Policy</h2>
      <p>
        The Client acknowledges that the granting of a visa or status and
        the time required for processing this application is at the sole
        discretion of the government and not the RCIC. Furthermore, the
        Client acknowledges that fees are not refundable in the event of an
        application refusal.
      </p>
      <p>
        The Client agrees that the fees paid are for services indicated
        above. The Client agrees to pay the full agreed amount of this
        contract. If Client withdraws the application, the payment before
        the start of the application ({fmtCad(data.withdrawal_refund_floor_cad)})
        and earned fees will be non-refundable. In cases where the
        application is withdrawn, the balance due shall become payable
        forthwith.
      </p>

      <h2>
        6. Dispute Resolution Related to the Code of Professional Ethics
      </h2>
      <p>
        In the event of a dispute related to the Code of Professional
        Ethics, the Client and RCIC are to make every effort to resolve the
        matter between the two parties. In the event a resolution cannot be
        reached, the Client is to present the complaint in writing to the
        RCIC and allow 30 days to respond to the Client. In the event the
        dispute is still unresolved, the Client may follow the complaint
        and discipline procedure outlined by the Council on their website
        under the heading &ldquo;File a Complaint&rdquo;.
      </p>
      <p>
        <strong>NOTE:</strong> All complaint forms must be signed. CICC
        Contact Information:
      </p>
      <p>
        The College of Immigration and Citizenship Consultants (CICC)
        <br />
        5500 North Service Rd., Suite 1002
        <br />
        Burlington, ON, L7L 6W6
        <br />
        Toll free: 1-877-836-7543
      </p>

      <h2>7. Confidentiality</h2>
      <p>
        All information and documentation reviewed by the RCIC, required by
        IRCC and all other governing bodies, and used for the preparation
        of the application will not be divulged to any third party, other
        than agents and employees, without prior consent, except as
        demanded by law. The RCIC, and all agents and employees of the
        RCIC, are also bound by the confidentiality requirements of Article
        8 of the Code of Professional Ethics.
      </p>
      <p>
        The Client agrees to the use of electronic communication and
        storage of confidential information. The RCIC will use his/her best
        efforts to maintain a high degree of security for electronic
        communication and information storage.
      </p>

      <h2>8. Force Majeure</h2>
      <p>
        The RCIC&rsquo;s failure to perform any term of this Retainer
        Agreement, because of conditions beyond his/her control such as,
        but not limited to, governmental restrictions or subsequent
        legislation, war, strikes, or acts of God, shall not be deemed a
        breach of this Agreement.
      </p>

      <h2>9. Change Policy</h2>
      <p>
        The Client acknowledges that if the RCIC is asked to act on the
        Client&rsquo;s behalf on matters other than those outlined above in
        this Agreement, or because of a material change in the
        Client&rsquo;s circumstances, or because of material facts not
        disclosed at the outset of the application, or because of a change
        in government legislation regarding the processing of immigration
        or citizenship related applications, the Agreement can be modified
        accordingly.
      </p>

      <h2>10. Termination</h2>
      <ol type="a">
        <li>
          This Agreement is considered terminated upon completion of tasks
          identified under section 2 of this Agreement.
        </li>
        <li>
          This Agreement is considered terminated if material changes occur
          to the Client&rsquo;s application or eligibility, which make it
          impossible to proceed with services detailed in section 2 of this
          Agreement.
        </li>
      </ol>

      <h2>11. Discharge or Withdrawal of Representation</h2>
      <ol type="a">
        <li>
          The Client may discharge representation and terminate this
          Agreement, upon writing, at which time any outstanding fees or
          Disbursements will be refunded by the RCIC to the Client / any
          outstanding fees or Disbursements will be remitted by the Client
          to the RCIC.
        </li>
        <li>
          Pursuant to Article 11 of the Code of Professional Ethics, the
          RCIC may withdraw representation and terminate this Agreement,
          upon writing, provided withdrawal does not cause prejudice to the
          Client, at which time any outstanding fees or Disbursements will
          be refunded by the RCIC to the Client / any outstanding fees or
          Disbursements will be remitted by the Client to the RCIC.
        </li>
      </ol>

      <h2>12. Governing Law</h2>
      <p>
        This Agreement shall be governed by the laws in effect in the
        Province of Ontario, and the federal laws of Canada applicable
        therein and except for disputes pursuant to Section 6 hereof, any
        dispute with respect to the terms of this Agreement shall be
        decided by a court of competent jurisdiction within the Province of
        Ontario.
      </p>

      <h2>13. Miscellaneous</h2>
      <ol type="a">
        <li>
          The Client expressly authorizes the RCIC to act on his/her behalf
          to the extent of the specific functions which the RCIC was
          retained to perform, as per Section 2 hereof.
        </li>
        <li>
          This Agreement constitutes the entire agreement between the
          parties with respect to the subject matter hereof and supersedes
          all prior agreements, understandings, warranties,
          representations, negotiations and discussions, whether oral or
          written, of the parties except as specifically set forth herein.
        </li>
        <li>
          This Agreement shall be binding upon the parties hereto and their
          respective heirs, administrators, successors and permitted
          assigns.
        </li>
        <li>
          This Agreement may only be altered or amended when such changes
          are made in writing and executed by the parties hereto.
        </li>
        <li>
          The provisions of this Agreement shall be deemed severable. If
          any provision of this Agreement shall be held unenforceable by
          any court of competent jurisdiction, such provision shall be
          severed from this Agreement, and the remaining provisions shall
          remain in full force and effect.
        </li>
        <li>
          The headings utilized in this Agreement are for convenience only
          and are not to be construed in any way as additions to or
          limitations of the covenants and agreements contained in this
          Agreement.
        </li>
        <li>
          Each of the parties hereto shall do and execute or cause to be
          done or executed all such further and other things, acts, deeds,
          documents and assurances as may be necessary or reasonably
          required to carry out the intent and purpose of this Agreement
          fully and effectively.
        </li>
        <li>
          The Client acknowledges that he/she has had sufficient time to
          review this Agreement and has been given an opportunity to obtain
          independent legal advice and translation prior to the execution
          and delivery of this Agreement. In the event the Client did not
          seek independent legal advice prior to signing this Agreement,
          he/she did so voluntarily without any undue pressure and agrees
          that the failure to obtain independent legal advice shall not be
          used as a defense to the enforcement of obligations created by
          this Agreement.
        </li>
        <li>
          Furthermore, the Client acknowledges that he/she has received a
          copy of this Agreement and agrees to be bound by its terms.
        </li>
        <li>
          The Client acknowledges that he/she has requested that the
          Agreement be written in the English language.
        </li>
      </ol>

      <h2>14. Contact Information</h2>
      <table className="retainer-contact-table">
        <thead>
          <tr>
            <th>CLIENT</th>
            <th>RCIC</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div className="row">
                <span className="key">Given Name:</span>
                <span>{data.client_given_name}</span>
              </div>
              <div className="row">
                <span className="key">Last Name:</span>
                <span>{data.client_family_name}</span>
              </div>
              <div className="row">
                <span className="key">Address:</span>
                <span>{data.client_address}</span>
              </div>
              <div className="row">
                <span className="key">Cell phone Number:</span>
                <span>{data.client_phone}</span>
              </div>
              <div className="row">
                <span className="key">E-mail:</span>
                <span>{data.client_email}</span>
              </div>
            </td>
            <td>
              <div className="row">
                <span className="key">Given Name:</span>
                <span>{data.rcic_given_name}</span>
              </div>
              <div className="row">
                <span className="key">Family Name:</span>
                <span>{data.rcic_family_name}</span>
              </div>
              <div className="row">
                <span className="key">Address:</span>
                <span>{data.rcic_address}</span>
              </div>
              <div className="row">
                <span className="key">Telephone Number:</span>
                <span>{data.rcic_office_phone}</span>
              </div>
              <div className="row">
                <span className="key">Cell phone Number:</span>
                <span>{data.rcic_cell_phone}</span>
              </div>
              <div className="row">
                <span className="key">E-mail Address:</span>
                <span>{data.rcic_email}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <p>
        IN WITNESS THEREOF this Agreement has been duly executed by the
        parties hereto on the date first above written.
      </p>

      <div className="retainer-signatures">
        <div className="sig-cell">
          <div
            className={`sig-image${showClientSignature ? "" : " empty"}`}
          >
            {showClientSignature && data.client_signature_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.client_signature_image_url}
                alt="Client signature"
              />
            ) : null}
          </div>
          <div className="sig-caption">Signature of Client</div>
          <div className="sig-printed-name">
            {data.client_legal_name_full}
          </div>
        </div>
        <div className="sig-cell">
          <div className={`sig-image${showRcicSignature ? "" : " empty"}`}>
            {showRcicSignature ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={data.rcic_signature_image_url}
                alt="RCIC signature"
              />
            ) : null}
          </div>
          <div className="sig-caption">Signature of RCIC</div>
          <div className="sig-printed-name">{printedName}</div>
        </div>
      </div>

      <div className="retainer-footer">
        www.bigbangimmigration.com
        <br />
        info@bigbangimmigration.com
        <br />
        211-2390 Eglinton Avenue East
        <br />
        Toronto, ON M1K 2P5
        <br />
        Tel: +1 416-386-5351
      </div>
    </article>
  );
}

// Wraps the component in a full HTML document so it can be served as a
// standalone page or fed to Puppeteer via setContent. Returns the HTML
// string ready for transport. Server-only — uses react-dom/server.
export async function renderRetainerHtml(
  data: RetainerData,
  mode: RetainerMode,
  options?: { voidedAt?: string | null },
): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const body = renderToStaticMarkup(
    <RetainerDocument data={data} mode={mode} voidedAt={options?.voidedAt} />,
  );
  const title = `Retainer Agreement — ${data.case_number}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${RETAINER_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

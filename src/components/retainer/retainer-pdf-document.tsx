// react-pdf rendering of the firm's v1 retainer agreement. Parallel
// implementation of src/components/retainer/retainer-document.tsx —
// same data shape, same modes, same legal text verbatim — but built
// with @react-pdf/renderer primitives so the PDF generator no longer
// needs headless chromium on Vercel.
//
// Maintenance: this file and retainer-document.tsx render the same
// document on different surfaces (PDF vs on-screen). Any change to
// the retainer text or layout must be made in both places.

import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type {
  RetainerData,
  RetainerDocumentProps,
  RetainerMode,
} from "./retainer-document";

// ---------------------------------------------------------------------------
// Font registration
//
// PT Serif is an open-source Georgia substitute we already use for the
// on-screen retainer view. react-pdf needs the raw TTF URL (not the CSS
// import), so we point at Google's gstatic CDN. These URLs are stable
// across font versions; if Google ever ships a breaking change we'd
// bundle the TTFs under public/fonts/ and reference them through
// NEXT_PUBLIC_APP_URL instead.
//
// react-pdf fetches each variant once per cold start and caches it in
// /tmp for the warm pool, so the network cost amortises away.
// ---------------------------------------------------------------------------

Font.register({
  family: "PT Serif",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/ptserif/v18/EJRVQgYoZZY2vCFuvDFRxL6ddjb-.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/ptserif/v18/EJRSQgYoZZY2vCFuvAnt65qVXSr3pNNB.ttf",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/ptserif/v18/EJRTQgYoZZY2vCFuvAFTwrxBVwUtcRk.ttf",
      fontStyle: "italic",
      fontWeight: 400,
    },
  ],
});

// ---------------------------------------------------------------------------
// Formatters
//
// Local copies of fmtCad / fmtDate from retainer-document.tsx — the
// HTML component doesn't export them. Identical semantics so output
// matches byte-for-byte where currency / date strings appear.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stylesheet
//
// All metrics in pt. A4 at 72 DPI is 595×842 pt. Page margin top/bottom
// 20mm (≈57pt), left/right 15mm (≈42pt) — matches what the puppeteer
// page.pdf() options used.
// ---------------------------------------------------------------------------

const COLOR_TEXT = "#0f172a";
const COLOR_MUTED = "#475569";
const COLOR_BORDER = "#cbd5e1";
const COLOR_VOID = "#b91c1c";

const styles = StyleSheet.create({
  page: {
    fontFamily: "PT Serif",
    fontSize: 11,
    lineHeight: 1.45,
    color: COLOR_TEXT,
    paddingTop: 50,
    paddingBottom: 50,
    paddingLeft: 42,
    paddingRight: 42,
  },
  letterhead: {
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: COLOR_BORDER,
  },
  logo: {
    maxHeight: 60,
    objectFit: "contain",
  },
  h1: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 8,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    fontSize: 10,
    color: COLOR_MUTED,
  },
  metaLeft: { flex: 1 },
  metaRight: { flex: 1, textAlign: "right" },
  paragraph: {
    marginBottom: 8,
    textAlign: "justify",
  },
  // Inline emphasis on variables — bold + slightly darker.
  rtVar: { fontWeight: 700 },
  h2: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 6,
  },
  h3: {
    fontSize: 11.5,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
  },
  // Numbered list item: number column + content column.
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  listMarker: {
    width: 18,
  },
  listBody: {
    flex: 1,
    textAlign: "justify",
  },
  // Tables (fee + payment-schedule). Two-column flex.
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
  },
  tableRowTotal: {
    flexDirection: "row",
    paddingTop: 5,
    paddingBottom: 3,
    marginTop: 2,
    borderTopWidth: 1.5,
    borderTopColor: COLOR_TEXT,
  },
  tableLabel: { flex: 0.62 },
  tableValue: { flex: 0.38, textAlign: "right" },
  // Contact-info table.
  contactWrap: {
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
  },
  contactHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
    fontWeight: 700,
  },
  contactHeaderCell: { flex: 1 },
  contactBody: { flexDirection: "row" },
  contactCol: { flex: 1, padding: 8 },
  contactRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  contactKey: {
    width: 90,
    color: COLOR_MUTED,
    fontSize: 10,
  },
  contactValue: {
    flex: 1,
    fontSize: 10,
  },
  // Signature block.
  signaturesWrap: {
    flexDirection: "row",
    marginTop: 18,
    marginBottom: 18,
  },
  sigCell: {
    flex: 1,
    paddingHorizontal: 6,
    alignItems: "stretch",
  },
  sigImageBox: {
    height: 70,
    justifyContent: "flex-end",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLOR_TEXT,
  },
  sigImageBoxEmpty: {
    height: 70,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_BORDER,
    borderStyle: "dashed",
  },
  sigImage: {
    maxHeight: 60,
    objectFit: "contain",
  },
  sigCaption: {
    marginTop: 4,
    fontSize: 9,
    color: COLOR_MUTED,
    textAlign: "center",
  },
  sigPrintedName: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center",
  },
  // Footer.
  footer: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
    fontSize: 9,
    color: COLOR_MUTED,
    textAlign: "center",
    lineHeight: 1.4,
  },
  // Void banner (rendered above the document body when mode === "void").
  voidBanner: {
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLOR_VOID,
    backgroundColor: "#fef2f2",
    fontSize: 10,
    color: COLOR_VOID,
  },
  // Watermark — rendered absolutely over the page content. react-pdf
  // doesn't repeat children across pages automatically, so we drop one
  // stamp per page-break "anchor" via the wrap behaviour on Page.
  watermark: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    opacity: 0.08,
    transform: "rotate(-20deg)",
  },
  watermarkText: {
    fontSize: 110,
    fontWeight: 700,
    color: COLOR_VOID,
    letterSpacing: 6,
  },
});

// ---------------------------------------------------------------------------
// Re-usable atoms
// ---------------------------------------------------------------------------

function NumberedListItem({
  marker,
  children,
}: {
  marker: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.listMarker}>{marker}</Text>
      <View style={styles.listBody}>{children}</View>
    </View>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.contactRow}>
      <Text style={styles.contactKey}>{label}</Text>
      <Text style={styles.contactValue}>{value}</Text>
    </View>
  );
}

// Watermark stamps. The HTML version drops 5 stamps at fixed top
// percentages so at least one is visible on every page of a 5–8 page
// retainer. react-pdf's Page wraps content across pages but doesn't
// re-render absolutely-positioned children per page automatically, so
// we anchor to fixed top positions on the first page only.
//
// Practically: the watermark is decorative for void/preview modes —
// every page MAY not have a stamp, but the first 2 pages will. Good
// enough; the void banner at the top + the metadata change is the
// authoritative "this is void" signal.
const WATERMARK_TOPS = [80, 250, 420, 600, 780];

function Watermark({ text }: { text: string }) {
  return (
    <>
      {WATERMARK_TOPS.map((top) => (
        <View
          key={top}
          style={{ ...styles.watermark, top }}
          fixed
        >
          <Text style={styles.watermarkText}>{text}</Text>
        </View>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RetainerPdfDocument({
  data,
  mode,
  voidedAt,
}: RetainerDocumentProps) {
  const subtotal = data.quoted_fee_cad + data.hst_cad;
  const totalCost = subtotal + data.government_fee_cad;
  const dateOfSigning = fmtDate(data.date_of_signing);

  const watermarkText: string | null =
    mode === "preview"
      ? "DRAFT — NOT SIGNED"
      : mode === "void"
        ? "VOID"
        : null;

  const showClientSignature =
    (mode === "final" || mode === "void") &&
    Boolean(data.client_signature_image_url);
  const showRcicSignature =
    showClientSignature && Boolean(data.rcic_signature_image_url);
  const printedName = data.rcic_printed_name?.trim() || data.rcic_name;

  return (
    <Document
      title={`Retainer Agreement — ${data.case_number}`}
      author="Big Bang Immigration Consulting Inc."
    >
      <Page size="A4" style={styles.page} wrap>
        {watermarkText && <Watermark text={watermarkText} />}

        {mode === "void" && (
          <View style={styles.voidBanner}>
            <Text>
              <Text style={styles.rtVar}>
                This agreement has been voided.
              </Text>
              {voidedAt ? ` Voided on ${fmtDate(voidedAt)}.` : ""}
            </Text>
          </View>
        )}

        {data.letterhead_logo_url ? (
          <View style={styles.letterhead}>
            <Image src={data.letterhead_logo_url} style={styles.logo} />
          </View>
        ) : null}

        <Text style={styles.h1}>RETAINER AGREEMENT</Text>

        <View style={styles.meta}>
          <Text style={styles.metaLeft}>
            RCIC Membership Number:{" "}
            <Text style={styles.rtVar}>{data.rcic_membership_number}</Text>
          </Text>
          <Text style={styles.metaRight}>
            Client File Number:{" "}
            <Text style={styles.rtVar}>{data.case_number}</Text>
          </Text>
        </View>

        <Text style={styles.paragraph}>
          This Retainer Agreement is made this{" "}
          <Text style={styles.rtVar}>{dateOfSigning}</Text>, between RCIC{" "}
          <Text style={styles.rtVar}>{data.rcic_name}</Text> (the
          &ldquo;RCIC&rdquo;), located at{" "}
          <Text style={styles.rtVar}>{data.rcic_address}</Text>, and{" "}
          <Text style={styles.rtVar}>{data.client_legal_name_full}</Text> (the
          &ldquo;Client&rdquo;), located at{" "}
          <Text style={styles.rtVar}>{data.client_address}</Text>.
        </Text>

        <Text style={styles.paragraph}>
          WHEREAS the RCIC and the Client wish to enter into a written
          agreement which contains the agreed upon terms and conditions upon
          which the RCIC will provide his/her services to the Client.
        </Text>

        <Text style={styles.paragraph}>
          AND WHEREAS the RCIC is a member of The College of Immigration and
          Citizenship Consultants (the &ldquo;College&rdquo;), the regulator
          in Canada for immigration consultants.
        </Text>

        <Text style={styles.paragraph}>
          IN CONSIDERATION of the mutual covenants contained in this
          Agreement, the parties agree as follows:
        </Text>

        {/* 1. Definitions */}
        <Text style={styles.h2}>1. Definitions</Text>
        <Text style={styles.paragraph}>
          The terms &ldquo;Client&rdquo;, &ldquo;College&rdquo;,
          &ldquo;Disbursement&rdquo; and &ldquo;RCIC&rdquo; shall have the
          meaning given to such terms in the Retainer Agreement Regulation
          of the College.
        </Text>

        {/* 2. RCIC Responsibilities and Commitments */}
        <Text style={styles.h2}>2. RCIC Responsibilities and Commitments</Text>
        <Text style={styles.paragraph}>
          The Client asked the RCIC, and the RCIC has agreed, to act for the
          Client in the matter of{" "}
          <Text style={styles.rtVar}>{data.service_description}</Text> in
          Canada.
        </Text>
        <Text style={styles.paragraph}>
          In consideration of the fees paid and the matter stated above, the
          RCIC agrees to do the following:
        </Text>
        <NumberedListItem marker="1.">
          <Text>
            Advise the CLIENT with respect to current Canadian Immigration
            Laws / Regulations;
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="2.">
          <Text>
            Liaise between the Canadian Immigration / Border Authorities and
            the CLIENT;
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="3.">
          <Text>
            Collate the documents necessary in support of the application
            and advise the CLIENT as to which documents are required in
            support of the application;
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="4.">
          <Text>Prepare all forms and submissions;</Text>
        </NumberedListItem>
        <NumberedListItem marker="5.">
          <Text>
            Review, compile, and prepare case submissions and file with the
            relevant visa office;
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="6.">
          <Text>Keep CLIENT reasonably informed of case progress;</Text>
        </NumberedListItem>
        <NumberedListItem marker="7.">
          <Text>
            Prepare the CLIENT for any interview related to the application,
            if required;
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="8.">
          <Text>Answer all reasonable requests from the CLIENT for information;</Text>
        </NumberedListItem>
        <NumberedListItem marker="9.">
          <Text>
            Hold in strict confidence all information concerning the personal
            and business affairs of the CLIENT acquired during the
            professional relationship, and not disclose such information
            unless disclosure is expressly or impliedly authorized by the
            CLIENT, is required by law, or is otherwise permitted by the
            rules;
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="10.">
          <Text>
            Not disclose the fact of having been consulted or retained by the
            CLIENT unless the nature of the matter required such disclosure;
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="11.">
          <Text>
            Subject to being compelled by law or legal process, the Company
            shall preserve the CLIENT&rsquo;s confidential information even
            after the termination of the retainer, whether differences have
            arisen between the Company and the CLIENT;
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="12.">
          <Text>Monitor the case progress till the decision.</Text>
        </NumberedListItem>

        {/* 3. Client Responsibilities and Commitments */}
        <Text style={styles.h2}>3. Client Responsibilities and Commitments</Text>
        <NumberedListItem marker="1.">
          <Text>The Client must provide, upon request from the RCIC:</Text>
          <NumberedListItem marker="i.">
            <Text>All necessary documentation</Text>
          </NumberedListItem>
          <NumberedListItem marker="ii.">
            <Text>
              All documentation in English or French, or with an English or
              French translation
            </Text>
          </NumberedListItem>
          <NumberedListItem marker="iii.">
            <Text>Photo for advertisement after positive visa/permit decision</Text>
          </NumberedListItem>
        </NumberedListItem>
        <NumberedListItem marker="2.">
          <Text>
            The Client understands that he/she must be accurate and honest
            in the information he/she provides and that any inaccuracies may
            void this Agreement, or seriously affect the outcome of the
            application or the retention of any status he/she may obtain.
            The RCIC&rsquo;s obligations under the Retainer Agreement are
            null and void if the Client knowingly provides any inaccurate,
            misleading or false material information. The Client&rsquo;s
            financial obligations remain.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="3.">
          <Text>
            In the event Immigration, Refugees and Citizenship Canada (IRCC)
            or Employment and Social Development Canada (ESDC) should
            contact the Client directly, the Client is instructed to notify
            the RCIC immediately.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="4.">
          <Text>
            The Client is to immediately advise the RCIC of any change in
            marital, family, or civil status or change of physical address
            or contact information for any person included in the
            application.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="5.">
          <Text>
            In the event of a Joint Retainer Agreement, the Clients agree
            that the RCIC may share information among all clients, as
            required. Furthermore, if a conflict develops that cannot be
            resolved, the RCIC cannot continue to act for both or all the
            Clients and may have to withdraw completely.
          </Text>
        </NumberedListItem>

        {/* 4. Billing Method */}
        <Text style={styles.h2}>4. Billing Method</Text>
        <Text style={styles.paragraph}>
          The Client will be billed by flat fee. The details of this billing
          method are as follows:
        </Text>
        <View style={{ marginBottom: 10 }}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Fee:</Text>
            <Text style={styles.tableValue}>{fmtCad(data.quoted_fee_cad)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>HST (13%):</Text>
            <Text style={styles.tableValue}>{fmtCad(data.hst_cad)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Subtotal:</Text>
            <Text style={styles.tableValue}>{fmtCad(subtotal)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Government fees:</Text>
            <Text style={styles.tableValue}>
              {fmtCad(data.government_fee_cad)}
            </Text>
          </View>
          <View style={styles.tableRowTotal}>
            <Text style={{ ...styles.tableLabel, fontWeight: 700 }}>
              Total Cost (inclusive of tax):
            </Text>
            <Text style={{ ...styles.tableValue, fontWeight: 700 }}>
              {fmtCad(totalCost)}
            </Text>
          </View>
        </View>

        <Text style={styles.h3}>4.1. Payment Schedule</Text>
        <View style={{ marginBottom: 6 }}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>
              First Installment (Before starting an application):
            </Text>
            <Text style={styles.tableValue}>
              {fmtCad(data.first_installment_cad)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>
              Second Installment (During an application):
            </Text>
            <Text style={styles.tableValue}>
              {fmtCad(data.second_installment_cad)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Government fees:</Text>
            <Text style={styles.tableValue}>
              {fmtCad(data.government_fee_cad)}
            </Text>
          </View>
        </View>
        <Text style={styles.paragraph}>
          The above amount is to be paid by the Client and is subject to
          change upon mutual agreement of both parties.
        </Text>

        {/* 5. Refund Policy */}
        <Text style={styles.h2}>5. Refund Policy</Text>
        <Text style={styles.paragraph}>
          The Client acknowledges that the granting of a visa or status and
          the time required for processing this application is at the sole
          discretion of the government and not the RCIC. Furthermore, the
          Client acknowledges that fees are not refundable in the event of
          an application refusal.
        </Text>
        <Text style={styles.paragraph}>
          The Client agrees that the fees paid are for services indicated
          above. The Client agrees to pay the full agreed amount of this
          contract. If Client withdraws the application, the payment before
          the start of the application (
          <Text style={styles.rtVar}>
            {fmtCad(data.withdrawal_refund_floor_cad)}
          </Text>
          ) and earned fees will be non-refundable. In cases where the
          application is withdrawn, the balance due shall become payable
          forthwith.
        </Text>

        {/* 6. Dispute Resolution */}
        <Text style={styles.h2}>
          6. Dispute Resolution Related to the Code of Professional Ethics
        </Text>
        <Text style={styles.paragraph}>
          In the event of a dispute related to the Code of Professional
          Ethics, the Client and RCIC are to make every effort to resolve
          the matter between the two parties. In the event a resolution
          cannot be reached, the Client is to present the complaint in
          writing to the RCIC and allow 30 days to respond to the Client.
          In the event the dispute is still unresolved, the Client may
          follow the complaint and discipline procedure outlined by the
          Council on their website under the heading &ldquo;File a
          Complaint&rdquo;.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.rtVar}>NOTE:</Text> All complaint forms must
          be signed. CICC Contact Information:
        </Text>
        <Text style={styles.paragraph}>
          The College of Immigration and Citizenship Consultants (CICC){"\n"}
          5500 North Service Rd., Suite 1002{"\n"}
          Burlington, ON, L7L 6W6{"\n"}
          Toll free: 1-877-836-7543
        </Text>

        {/* 7. Confidentiality */}
        <Text style={styles.h2}>7. Confidentiality</Text>
        <Text style={styles.paragraph}>
          All information and documentation reviewed by the RCIC, required
          by IRCC and all other governing bodies, and used for the
          preparation of the application will not be divulged to any third
          party, other than agents and employees, without prior consent,
          except as demanded by law. The RCIC, and all agents and employees
          of the RCIC, are also bound by the confidentiality requirements
          of Article 8 of the Code of Professional Ethics.
        </Text>
        <Text style={styles.paragraph}>
          The Client agrees to the use of electronic communication and
          storage of confidential information. The RCIC will use his/her
          best efforts to maintain a high degree of security for electronic
          communication and information storage.
        </Text>

        {/* 8. Force Majeure */}
        <Text style={styles.h2}>8. Force Majeure</Text>
        <Text style={styles.paragraph}>
          The RCIC&rsquo;s failure to perform any term of this Retainer
          Agreement, because of conditions beyond his/her control such as,
          but not limited to, governmental restrictions or subsequent
          legislation, war, strikes, or acts of God, shall not be deemed a
          breach of this Agreement.
        </Text>

        {/* 9. Change Policy */}
        <Text style={styles.h2}>9. Change Policy</Text>
        <Text style={styles.paragraph}>
          The Client acknowledges that if the RCIC is asked to act on the
          Client&rsquo;s behalf on matters other than those outlined above
          in this Agreement, or because of a material change in the
          Client&rsquo;s circumstances, or because of material facts not
          disclosed at the outset of the application, or because of a
          change in government legislation regarding the processing of
          immigration or citizenship related applications, the Agreement
          can be modified accordingly.
        </Text>

        {/* 10. Termination */}
        <Text style={styles.h2}>10. Termination</Text>
        <NumberedListItem marker="1.">
          <Text>
            This Agreement is considered terminated upon completion of
            tasks identified under section 2 of this Agreement.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="2.">
          <Text>
            This Agreement is considered terminated if material changes
            occur to the Client&rsquo;s application or eligibility, which
            make it impossible to proceed with services detailed in section
            2 of this Agreement.
          </Text>
        </NumberedListItem>

        {/* 11. Discharge or Withdrawal */}
        <Text style={styles.h2}>11. Discharge or Withdrawal of Representation</Text>
        <NumberedListItem marker="1.">
          <Text>
            The Client may discharge representation and terminate this
            Agreement, upon writing, at which time any outstanding fees or
            Disbursements will be refunded by the RCIC to the Client / any
            outstanding fees or Disbursements will be remitted by the
            Client to the RCIC.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="2.">
          <Text>
            Pursuant to Article 11 of the Code of Professional Ethics, the
            RCIC may withdraw representation and terminate this Agreement,
            upon writing, provided withdrawal does not cause prejudice to
            the Client, at which time any outstanding fees or Disbursements
            will be refunded by the RCIC to the Client / any outstanding
            fees or Disbursements will be remitted by the Client to the
            RCIC.
          </Text>
        </NumberedListItem>

        {/* 12. Governing Law */}
        <Text style={styles.h2}>12. Governing Law</Text>
        <Text style={styles.paragraph}>
          This Agreement shall be governed by the laws in effect in the
          Province of Ontario, and the federal laws of Canada applicable
          therein and except for disputes pursuant to Section 6 hereof, any
          dispute with respect to the terms of this Agreement shall be
          decided by a court of competent jurisdiction within the Province
          of Ontario.
        </Text>

        {/* 13. Miscellaneous */}
        <Text style={styles.h2}>13. Miscellaneous</Text>
        <NumberedListItem marker="1.">
          <Text>
            The Client expressly authorizes the RCIC to act on his/her
            behalf to the extent of the specific functions which the RCIC
            was retained to perform, as per Section 2 hereof.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="2.">
          <Text>
            This Agreement constitutes the entire agreement between the
            parties with respect to the subject matter hereof and supersedes
            all prior agreements, understandings, warranties,
            representations, negotiations and discussions, whether oral or
            written, of the parties except as specifically set forth herein.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="3.">
          <Text>
            This Agreement shall be binding upon the parties hereto and
            their respective heirs, administrators, successors and
            permitted assigns.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="4.">
          <Text>
            This Agreement may only be altered or amended when such changes
            are made in writing and executed by the parties hereto.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="5.">
          <Text>
            The provisions of this Agreement shall be deemed severable. If
            any provision of this Agreement shall be held unenforceable by
            any court of competent jurisdiction, such provision shall be
            severed from this Agreement, and the remaining provisions shall
            remain in full force and effect.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="6.">
          <Text>
            The headings utilized in this Agreement are for convenience
            only and are not to be construed in any way as additions to or
            limitations of the covenants and agreements contained in this
            Agreement.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="7.">
          <Text>
            Each of the parties hereto shall do and execute or cause to be
            done or executed all such further and other things, acts,
            deeds, documents and assurances as may be necessary or
            reasonably required to carry out the intent and purpose of this
            Agreement fully and effectively.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="8.">
          <Text>
            The Client acknowledges that he/she has had sufficient time to
            review this Agreement and has been given an opportunity to
            obtain independent legal advice and translation prior to the
            execution and delivery of this Agreement. In the event the
            Client did not seek independent legal advice prior to signing
            this Agreement, he/she did so voluntarily without any undue
            pressure and agrees that the failure to obtain independent
            legal advice shall not be used as a defense to the enforcement
            of obligations created by this Agreement.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="9.">
          <Text>
            Furthermore, the Client acknowledges that he/she has received a
            copy of this Agreement and agrees to be bound by its terms.
          </Text>
        </NumberedListItem>
        <NumberedListItem marker="10.">
          <Text>
            The Client acknowledges that he/she has requested that the
            Agreement be written in the English language.
          </Text>
        </NumberedListItem>

        {/* 14. Contact Information */}
        <Text style={styles.h2}>14. Contact Information</Text>
        <View style={styles.contactWrap}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactHeaderCell}>CLIENT</Text>
            <Text style={styles.contactHeaderCell}>RCIC</Text>
          </View>
          <View style={styles.contactBody}>
            <View style={styles.contactCol}>
              <ContactRow label="Given Name:" value={data.client_given_name} />
              <ContactRow label="Last Name:" value={data.client_family_name} />
              <ContactRow label="Address:" value={data.client_address} />
              <ContactRow label="Cell phone:" value={data.client_phone} />
              <ContactRow label="E-mail:" value={data.client_email} />
            </View>
            <View style={styles.contactCol}>
              <ContactRow label="Given Name:" value={data.rcic_given_name} />
              <ContactRow label="Family Name:" value={data.rcic_family_name} />
              <ContactRow label="Address:" value={data.rcic_address} />
              <ContactRow label="Telephone:" value={data.rcic_office_phone} />
              <ContactRow label="Cell phone:" value={data.rcic_cell_phone} />
              <ContactRow label="E-mail:" value={data.rcic_email} />
            </View>
          </View>
        </View>

        <Text style={styles.paragraph}>
          IN WITNESS THEREOF this Agreement has been duly executed by the
          parties hereto on the date first above written.
        </Text>

        {/* Signature block — wrap=false keeps it on a single page. */}
        <View style={styles.signaturesWrap} wrap={false}>
          <View style={styles.sigCell}>
            <View
              style={
                showClientSignature
                  ? styles.sigImageBox
                  : styles.sigImageBoxEmpty
              }
            >
              {showClientSignature && data.client_signature_image_url ? (
                <Image
                  src={data.client_signature_image_url}
                  style={styles.sigImage}
                />
              ) : null}
            </View>
            <Text style={styles.sigCaption}>Signature of Client</Text>
            <Text style={styles.sigPrintedName}>
              {data.client_legal_name_full}
            </Text>
          </View>
          <View style={styles.sigCell}>
            <View
              style={
                showRcicSignature
                  ? styles.sigImageBox
                  : styles.sigImageBoxEmpty
              }
            >
              {showRcicSignature ? (
                <Image
                  src={data.rcic_signature_image_url}
                  style={styles.sigImage}
                />
              ) : null}
            </View>
            <Text style={styles.sigCaption}>Signature of RCIC</Text>
            <Text style={styles.sigPrintedName}>{printedName}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          www.bigbangimmigration.com{"\n"}
          info@bigbangimmigration.com{"\n"}
          211-2390 Eglinton Avenue East{"\n"}
          Toronto, ON M1K 2P5{"\n"}
          Tel: +1 416-386-5351
        </Text>
      </Page>
    </Document>
  );
}

// Re-export the types so the action layer can construct props without
// importing two files when this becomes the canonical PDF surface.
export type { RetainerData, RetainerMode, RetainerDocumentProps };

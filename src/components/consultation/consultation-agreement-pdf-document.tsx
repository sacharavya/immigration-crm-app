// PDF (archival) rendering of the Initial Consultation Agreement. Parallel to
// consultation-agreement-document.tsx — same data, same clauses (via
// consultationClauses) — built with @react-pdf/renderer so no headless
// chromium is needed. Any wording change lives in consultationClauses.

import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  consultationClauses,
  type ConsultationAgreementData,
} from "./consultation-agreement-document";

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
  ],
});

const s = StyleSheet.create({
  page: {
    fontFamily: "PT Serif",
    fontSize: 10.5,
    lineHeight: 1.5,
    color: "#1c1917",
    paddingHorizontal: 56,
    paddingVertical: 48,
  },
  center: { textAlign: "center" },
  title: { fontSize: 14, fontWeight: 700 },
  subtitle: { fontWeight: 700, marginBottom: 6 },
  p: { marginTop: 8 },
  subject: { marginVertical: 8, fontWeight: 700 },
  heading: { marginTop: 14, fontWeight: 700 },
  field: { marginTop: 2 },
  label: { fontWeight: 700 },
  bullet: { flexDirection: "row", marginTop: 6 },
  dot: { width: 12 },
  sigRow: { flexDirection: "row", marginTop: 40, gap: 32 },
  sigCol: { flex: 1 },
  sigImg: { height: 40, objectFit: "contain", marginBottom: 2 },
  sigLine: { borderTopWidth: 1, borderTopColor: "#292524", paddingTop: 2, fontSize: 9 },
  sigDate: { marginTop: 12, fontSize: 9, color: "#57534e" },
});

function LabeledField({ label, value }: { label: string; value: string }) {
  return (
    <Text style={s.field}>
      <Text style={s.label}>{label}: </Text>
      {value || "—"}
    </Text>
  );
}

export function ConsultationAgreementPdfDocument({
  data,
}: {
  data: ConsultationAgreementData;
}) {
  const { intro, governing, terms } = consultationClauses(data);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.center}>
          <Text style={s.title}>The Big Bang Immigration Consulting Inc</Text>
          <Text style={s.subtitle}>Initial Consultation Agreement</Text>
        </View>

        <Text style={s.p}>{intro}</Text>
        <Text style={s.subject}>{data.subject}</Text>
        <Text style={s.p}>{governing}</Text>

        <Text style={s.heading}>CLIENT INFORMATION</Text>
        <LabeledField label="Client Name" value={data.client_name} />
        <LabeledField label="Client Address" value={data.client_address} />
        <LabeledField label="Client Telephone number" value={data.client_phone} />
        <LabeledField label="Client email address" value={data.client_email} />

        <Text style={s.heading}>RCIC INFORMATION:</Text>
        <LabeledField label="RCIC Name" value={data.rcic_name} />
        <LabeledField label="RCIC Address" value={data.rcic_address} />
        <LabeledField label="RCIC Telephone no." value={data.rcic_phone} />
        <LabeledField label="RCIC Email" value={data.rcic_email} />

        <Text style={s.p}>
          Upon signing this agreement, the Client hereby agrees to following
          terms and conditions:
        </Text>
        {terms.map((t, i) => (
          <View key={i} style={s.bullet}>
            <Text style={s.dot}>•</Text>
            <Text style={{ flex: 1 }}>{t}</Text>
          </View>
        ))}

        <View style={s.sigRow}>
          <View style={s.sigCol}>
            {data.client_signature_image_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not HTML img
              <Image style={s.sigImg} src={data.client_signature_image_url} />
            ) : (
              <View style={{ height: 40 }} />
            )}
            <Text style={s.sigLine}>Client Signature</Text>
            <Text style={s.sigDate}>{data.signed_date ?? "Date (Month/Day/Year)"}</Text>
          </View>
          <View style={s.sigCol}>
            {data.rcic_signature_image_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not HTML img
              <Image style={s.sigImg} src={data.rcic_signature_image_url} />
            ) : (
              <View style={{ height: 40 }} />
            )}
            <Text style={s.sigLine}>RCIC</Text>
            <Text style={s.sigDate}>{data.signed_date ?? "Date (Month/Day/Year)"}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

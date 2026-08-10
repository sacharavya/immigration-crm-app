import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";

import type { ConsultationAgreementData } from "@/components/consultation/consultation-agreement-document";
import { ConsultationAgreementPdfDocument } from "@/components/consultation/consultation-agreement-pdf-document";
import { adminClient } from "@/lib/supabase/admin";

const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

type Admin = ReturnType<typeof adminClient>;

const RCIC_COLS =
  "first_name, last_name, rcic_membership_number, office_address, office_phone, cell_phone, email, signature_image_url, is_rcic, is_active, deleted_at";

type RcicRow = {
  first_name: string;
  last_name: string;
  rcic_membership_number: string | null;
  office_address: string | null;
  office_phone: string | null;
  cell_phone: string | null;
  email: string | null;
  signature_image_url: string | null;
  is_rcic: boolean;
  is_active: boolean;
  deleted_at: string | null;
};

function mapRcic(s: RcicRow) {
  return {
    name: `${s.first_name} ${s.last_name}`.trim(),
    membership: s.rcic_membership_number ?? "",
    address: s.office_address ?? "",
    phone: s.office_phone ?? s.cell_phone ?? "",
    email: s.email ?? "",
    signature: s.signature_image_url,
  };
}

// The RCIC of record for a consultation: the assigned staff member if they're
// an RCIC, otherwise the firm's sole RCIC (matches the retainer's fallback).
async function resolveRcic(supabase: Admin, assignedStaffId: string | null) {
  if (assignedStaffId) {
    const { data } = await supabase
      .schema("crm")
      .from("staff")
      .select(RCIC_COLS)
      .eq("id", assignedStaffId)
      .maybeSingle();
    const s = data as RcicRow | null;
    if (s?.is_rcic && s.is_active && !s.deleted_at) return mapRcic(s);
  }
  const { data: rows } = await supabase
    .schema("crm")
    .from("staff")
    .select(RCIC_COLS)
    .eq("is_rcic", true)
    .eq("is_active", true)
    .is("deleted_at", null)
    .limit(2);
  const list = (rows ?? []) as RcicRow[];
  return list.length === 1 ? mapRcic(list[0]) : null;
}

// Assemble the (unsigned) agreement content for an appointment. `at` is the
// signing timestamp so the document date matches when the client signed.
export async function loadConsultationAgreementData(
  appointmentId: string,
  at: Date,
): Promise<ConsultationAgreementData> {
  const supabase = adminClient();
  const { data: appt } = await supabase
    .schema("crm")
    .from("appointments")
    .select(
      "client_id, assigned_staff_id, snapshot_client_name, snapshot_client_email, snapshot_client_phone, fee_cad_at_booking",
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) throw new Error("Appointment not found");

  let clientAddress = "—";
  if (appt.client_id) {
    const { data: c } = await supabase
      .schema("crm")
      .from("clients")
      .select(
        "address_line1, address_line2, city, province_state, postal_code, country_code",
      )
      .eq("id", appt.client_id)
      .maybeSingle();
    if (c) {
      clientAddress =
        [
          c.address_line1,
          c.address_line2,
          [c.city, c.province_state].filter(Boolean).join(", "),
          [c.postal_code, c.country_code].filter(Boolean).join(" "),
        ]
          .filter((x) => x && x.trim() !== "")
          .join(", ") || "—";
    }
  }

  const rcic = await resolveRcic(supabase, appt.assigned_staff_id);
  const fee =
    appt.fee_cad_at_booking != null ? Number(appt.fee_cad_at_booking) : null;

  return {
    agreement_date: format(at, "d 'day of' MMMM yyyy"),
    subject: "Permanent Resident Pathway to Canada",
    client_name: appt.snapshot_client_name,
    client_address: clientAddress,
    client_phone: appt.snapshot_client_phone ?? "—",
    client_email: appt.snapshot_client_email,
    rcic_name: rcic?.name ?? "",
    rcic_membership_number: rcic?.membership ?? "",
    rcic_address: rcic?.address ?? "",
    rcic_phone: rcic?.phone ?? "",
    rcic_email: rcic?.email ?? "",
    fee_line: fee != null && fee > 0 ? `${cad.format(fee)} (inclusive of HST)` : null,
    rcic_signature_image_url: rcic?.signature ?? null,
    signed_date: format(at, "MM/dd/yyyy"),
  };
}

export async function renderConsultationAgreementPdf(
  data: ConsultationAgreementData,
): Promise<Buffer> {
  return renderToBuffer(<ConsultationAgreementPdfDocument data={data} />);
}

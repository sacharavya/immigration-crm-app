// Server-side helper that loads a retainer + its related rows, builds
// the RetainerData object, and produces a PDF Buffer. Used by:
//   - the case detail Retainer tab "Generate PDF" button (RET-4)
//   - the case detail "Save to OneDrive" backup button (90a4aea)
//   - the public signing page submit handler (RET-5+)
//   - the /api/render-retainer-pdf route handler
//   - the void-retainer + download paths
//
// Uses the Supabase service-role client so it works for the public
// signing flow (no logged-in staff). Callers that should be auth-gated
// must check permissions themselves before invoking this.
//
// Vercel: this runs in the Node.js runtime. @react-pdf/renderer is
// pure JavaScript (no native binary, no chromium) so cold start is
// sub-second; the previous puppeteer + @sparticuz/chromium pipeline
// (~2-3s cold start, ~50 MB function-bundle overhead, fragile font
// handling) was retired in favour of this.

import { renderToBuffer } from "@react-pdf/renderer";
import { adminClient } from "@/lib/supabase/admin";

import { RetainerPdfDocument } from "@/components/retainer/retainer-pdf-document";
import type { RetainerData } from "@/components/retainer/retainer-document";
import { splitLegalName } from "@/lib/clients/name";
import { getLetterheadLogoDataUrl } from "@/lib/retainer/logo";
import { resolveServiceLabel } from "@/lib/retainer/service-label";

export class RetainerRenderError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "rcic_signature_missing"
      | "data_incomplete"
      | "chromium_launch_failed"
      | "pdf_generation_failed",
    message: string,
  ) {
    super(message);
    this.name = "RetainerRenderError";
  }
}


/**
 * Loads a retainer + its related case/client/RCIC and assembles the
 * RetainerData object the document component expects. Throws a typed
 * RetainerRenderError so callers can surface the right HTTP status.
 *
 * When `requireSignature` is false the function tolerates an absent
 * RCIC signature (returns an empty string for the URL) so the case
 * detail Retainer tab can still render a preview before the RCIC has
 * set up their signature. Default true — the PDF + signing flows
 * always need the signature.
 */
export async function loadRetainerData(
  retainerId: string,
  options: { requireSignature?: boolean } = {},
): Promise<RetainerData> {
  const requireSignature = options.requireSignature ?? true;
  const supabase = adminClient();

  const { data: retainer } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select(
      `
        id,
        case_id,
        status,
        signed_at,
        client_signature_image_url,
        quoted_fee_cad_at_signing,
        government_fee_cad,
        first_installment_cad,
        second_installment_cad,
        hst_cad,
        withdrawal_refund_floor_cad,
        service_description,
        rcic_id,
        client_legal_name_full_at_signing,
        client_given_names_at_signing,
        client_family_name_at_signing,
        client_address_at_signing,
        client_email_at_signing,
        client_phone_at_signing,
        rcic_name_at_signing,
        rcic_given_name_at_signing,
        rcic_family_name_at_signing,
        rcic_membership_number_at_signing,
        rcic_address_at_signing,
        rcic_phone_at_signing,
        rcic_office_phone_at_signing,
        rcic_cell_phone_at_signing,
        rcic_email_at_signing,
        rcic_signature_image_url_at_signing,
        rcic_printed_name_at_signing
      `,
    )
    .eq("id", retainerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!retainer) {
    throw new RetainerRenderError("not_found", "Retainer not found");
  }

  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select(
      `
        id,
        case_number,
        assigned_rcic,
        client_id,
        service_type_id,
        quoted_fee_cad,
        retainer_minimum_cad,
        government_fee_cad
      `,
    )
    .eq("id", retainer.case_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) {
    throw new RetainerRenderError("not_found", "Case not found");
  }

  // Resolve which staff member is the RCIC of record on this retainer:
  //   1. retainer.rcic_id (set explicitly in the Retainer tab)
  //   2. fall back to cases.assigned_rcic IF that staff has is_rcic=true
  //   3. fall back to the firm's only is_rcic=true staff if there is exactly one
  //   4. data_incomplete error otherwise
  const rcicStaffId =
    retainer.rcic_id ??
    (await resolveRcicStaffId(supabase, caseRow.assigned_rcic));

  const [{ data: client }, { data: rcic }, serviceLabel] =
    await Promise.all([
      supabase
        .schema("crm")
        .from("clients")
        .select(
          "legal_name_full, given_names, family_name, address_line1, address_line2, city, province_state, postal_code, country_code, email, phone_primary",
        )
        .eq("id", caseRow.client_id)
        .is("deleted_at", null)
        .maybeSingle(),
      rcicStaffId
        ? supabase
            .schema("crm")
            .from("staff")
            .select(
              "id, first_name, last_name, email, signature_image_url, printed_name_for_signature, is_rcic, rcic_membership_number, office_address, office_phone, cell_phone",
            )
            .eq("id", rcicStaffId)
            .is("deleted_at", null)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      resolveServiceLabel(supabase, caseRow.service_type_id),
    ]);

  if (!client) {
    throw new RetainerRenderError(
      "data_incomplete",
      "Client record not found for this case",
    );
  }

  // Client completeness gate — a lead created from an appointment
  // booking will only have name + email + phone. Missing address or
  // identity fields produce a retainer full of blanks.
  if (requireSignature) {
    const missing: string[] = [];
    if (!client.legal_name_full?.trim()) missing.push("full legal name");
    if (!client.given_names?.trim()) missing.push("given name");
    if (!client.family_name?.trim()) missing.push("family name");
    if (!client.email?.trim()) missing.push("email");
    if (!client.phone_primary?.trim()) missing.push("phone");
    if (!client.address_line1?.trim()) missing.push("address");
    if (!client.city?.trim()) missing.push("city");
    if (!client.province_state?.trim()) missing.push("province");
    if (!client.postal_code?.trim()) missing.push("postal code");
    if (missing.length > 0) {
      throw new RetainerRenderError(
        "data_incomplete",
        `Client profile is incomplete — missing: ${missing.join(", ")}. Update the client's personal details before generating the retainer.`,
      );
    }
  }

  // RCIC absence / mis-flagging is fatal only when the caller demands a
  // valid signature (PDF generation, public signing). For previews
  // (requireSignature=false) we render placeholders so the Retainer
  // tab can show the picker and let staff configure things.
  if (requireSignature) {
    if (!rcic) {
      throw new RetainerRenderError(
        "data_incomplete",
        "No RCIC assigned to this retainer. Pick one in the case detail Retainer tab.",
      );
    }
    if (!rcic.is_rcic) {
      throw new RetainerRenderError(
        "data_incomplete",
        `${rcic.first_name} ${rcic.last_name} is not flagged as an RCIC. Update their staff record or pick a different RCIC.`,
      );
    }
  }
  if (rcic && !rcic.signature_image_url && requireSignature) {
    throw new RetainerRenderError(
      "rcic_signature_missing",
      "Assigned RCIC has not set up their signature. Ask them to visit Settings → My signature.",
    );
  }

  const clientAddress = [
    client.address_line1,
    client.address_line2,
    [client.city, client.province_state].filter(Boolean).join(", "),
    [client.postal_code, client.country_code].filter(Boolean).join(" "),
  ]
    .filter((s) => s && s.trim() !== "")
    .join(", ")
    .trim();

  // Snapshot fee fields are populated when the retainer is sent or
  // signed (RET-5). Until then they're null on the row, so fall back to
  // the case's live values for preview rendering.
  const quoted =
    retainer.quoted_fee_cad_at_signing !== null
      ? Number(retainer.quoted_fee_cad_at_signing)
      : Number(caseRow.quoted_fee_cad);
  const govFee =
    retainer.government_fee_cad !== null
      ? Number(retainer.government_fee_cad)
      : caseRow.government_fee_cad !== null
        ? Number(caseRow.government_fee_cad)
        : 0;
  // HST is 13% of the quoted (pre-tax) fee unless explicitly overridden
  // on the retainer. Subtotal = quoted + hst. Government fees are
  // listed separately and are NOT in the HST base (gov fees are
  // tax-exempt) and NOT split into the installments (they go straight
  // to IRCC).
  const hst =
    retainer.hst_cad !== null
      ? Number(retainer.hst_cad)
      : Math.round(quoted * 0.13 * 100) / 100;

  // Installment split. Stored columns (first_installment_cad,
  // second_installment_cad, retainer_minimum_cad) hold PRE-TAX
  // service-fee portions — the case wizard's RetainerDetailsForm
  // validates "first + second = quoted_fee" (pre-tax). We then
  // distribute HST proportionally across the two installments so the
  // PAYMENT SCHEDULE in the PDF actually adds up to the "Total Cost
  // (inclusive of tax)" line. Previously the displayed installments
  // were pre-tax while the total was post-tax, leaving a phantom HST
  // gap (e.g. $250 + $250 + $255 gov = $755, total said $820).
  //
  // Pre-tax distribution:
  //   (a) Full fee upfront (retainer_minimum_cad >= quoted): pretax
  //       first = quoted, second = 0.
  //   (b) Partial upfront (retainer_minimum_cad < quoted): pretax
  //       first = the entered amount, second = quoted - first.
  //   (c) Nothing set: 50/50 split of quoted.
  // Explicit overrides on retainer.first/second_installment_cad win.
  //
  // HST share = (pretax_portion / quoted) * total_hst, rounded to
  // cents. Second is computed as (hst - first_share) to absorb any
  // rounding drift so first + second always = hst exactly.
  //
  // Withdrawal refund floor mirrors the first installment by default
  // (matches the .docx clause "the payment before the start of the
  // application is non-refundable").
  const caseRetainerMin =
    caseRow.retainer_minimum_cad !== null
      ? Number(caseRow.retainer_minimum_cad)
      : null;
  let firstPretax: number;
  if (retainer.first_installment_cad !== null) {
    firstPretax = Number(retainer.first_installment_cad);
  } else if (caseRetainerMin === null) {
    firstPretax = Math.round(quoted * 0.5 * 100) / 100;
  } else if (caseRetainerMin >= quoted) {
    firstPretax = quoted;
  } else {
    firstPretax = caseRetainerMin;
  }
  const secondPretax =
    retainer.second_installment_cad !== null
      ? Number(retainer.second_installment_cad)
      : Math.max(0, Math.round((quoted - firstPretax) * 100) / 100);

  // Distribute HST proportionally. Guard against quoted=0 (zero-fee
  // promo / pro bono) — in that case the entire HST (which would
  // also be 0 under normal flow) falls to second.
  const firstHstShare =
    quoted > 0
      ? Math.round((firstPretax / quoted) * hst * 100) / 100
      : 0;
  const secondHstShare = Math.max(
    0,
    Math.round((hst - firstHstShare) * 100) / 100,
  );

  const firstInst =
    Math.round((firstPretax + firstHstShare) * 100) / 100;
  const secondInst =
    Math.round((secondPretax + secondHstShare) * 100) / 100;
  const withdrawalFloor =
    retainer.withdrawal_refund_floor_cad !== null
      ? Number(retainer.withdrawal_refund_floor_cad)
      : firstInst;

  // The retainer reflects LIVE client/RCIC records until it is signed by both
  // parties; only then does the *_at_signing snapshot freeze the document.
  // Snapshots are written at send time, so gating on signed_at (not merely
  // "past sent") is what lets a corrected RCIC name still show pre-signature.
  const isSigned = retainer.signed_at !== null;
  const pick = <T,>(snapshot: T | null | undefined, live: T): T =>
    isSigned && snapshot != null ? snapshot : live;

  const liveRcicName = rcic
    ? `${rcic.first_name} ${rcic.last_name}`.trim()
    : "[RCIC not selected]";
  const liveRcicPhone = rcic?.cell_phone ?? rcic?.office_phone ?? "";

  const data: RetainerData = {
    case_number: caseRow.case_number,
    service_description:
      retainer.service_description ?? serviceLabel ?? "the application",

    client_legal_name_full: pick(
      retainer.client_legal_name_full_at_signing,
      client.legal_name_full,
    ),
    // Fall back to splitLegalName when the client row carries a full
    // name but no first/last split (legacy clients created before the
    // server-side derive in createClientStandalone). Keeps the
    // retainer from rendering blank "First Name:" and "Last Name:"
    // fields when only the legal_name_full was captured.
    client_given_name: pick(
      retainer.client_given_names_at_signing,
      client.given_names ??
        splitLegalName(client.legal_name_full).given_names ??
        "",
    ),
    client_family_name: pick(
      retainer.client_family_name_at_signing,
      client.family_name ??
        splitLegalName(client.legal_name_full).family_name ??
        "",
    ),
    client_address: pick(retainer.client_address_at_signing, clientAddress || "—"),
    client_email: pick(retainer.client_email_at_signing, client.email ?? ""),
    client_phone: pick(retainer.client_phone_at_signing, client.phone_primary ?? ""),

    rcic_name: pick(retainer.rcic_name_at_signing, liveRcicName),
    rcic_given_name: pick(retainer.rcic_given_name_at_signing, rcic?.first_name ?? ""),
    rcic_family_name: pick(retainer.rcic_family_name_at_signing, rcic?.last_name ?? ""),
    rcic_membership_number: pick(
      retainer.rcic_membership_number_at_signing,
      rcic?.rcic_membership_number ?? "",
    ),
    rcic_address: pick(retainer.rcic_address_at_signing, rcic?.office_address ?? ""),
    rcic_phone: pick(retainer.rcic_phone_at_signing, liveRcicPhone),
    rcic_office_phone: pick(
      retainer.rcic_office_phone_at_signing,
      rcic?.office_phone ?? "",
    ),
    rcic_cell_phone: pick(retainer.rcic_cell_phone_at_signing, rcic?.cell_phone ?? ""),
    rcic_email: pick(retainer.rcic_email_at_signing, rcic?.email ?? ""),
    rcic_signature_image_url: pick(
      retainer.rcic_signature_image_url_at_signing,
      rcic?.signature_image_url ?? "",
    ),
    rcic_printed_name: pick(
      retainer.rcic_printed_name_at_signing,
      rcic?.printed_name_for_signature ?? null,
    ),

    quoted_fee_cad: quoted,
    government_fee_cad: govFee,
    first_installment_cad: firstInst,
    second_installment_cad: secondInst,
    hst_cad: hst,
    withdrawal_refund_floor_cad: withdrawalFloor,

    date_of_signing: retainer.signed_at,
    client_signature_image_url: retainer.client_signature_image_url,

    letterhead_logo_url: getLetterheadLogoDataUrl(),
  };

  return data;
}

// Resolves the staff id of the RCIC who should appear on the retainer
// when the retainer doesn't yet have an explicit rcic_id set. Prefers
// the case's assigned_rcic if that staff is flagged is_rcic; otherwise
// falls back to the firm's only is_rcic=true staff. Returns null if
// neither path resolves (the caller surfaces a data_incomplete error).
async function resolveRcicStaffId(
  supabase: ReturnType<typeof adminClient>,
  assignedStaffId: string,
): Promise<string | null> {
  const { data: assigned } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, is_rcic")
    .eq("id", assignedStaffId)
    .is("deleted_at", null)
    .maybeSingle();
  if (assigned?.is_rcic) return assigned.id;

  const { data: rcicStaff } = await supabase
    .schema("crm")
    .from("staff")
    .select("id")
    .eq("is_rcic", true)
    .eq("is_active", true)
    .is("deleted_at", null)
    .limit(2);
  if (rcicStaff && rcicStaff.length === 1) return rcicStaff[0].id;
  return null;
}

// Browser-launch helpers (localChromePath, launchBrowser) lived here in
// the puppeteer + @sparticuz/chromium era. They were deleted when the
// pipeline switched to @react-pdf/renderer — pure JavaScript, no
// browser to launch, no binary to locate.

/**
 * Loads the retainer, renders the HTML, and produces a PDF Buffer.
 * Defaults to mode='final' — the signing page uses a different
 * flow that overlays a pad on the screen view. Pass mode='void' to
 * generate the voided-copy PDF (VOID watermark + voided-on banner).
 */
export async function renderRetainerPdf(
  retainerId: string,
  options?: {
    mode?: "final" | "void";
    voidedAt?: string | null;
  },
): Promise<Buffer> {
  const mode = options?.mode ?? "final";
  // Void mode renders signatures-as-captured, but the "data complete"
  // gates inside loadRetainerData (RCIC + signature requirements) only
  // make sense for the final/signed path. Pass requireSignature=false
  // so a retainer voided from draft state can still produce a PDF.
  const data = await loadRetainerData(retainerId, {
    requireSignature: mode === "final",
  });

  // @react-pdf/renderer takes the React tree and returns a Buffer
  // directly — no browser, no HTML stringification, no font.ready
  // race. PT Serif is registered inside the PDF component via
  // Font.register(), fetched once per cold start, cached in /tmp.
  try {
    return await renderToBuffer(
      <RetainerPdfDocument
        data={data}
        mode={mode}
        voidedAt={options?.voidedAt}
      />,
    );
  } catch (err) {
    console.error("[renderRetainerPdf] pdf generation failed:", err);
    throw new RetainerRenderError(
      "pdf_generation_failed",
      err instanceof Error ? err.message : "PDF generation failed",
    );
  }
}

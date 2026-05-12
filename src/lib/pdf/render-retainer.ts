// Server-side helper that loads a retainer + its related rows, builds
// the RetainerData object, renders the HTML, and produces a PDF Buffer
// via Puppeteer. Used by:
//   - the case detail Retainer tab "Generate PDF" button (RET-4)
//   - the public signing page submit handler (RET-5+)
//   - the /api/render-retainer-pdf route handler
//
// Uses the Supabase service-role client so it works for the public
// signing flow (no logged-in staff). Callers that should be auth-gated
// must check permissions themselves before invoking this.
//
// Vercel: this MUST run in the Node.js runtime (not Edge) — Chromium
// can't run on Edge. The route handler exports `runtime = 'nodejs'`.
//
// Cold start: first invocation in a warm function takes ~2-3s for
// Chromium to launch; subsequent calls in the same instance are much
// faster. Document this so callers know to show a "Generating..."
// state.

import { createClient as createServiceClient } from "@supabase/supabase-js";

import {
  renderRetainerHtml,
  type RetainerData,
} from "@/components/retainer/retainer-document";
import { getLetterheadLogoDataUrl } from "@/lib/retainer/logo";
import { resolveServiceLabel } from "@/lib/retainer/service-label";
import type { Database } from "@/lib/supabase/types";

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

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service role not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.",
    );
  }
  return createServiceClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
  // on the retainer. Subtotal = quoted + hst — this is what the
  // installments add up to. Government fees are listed separately and
  // are NOT split into the installments (they go straight to IRCC).
  const hst =
    retainer.hst_cad !== null
      ? Number(retainer.hst_cad)
      : Math.round(quoted * 0.13 * 100) / 100;
  const subtotal = Math.round((quoted + hst) * 100) / 100;

  // Installment split — three cases, all summing to the subtotal:
  //   (a) Full fee upfront (retainer_minimum_cad >= quoted): first =
  //       subtotal, second = 0. Tax is rolled into the single payment.
  //   (b) Partial upfront (retainer_minimum_cad < quoted): first =
  //       the entered amount (pre-tax), second = subtotal − first.
  //       Tax lands on the second installment.
  //   (c) Nothing set: 50/50 split of the subtotal across both
  //       installments.
  // Explicit overrides on the retainer columns win over all of this.
  // Withdrawal refund floor mirrors the first installment by default
  // (matches the .docx clause "the payment before the start of the
  // application is non-refundable").
  const caseRetainerMin =
    caseRow.retainer_minimum_cad !== null
      ? Number(caseRow.retainer_minimum_cad)
      : null;
  let firstInst: number;
  if (retainer.first_installment_cad !== null) {
    firstInst = Number(retainer.first_installment_cad);
  } else if (caseRetainerMin === null) {
    firstInst = Math.round(subtotal * 0.5 * 100) / 100;
  } else if (caseRetainerMin >= quoted) {
    firstInst = subtotal;
  } else {
    firstInst = caseRetainerMin;
  }
  const secondInst =
    retainer.second_installment_cad !== null
      ? Number(retainer.second_installment_cad)
      : Math.max(0, Math.round((subtotal - firstInst) * 100) / 100);
  const withdrawalFloor =
    retainer.withdrawal_refund_floor_cad !== null
      ? Number(retainer.withdrawal_refund_floor_cad)
      : firstInst;

  // Snapshot columns are populated at sendRetainerForSignature time and
  // never re-read after. For draft / expired retainers, snapshots may
  // be null — fall through to live data. For anything past 'sent',
  // prefer snapshot so post-sign edits to clients/staff don't
  // retroactively rewrite the agreement.
  const liveRcicName = rcic
    ? `${rcic.first_name} ${rcic.last_name}`.trim()
    : "[RCIC not selected]";
  const liveRcicPhone = rcic?.cell_phone ?? rcic?.office_phone ?? "";

  const data: RetainerData = {
    case_number: caseRow.case_number,
    service_description:
      retainer.service_description ?? serviceLabel ?? "the application",

    client_legal_name_full:
      retainer.client_legal_name_full_at_signing ?? client.legal_name_full,
    client_given_name:
      retainer.client_given_names_at_signing ?? client.given_names ?? "",
    client_family_name:
      retainer.client_family_name_at_signing ?? client.family_name ?? "",
    client_address:
      retainer.client_address_at_signing ?? (clientAddress || "—"),
    client_email: retainer.client_email_at_signing ?? client.email ?? "",
    client_phone:
      retainer.client_phone_at_signing ?? client.phone_primary ?? "",

    rcic_name: retainer.rcic_name_at_signing ?? liveRcicName,
    rcic_given_name:
      retainer.rcic_given_name_at_signing ?? rcic?.first_name ?? "",
    rcic_family_name:
      retainer.rcic_family_name_at_signing ?? rcic?.last_name ?? "",
    rcic_membership_number:
      retainer.rcic_membership_number_at_signing ??
      rcic?.rcic_membership_number ??
      "",
    rcic_address:
      retainer.rcic_address_at_signing ?? rcic?.office_address ?? "",
    rcic_phone: retainer.rcic_phone_at_signing ?? liveRcicPhone,
    rcic_office_phone:
      retainer.rcic_office_phone_at_signing ?? rcic?.office_phone ?? "",
    rcic_cell_phone:
      retainer.rcic_cell_phone_at_signing ?? rcic?.cell_phone ?? "",
    rcic_email: retainer.rcic_email_at_signing ?? rcic?.email ?? "",
    rcic_signature_image_url:
      retainer.rcic_signature_image_url_at_signing ??
      rcic?.signature_image_url ??
      "",
    rcic_printed_name:
      retainer.rcic_printed_name_at_signing ??
      rcic?.printed_name_for_signature ??
      null,

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

// Resolve the path to the local Chrome/Chromium binary in dev. The
// production path goes through @sparticuz/chromium below.
function localChromePath(): string | undefined {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }
  if (process.platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  // Linux fallback for local CI / containers; npx/dev workflows typically
  // have one of these on PATH.
  if (process.platform === "linux") {
    return "/usr/bin/google-chrome";
  }
  return undefined;
}

async function launchBrowser() {
  const isLambda = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
  );

  const puppeteer = (await import("puppeteer-core")).default;

  if (isLambda) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath = localChromePath();
  if (!executablePath) {
    throw new RetainerRenderError(
      "chromium_launch_failed",
      "Could not find a local Chrome/Chromium binary. Set CHROME_EXECUTABLE_PATH.",
    );
  }
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

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
  const html = await renderRetainerHtml(data, mode, {
    voidedAt: options?.voidedAt,
  });

  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  try {
    try {
      browser = await launchBrowser();
    } catch (err) {
      console.error("[renderRetainerPdf] chromium launch failed:", err);
      throw new RetainerRenderError(
        "chromium_launch_failed",
        err instanceof Error ? err.message : "Chromium launch failed",
      );
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
      printBackground: true,
    });

    return Buffer.from(pdf);
  } catch (err) {
    if (err instanceof RetainerRenderError) throw err;
    console.error("[renderRetainerPdf] pdf generation failed:", err);
    throw new RetainerRenderError(
      "pdf_generation_failed",
      err instanceof Error ? err.message : "PDF generation failed",
    );
  } finally {
    await browser?.close().catch(() => {});
  }
}

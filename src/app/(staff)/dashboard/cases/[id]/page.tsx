import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  chipInputFromViewRow,
  computeActionChip,
} from "@/lib/cases/action-chip";
import {
  sumPendingVerification,
  sumVerifiedPayments,
} from "@/lib/payments/verified";
import { formatUci } from "@/lib/clients/humanize";
import { createClient } from "@/lib/supabase/server";

import { getIntakeProgress } from "@/lib/intake/completeness";
import { loadRetainerData } from "@/lib/pdf/render-retainer";

import { CaseTeamPanel } from "./_components/case-team-panel";
import {
  type CaseTeam,
  type StaffOption,
  type TeamMember,
} from "./_components/team";
import { CaseTabs, VALID_TABS, type Tab } from "./_components/case-tabs";
import { IntakeBanner } from "./_components/intake-banner";
import { RetainerTab } from "./_components/retainer-tab";
import { ShareLinkDialog } from "./_components/share-link-dialog";
import {
  itemReceived,
  type FileRow,
  type LatestDoc,
} from "./_components/document-checklist";
import { ChecklistBoard } from "./_components/checklist-board";
import { fetchAllowsMultipleByCode } from "@/lib/files/template-docs";
import {
  AdditionalDocumentsSection,
  type AdditionalDocsGroup,
} from "./_components/additional-documents-section";
import { FormFillsSection } from "./_components/form-fills-section";
import { GenerateFormDialog } from "./_components/generate-form-dialog";
import { NewAppointmentDialog } from "../../appointments/_components/new-appointment-dialog";
import type {
  AppointmentRow,
  AppointmentTypeOption,
  LocationType,
} from "../../appointments/_components/types";
import { UpcomingAppointmentsCard } from "../../appointments/_components/upcoming-appointments-card";

import { BiometricsCard } from "./_components/biometrics-card";
import { OneDriveCard } from "./_components/onedrive-card";
import {
  PaymentsTab,
  type PaymentRow as PaymentTabRow,
} from "./_components/payments-tab";
import { PaymentBreakdown } from "./_components/payment-breakdown";
import { NotifyForPaymentTrigger } from "./_components/notify-for-payment-trigger";
import { RecordPaymentTrigger } from "./_components/record-payment-trigger";
import {
  TimelineList,
  type TimelineEvent,
} from "./_components/timeline-panel";
import { AssignedFact } from "./_components/assigned-fact";
import { AtRiskBanner } from "./_components/at-risk-banner";
import { CaseOverflowMenu } from "./_components/case-overflow-menu";
import { CasePhaseTracker } from "./_components/case-phase-tracker";
import { ImmigrationStatusFact } from "./_components/immigration-status-fact";
import {
  RelatedPeopleRow,
  type RelatedParty,
} from "./_components/related-people-row";
import { SubStatusRow } from "./_components/sub-status-row";
import { hstForRetainer } from "@/lib/cases/fee-totals";
import { deriveSubmissionRisk } from "@/lib/cases/submission-risk";
import {
  IMMIGRATION_STATUS_LABELS,
  type ImmigrationStatusType,
} from "@/lib/validators/client-immigration";

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});
const formatCad = (n: number) => cadFormatter.format(n);

// Pretty-print a North American number, mirroring the clients worklist. Falls
// back to the raw string for anything that isn't a clean 10/11-digit number.
function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// One cell of the key-facts strip: a small subtle label over its value. The
// strip is a hairline grid (gap-px on a border-coloured background) so each
// fact is separated by a divider that fills the width.
function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle-foreground)]">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// Always re-render server-side. Without this, navigating between
// /dashboard/cases and /dashboard/cases/[id] can serve a cached copy
// from before related rows (retainer, intake) existed. Server-rendered
// retainers / cases / staff state can change between visits.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; folderPending?: string }>;
};

export default async function CasePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const requestedTab: Tab | null = (VALID_TABS as readonly string[]).includes(
    sp.tab ?? "",
  )
    ? (sp.tab as Tab)
    : null;
  const folderPending = sp.folderPending === "1";

  const me = await getStaff();
  const canEditCase = me ? staffCan(me, "edit_cases") : false;

  const supabase = await createClient();

  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!caseRow) notFound();

  // RET-4: load the retainer status so we can lock tabs when unsigned.
  // The migration's PART M backfill guarantees a row exists for every
  // pre-existing case, but a defensive maybeSingle() handles new cases
  // created before this prompt.
  const RETAINER_FIELDS =
    "id, status, signed_at, sent_to_email, sent_at, token_expires_at, signing_token, resent_count, last_resent_at, method, void_reason, voided_at, voided_by, signed_by_staff_id, final_document_id, service_description, government_fee_cad, first_installment_cad, second_installment_cad, hst_cad, withdrawal_refund_floor_cad, rcic_id";

  let { data: retainerRow } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select(RETAINER_FIELDS)
    .eq("case_id", id)
    .is("deleted_at", null)
    .maybeSingle();

  // Lazy-create / restore a draft retainer if one is missing. The
  // trg_ensure_retainer_for_new_case trigger should always handle this
  // at case insert time; this is a belt-and-suspenders catch. Three
  // cases to handle:
  //   a) No row at all (live or soft-deleted) → INSERT a fresh draft.
  //   b) Soft-deleted row exists → restore it (clear deleted_at). The
  //      retainer_agreements.case_id UNIQUE constraint applies to
  //      soft-deleted rows too, so a fresh INSERT would fail.
  //   c) An auto-advance race where the row appeared between our
  //      first SELECT and now → re-SELECT.
  let lazyError: string | null = null;
  if (!retainerRow && me && staffCan(me, "manage_retainers")) {
    const { data: ghost } = await supabase
      .schema("crm")
      .from("retainer_agreements")
      .select("id, deleted_at")
      .eq("case_id", id)
      .maybeSingle();

    if (ghost) {
      // Soft-deleted; restore it to draft so the standard UI takes over.
      const { data: restored, error: upErr } = await supabase
        .schema("crm")
        .from("retainer_agreements")
        .update({
          deleted_at: null,
          status: "draft",
          signing_token: null,
          token_expires_at: null,
          sent_to_email: null,
          sent_at: null,
        })
        .eq("id", ghost.id)
        .select(RETAINER_FIELDS)
        .single();
      if (upErr) lazyError = `Restore retainer failed: ${upErr.message}`;
      retainerRow = restored ?? null;
    } else {
      // No row at all — insert a fresh draft. Capture any error so the
      // user sees the real problem instead of a silent fall-through.
      const { data: created, error: insErr } = await supabase
        .schema("crm")
        .from("retainer_agreements")
        .insert({
          case_id: id,
          status: "draft",
          rcic_id: caseRow.assigned_rcic ?? null,
          created_by: me.id,
        })
        .select(RETAINER_FIELDS)
        .single();
      if (insErr) lazyError = `Create retainer failed: ${insErr.message}`;
      retainerRow = created ?? null;
    }
  }

  const retainerReady =
    retainerRow?.status === "signed" || retainerRow?.status === "uploaded";
  const tab: Tab = requestedTab ?? (retainerReady ? "documents" : "retainer");

  // Lookups for the Retainer tab's status panel + RetainerData assembly.
  // Skipped when not on the retainer tab to keep the page render lean.
  // Errors here are surfaced (not swallowed) so the user sees the real
  // reason instead of a generic "Retainer record not found" message.
  let retainerData = null;
  let retainerLoadError: string | null = null;
  if (tab === "retainer" && retainerRow) {
    try {
      retainerData = await loadRetainerData(retainerRow.id, {
        requireSignature: false,
      });
    } catch (err) {
      retainerLoadError =
        err instanceof Error ? err.message : "Could not load retainer data";
      console.error("[case-detail] loadRetainerData failed:", err);
    }
  }

  const [signedByRes, voidedByRes, finalDocRes, rcicListRes] =
    tab === "retainer" && retainerRow
      ? await Promise.all([
          retainerRow.signed_by_staff_id
            ? supabase
                .schema("crm")
                .from("staff")
                .select("first_name, last_name")
                .eq("id", retainerRow.signed_by_staff_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          retainerRow.voided_by
            ? supabase
                .schema("crm")
                .from("staff")
                .select("first_name, last_name")
                .eq("id", retainerRow.voided_by)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          retainerRow.final_document_id
            ? supabase
                .schema("files")
                .from("documents")
                .select("file_name, sharepoint_web_url")
                .eq("id", retainerRow.final_document_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          // All active RCICs in the firm — feeds the RetainerTab picker.
          supabase
            .schema("crm")
            .from("staff")
            .select("id, first_name, last_name, signature_image_url")
            .eq("is_rcic", true)
            .eq("is_active", true)
            .is("deleted_at", null)
            .order("last_name"),
        ])
      : [
          { data: null as { first_name: string; last_name: string } | null },
          { data: null as { first_name: string; last_name: string } | null },
          { data: null as { file_name: string | null; sharepoint_web_url: string | null } | null },
          {
            data: null as
              | Array<{
                  id: string;
                  first_name: string;
                  last_name: string;
                  signature_image_url: string | null;
                }>
              | null,
          },
        ];

  const [
    clientRes,
    serviceRes,
    templateDocsRes,
    requiredDocsRes,
    uploadedDocsRes,
    paymentsRes,
    tasksRes,
    staffRes,
    eventsRes,
    teamRes,
    chipRes,
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("clients")
      .select("legal_name_full, client_number, family_name, given_names, email, immigration_status_expiry")
      .eq("id", caseRow.client_id)
      .maybeSingle() as unknown as Promise<{ data: { legal_name_full: string; client_number: string; family_name: string | null; given_names: string | null; email: string | null; immigration_status_expiry: string | null } | null }>,
    supabase
      .schema("ref")
      .from("service_types")
      .select("name")
      .eq("id", caseRow.service_type_id)
      .maybeSingle(),
    supabase
      .schema("ref")
      .from("template_documents")
      .select(
        `
          document_code,
          document_label,
          group_code,
          condition_label,
          display_order,
          allowed_file_types,
          max_file_size_mb,
          instructions,
          expected_quantity,
          group:checklist_groups(name, display_order)
        `,
      )
      .eq("service_template_id", caseRow.service_template_id)
      .order("display_order"),
    supabase
      .schema("crm")
      .from("case_required_documents")
      .select(
        "id, document_code, custom_label, due_date, requested_at_event_id",
      )
      .eq("case_id", id),
    supabase
      .schema("files")
      .from("documents")
      .select(
        "id, document_code, required_document_id, status, file_name, mime_type, version_number, sharepoint_web_url, rejection_reason, reviewed_at, reviewed_by, uploaded_by_client, file_group_key, created_at",
      )
      .eq("case_id", id)
      .is("deleted_at", null),
    supabase
      .schema("crm")
      .from("payments")
      .select(
        "id, amount_cad, method, reference, received_date, notes, is_refund, recorded_by, proof_document_id, client_uploaded_at, verified_at, verified_by",
      )
      .eq("case_id", id)
      .is("deleted_at", null)
      .order("received_date", { ascending: false }),
    supabase
      .schema("crm")
      .from("tasks")
      .select("id, title, due_date")
      .eq("case_id", id)
      .is("deleted_at", null)
      .in("status", ["open", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .schema("crm")
      .from("staff")
      .select("id, first_name, last_name, role, is_rcic, rcic_membership_number")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("last_name", { ascending: true }),
    supabase
      .schema("crm")
      .from("case_events")
      .select(
        `
          id,
          occurred_at,
          event_type,
          description,
          event_data,
          recorder:staff!case_events_created_by_fkey(first_name, last_name)
        `,
      )
      .eq("case_id", id)
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase
      .schema("crm")
      .from("case_assignments")
      .select("staff_id, role")
      .eq("case_id", id),
    // FLOW-3a: this case's chip-input row. Depends only on the case id, so it
    // joins the batch above instead of trailing it as a separate round-trip.
    supabase
      .schema("crm")
      .from("v_case_chip_inputs")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
  ]);

  const client = clientRes.data;
  const service = serviceRes.data;

  const chipRow = chipRes.data;
  const chip = chipRow
    ? (() => {
        const input = chipInputFromViewRow(chipRow, new Date());
        return input ? computeActionChip(input) : null;
      })()
    : null;

  // FLOW-3b: biometrics card data. Linked record (if any) + the client's
  // prior records (so "Use prior biometrics" can list them).
  const [{ data: priorBiometricRecords }, linkedBiometricRecordRes] =
    await Promise.all([
      supabase
        .schema("crm")
        .from("client_biometric_records")
        .select(
          "*",
        )
        .eq("client_id", caseRow.client_id)
        .is("deleted_at", null)
        .order("date_given", { ascending: false }),
      caseRow.biometrics_record_id
        ? supabase
            .schema("crm")
            .from("client_biometric_records")
            .select(
              "id, date_given, location, bvn_or_reference, application_context, valid_until",
            )
            .eq("id", caseRow.biometrics_record_id)
            .is("deleted_at", null)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  const linkedBiometricRecord = linkedBiometricRecordRes.data;

  // Intake banner — fetch the full client row + all 8 support tables and
  // compute completeness. Adds a parallel round-trip but the banner is
  // important enough that the page should always reflect current state.
  const [
    fullClientRes,
    intakeFamilyRes,
    intakeEducationRes,
    intakeEmploymentRes,
    intakeTravelRes,
    intakeAddressRes,
    intakeOrgsRes,
    intakeGovRes,
    intakeMilRes,
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("clients")
      .select("*")
      .eq("id", caseRow.client_id)
      .maybeSingle(),
    supabase
      .schema("crm")
      .from("client_family_members")
      .select("*")
      .eq("client_id", caseRow.client_id),
    supabase
      .schema("crm")
      .from("client_education_history")
      .select("*")
      .eq("client_id", caseRow.client_id),
    supabase
      .schema("crm")
      .from("client_employment_history")
      .select("*")
      .eq("client_id", caseRow.client_id),
    supabase
      .schema("crm")
      .from("client_travel_history")
      .select("*")
      .eq("client_id", caseRow.client_id),
    supabase
      .schema("crm")
      .from("client_address_history")
      .select("*")
      .eq("client_id", caseRow.client_id),
    supabase
      .schema("crm")
      .from("client_organisations")
      .select("*")
      .eq("client_id", caseRow.client_id),
    supabase
      .schema("crm")
      .from("client_government_positions")
      .select("*")
      .eq("client_id", caseRow.client_id),
    supabase
      .schema("crm")
      .from("client_military_services")
      .select("*")
      .eq("client_id", caseRow.client_id),
  ]);

  const intakeProgress = fullClientRes.data
    ? getIntakeProgress(fullClientRes.data, {
        family: intakeFamilyRes.data ?? [],
        education: intakeEducationRes.data ?? [],
        employment: intakeEmploymentRes.data ?? [],
        travel: intakeTravelRes.data ?? [],
        addresses: intakeAddressRes.data ?? [],
        organisations: intakeOrgsRes.data ?? [],
        government: intakeGovRes.data ?? [],
        military: intakeMilRes.data ?? [],
        // priorBiometricRecords is already loaded above (FLOW-3b) for the
        // biometrics card — reuse it for completeness without a 2nd query.
        biometrics: priorBiometricRecords ?? [],
      })
    : null;
  const intakeMissing = intakeProgress
    ? intakeProgress.total - intakeProgress.complete
    : 0;
  // Phase 2 required docs have document_code; additional docs have a null
  // document_code + a non-null requested_at_event_id. Only the Phase 2 set
  // feeds the template checklist's "is_required" flag.
  const requiredDocs = requiredDocsRes.data ?? [];
  const requiredDocCodes = new Set(
    requiredDocs
      .filter((r) => r.requested_at_event_id === null && r.document_code)
      .map((r) => r.document_code as string),
  );
  // allows_multiple is read tolerantly (separate query) so a missing column
  // can never blank the checklist; fall back to the legacy expected_quantity.
  const allowsMultipleByCode = await fetchAllowsMultipleByCode(
    supabase,
    caseRow.service_template_id,
  );
  const templateDocs = (templateDocsRes.data ?? []).map((d) => ({
    ...d,
    is_required: requiredDocCodes.has(d.document_code),
    allows_multiple:
      allowsMultipleByCode[d.document_code] ?? (d.expected_quantity ?? 1) > 1,
  }));
  const uploadedDocs = uploadedDocsRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const allStaff = staffRes.data ?? [];

  // APPT-3: appointment types, default office address, and the next 3
  // upcoming appointments linked to this case. Used by the "Schedule
  // meeting" button and the "Upcoming appointments" sidebar card.
  const [
    appointmentTypesRes,
    appointmentSettingsRes,
    caseAppointmentsRes,
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("appointment_types")
      .select(
        "id, name, code, duration_minutes, requires_case, default_location_type, fee_cad",
      )
      .eq("active", true)
      .is("deleted_at", null)
      .order("display_order"),
    supabase
      .schema("crm")
      .from("appointment_settings")
      .select("office_address")
      .maybeSingle(),
    supabase
      .schema("crm")
      .from("appointments")
      .select(
        `
          id, starts_at, ends_at, timezone, location_type, online_link,
          onsite_address, teams_join_url, status, reason, staff_notes, graph_sync_status,
          fee_cad_at_booking, payment_uploaded_at, payment_screenshot_id,
          payment_reviewed_at, payment_rejection_reason, linked_payment_id,
          graph_sync_error, cancellation_reason, snapshot_client_name,
          snapshot_client_email, snapshot_client_phone,
          appointment_type:appointment_types!appointments_appointment_type_id_fkey(
            id, name, duration_minutes, default_location_type, preparation_notes
          ),
          client:clients!appointments_client_id_fkey(
            id, given_names, family_name, email
          ),
          case:cases!appointments_case_id_fkey(id, case_number),
          assigned_staff:staff!appointments_assigned_staff_id_fkey(
            id, first_name, last_name
          )
        `,
      )
      .eq("case_id", caseRow.id)
      .eq("status", "confirmed")
      .is("deleted_at", null)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(3),
  ]);

  const appointmentTypes: AppointmentTypeOption[] = (
    appointmentTypesRes.data ?? []
  ).map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    duration_minutes: t.duration_minutes,
    requires_case: t.requires_case,
    default_location_type: t.default_location_type as LocationType,
    fee_cad: t.fee_cad,
  }));
  const officeAddress =
    appointmentSettingsRes.data?.office_address ??
    "211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5";
  const caseAppointments = (caseAppointmentsRes.data ??
    []) as unknown as AppointmentRow[];
  const clientNameForPrefill =
    client?.legal_name_full ??
    [client?.given_names, client?.family_name].filter(Boolean).join(" ").trim();

  // FLOW-3b: latest biometrics-related event for the biometrics card's
  // sub-line ("Requested on …" / "Scheduled for …" / "Completed on …").
  const BIO_EVENT_TYPES: ReadonlySet<string> = new Set([
    "biometrics_requested",
    "biometrics_scheduled",
    "biometrics_completed",
  ]);
  const latestBiometricsEvent = (() => {
    for (const e of eventsRes.data ?? []) {
      if (BIO_EVENT_TYPES.has(e.event_type)) {
        return {
          type: e.event_type,
          occurredAt: e.occurred_at,
          eventData:
            e.event_data && typeof e.event_data === "object" && !Array.isArray(e.event_data)
              ? (e.event_data as Record<string, unknown>)
              : null,
        };
      }
    }
    return null;
  })();

  // OneDrive folder UI state. Folder is "provisioning" if the most recent
  // folder-related event is `_provisioning` and no `_ready` event has
  // landed since. Used by OneDriveCard to show the spinner + auto-poll
  // instead of the manual-retry button.
  const folderProvisioning =
    !caseRow.sharepoint_folder_id &&
    (() => {
      for (const e of eventsRes.data ?? []) {
        const kind =
          e.event_data && typeof e.event_data === "object" && "kind" in e.event_data
            ? (e.event_data as { kind?: string }).kind
            : undefined;
        if (kind === "onedrive_folder_provisioning") return true;
        if (
          kind === "onedrive_folder_pending" ||
          kind === "onedrive_folder_retry_failed" ||
          kind === "onedrive_folder_ready" ||
          kind === "onedrive_folder_retry_succeeded"
        ) {
          return false;
        }
      }
      return false;
    })();

  // Per-payment proof document join. Only fetched when the Payments
  // tab is the active one — other tabs don't surface this data so we
  // avoid the extra round-trip.
  const proofDocIds = payments
    .map((p) => p.proof_document_id)
    .filter((v): v is string => !!v);
  const proofDocsById = new Map<
    string,
    { fileName: string | null; webUrl: string | null; mimeType: string | null }
  >();
  if (tab === "payments" && proofDocIds.length > 0) {
    const { data: proofDocs } = await supabase
      .schema("files")
      .from("documents")
      .select("id, file_name, sharepoint_web_url, mime_type")
      .in("id", proofDocIds)
      .is("deleted_at", null);
    for (const d of proofDocs ?? []) {
      proofDocsById.set(d.id, {
        fileName: d.file_name,
        webUrl: d.sharepoint_web_url,
        mimeType: d.mime_type,
      });
    }
  }
  const timelineEvents: TimelineEvent[] = (eventsRes.data ?? []).map((row) => {
    const data = (row.event_data ?? null) as { milestone?: string } | null;
    const recorder = row.recorder
      ? `${row.recorder.first_name} ${row.recorder.last_name}`.trim()
      : null;
    return {
      id: row.id,
      occurredAt: row.occurred_at,
      description: row.description,
      recorderName: recorder,
      milestone: data?.milestone ?? null,
    };
  });

  // Compose the case team from crm.case_assignments. The header Assigned fact
  // and the rail Case team panel both render from this single object, so they
  // cannot disagree. The RCIC of record falls back to cases.assigned_rcic (kept
  // in sync by a DB trigger) so a case always shows its RCIC.
  const teamRows = teamRes.data ?? [];
  const staffById = new Map(allStaff.map((s) => [s.id, s]));

  function toTeamMember(staffId: string | null): TeamMember | null {
    if (!staffId) return null;
    const s = staffById.get(staffId);
    if (!s) return null;
    return {
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      role: s.role ?? null,
      is_rcic: s.is_rcic ?? false,
      rcic_membership_number: s.rcic_membership_number ?? null,
    };
  }

  const rcicRow = teamRows.find((r) => r.role === "rcic_of_record") ?? null;
  const teamRcic =
    toTeamMember(rcicRow?.staff_id ?? null) ?? toTeamMember(caseRow.assigned_rcic);

  const teamWorkers = teamRows
    .filter((r) => r.role === "case_worker")
    .map((r) => toTeamMember(r.staff_id))
    .filter((m): m is TeamMember => m !== null);

  const team: CaseTeam = {
    rcic: teamRcic,
    workers: teamWorkers,
    rcicInvalid: Boolean(teamRcic && !teamRcic.is_rcic),
  };

  // The RCIC picker is limited to licensed consultants; worker pickers offer
  // any active staff member.
  const rcicOptions: StaffOption[] = allStaff
    .filter((s) => s.is_rcic)
    .map((s) => ({ id: s.id, first_name: s.first_name, last_name: s.last_name }));

  const workerOptions: StaffOption[] = allStaff.map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
  }));

  // All LIVE files per document_code. "Live" mirrors the partial unique
  // index uniq_document_live_per_group: status != 'superseded' AND
  // deleted_at IS NULL. Multi-file slots (expected_quantity > 1) have
  // multiple entries; single-file slots have 0 or 1.
  const liveByCode = new Map<string, FileRow[]>();
  // Full version history per document_code, INCLUDING superseded rows, so the
  // checklist can show prior (rejected/replaced) versions. Keyed the same way
  // as liveByCode and sorted by version ascending.
  const historyByCode = new Map<string, FileRow[]>();
  for (const doc of uploadedDocs) {
    if (!doc.document_code) continue;
    const row: FileRow = {
      id: doc.id,
      status: doc.status,
      file_name: doc.file_name,
      mime_type: doc.mime_type,
      version_number: doc.version_number,
      rejection_reason: doc.rejection_reason,
      file_group_key: doc.file_group_key,
      created_at: doc.created_at,
      reviewed_by: doc.reviewed_by,
      uploaded_by_client: doc.uploaded_by_client ?? false,
    };
    const hist = historyByCode.get(doc.document_code) ?? [];
    hist.push(row);
    historyByCode.set(doc.document_code, hist);
    if (doc.status === "superseded") continue;
    const list = liveByCode.get(doc.document_code) ?? [];
    list.push(row);
    liveByCode.set(doc.document_code, list);
  }
  // Sort each slot's files by created_at so the sub-list renders in
  // upload order (oldest first).
  for (const list of liveByCode.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  // History sorts by version so "v1, v2, v3" reads top to bottom.
  for (const list of historyByCode.values()) {
    list.sort((a, b) => a.version_number - b.version_number);
  }

  // Reviewer display names for rejected-version notes. reviewed_by holds a
  // staff id; resolve from the already-loaded staff list (no extra query).
  const reviewerNameById: Record<string, string> = {};
  for (const s of allStaff) {
    reviewerNameById[s.id] = [s.first_name, s.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  // FLOW-3d: build additional-document groups.
  // 1. Find every additional_documents_requested event for this case.
  // 2. Per event, attach the case_required_documents rows that point at it
  //    and their latest non-superseded files.documents (via required_document_id).
  const latestByRequiredDocId = new Map<string, LatestDoc>();
  for (const doc of uploadedDocs) {
    if (!doc.required_document_id) continue;
    const existing = latestByRequiredDocId.get(doc.required_document_id);
    if (!existing || doc.version_number > existing.version_number) {
      latestByRequiredDocId.set(doc.required_document_id, {
        id: doc.id,
        status: doc.status,
        file_name: doc.file_name,
        sharepoint_web_url: doc.sharepoint_web_url,
        version_number: doc.version_number,
        rejection_reason: doc.rejection_reason,
      });
    }
  }

  const additionalDocsGroups: AdditionalDocsGroup[] = (() => {
    const rowsByEvent = new Map<
      string,
      Array<{
        id: string;
        customLabel: string;
        dueDate: string | null;
        latest: LatestDoc | null;
      }>
    >();
    for (const r of requiredDocs) {
      if (!r.requested_at_event_id) continue;
      const list = rowsByEvent.get(r.requested_at_event_id) ?? [];
      list.push({
        id: r.id,
        customLabel: r.custom_label ?? "Additional document",
        dueDate: r.due_date,
        latest: latestByRequiredDocId.get(r.id) ?? null,
      });
      rowsByEvent.set(r.requested_at_event_id, list);
    }
    if (rowsByEvent.size === 0) return [];

    // Pull the corresponding events from eventsRes (already loaded) to get
    // occurred_at, overall_due_date, notes.
    const groups: AdditionalDocsGroup[] = [];
    for (const e of eventsRes.data ?? []) {
      if (e.event_type !== "additional_documents_requested") continue;
      const rows = rowsByEvent.get(e.id);
      if (!rows) continue;
      const data =
        e.event_data && typeof e.event_data === "object" && !Array.isArray(e.event_data)
          ? (e.event_data as Record<string, unknown>)
          : {};
      const overallDue =
        typeof data.overall_due_date === "string"
          ? data.overall_due_date
          : null;
      const notes =
        typeof data.notes === "string" ? data.notes : null;
      groups.push({
        eventId: e.id,
        requestedAt: e.occurred_at,
        overallDueDate: overallDue,
        notes,
        rows,
      });
    }
    return groups.sort(
      (a, b) =>
        new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime(),
    );
  })();

  // `collected` only counts VERIFIED payments. Client-portal uploads
  // sit in the pending bucket until staff approves them, so the
  // "PAYMENT $X / $Y" card and the "Paid in full" badge don't flip
  // on a screenshot we haven't reviewed yet.
  const collected = sumVerifiedPayments(payments);
  const pendingVerificationAmount = sumPendingVerification(payments);
  // The "amount the client owes" breakdown must match the retainer document
  // exactly, so source it from retainerData (which computes HST as 13% of the
  // fee when hst_cad is unset, and keeps government fees tax-exempt). Fall back
  // to the case row only when no retainer has been loaded.
  const quotedBase = retainerData
    ? retainerData.quoted_fee_cad
    : Number(caseRow.quoted_fee_cad);
  const quotedGovernmentFee = retainerData
    ? retainerData.government_fee_cad
    : Number(retainerRow?.government_fee_cad ?? caseRow.government_fee_cad ?? 0);
  // hstForRetainer applies the NULL-means-13% rule so this card agrees
  // with the retainer PDF on every tab, not only when retainerData loads
  // (it is skipped off the retainer tab to keep renders lean).
  const quotedHst = retainerData
    ? retainerData.hst_cad
    : retainerRow
      ? hstForRetainer(Number(quotedBase), retainerRow.hst_cad)
      : 0;
  const quoted = quotedBase + quotedGovernmentFee + quotedHst;

  const staffNameById = new Map(
    allStaff.map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim()]),
  );
  const paymentRows: PaymentTabRow[] = payments.map((p) => ({
    id: p.id,
    amount_cad: Number(p.amount_cad),
    method: p.method,
    reference: p.reference,
    received_date: p.received_date,
    notes: p.notes,
    is_refund: p.is_refund,
    recorded_by_name: p.recorded_by
      ? staffNameById.get(p.recorded_by) ?? null
      : null,
    proof: p.proof_document_id
      ? {
          documentId: p.proof_document_id,
          fileName:
            proofDocsById.get(p.proof_document_id)?.fileName ?? null,
          webUrl:
            proofDocsById.get(p.proof_document_id)?.webUrl ?? null,
          mimeType:
            proofDocsById.get(p.proof_document_id)?.mimeType ?? null,
        }
      : null,
  }));
  const canManagePayments = me ? staffCan(me, "record_payments") : false;
  const paymentPct =
    quoted > 0 ? Math.min(100, Math.round((collected / quoted) * 100)) : 0;
  const retainerMin =
    caseRow.retainer_minimum_cad === null
      ? null
      : Number(caseRow.retainer_minimum_cad);
  const paidInFull = quoted > 0 && collected >= quoted;
  const retainerSatisfied =
    retainerMin === null ? collected > 0 : collected >= retainerMin;

  // For closed cases, determine if there was an approval or refusal so the
  // sub-status shows the actual outcome instead of just "Closed".
  let closedOutcome: "approved" | "refused" | null = null;
  if (caseRow.status === "closed") {
    const events = eventsRes.data ?? [];
    for (const ev of events) {
      const data = ev.event_data as { milestone?: string } | null;
      if (data?.milestone === "decision_approved") { closedOutcome = "approved"; break; }
      if (data?.milestone === "decision_refused") { closedOutcome = "refused"; break; }
    }
  }

  // Immigration status lives on the client. Read it from the full client row
  // (selected with "*") so a not-yet-applied migration column degrades to
  // null instead of erroring the whole client query.
  const fullClient = fullClientRes.data as Record<string, unknown> | null;
  const immigrationStatus =
    (fullClient?.immigration_status as ImmigrationStatusType | null) ?? null;
  const immigrationExpiry =
    (fullClient?.immigration_status_expiry as string | null) ?? null;
  const immigrationNote =
    (fullClient?.immigration_status_note as string | null) ?? null;
  const immigrationInCanada =
    (fullClient?.immigration_in_canada as boolean | null) ?? null;
  const canEditClient = me ? staffCan(me, "edit_clients") : false;
  const clientPhone = (fullClient?.phone_primary as string | null) ?? null;

  // Documents fact: required documents only, received over required. Optional
  // documents the case may never need are excluded so the count reflects what
  // is actually outstanding. "Received" uses the same itemReceived derivation
  // as the DocumentChecklist card lower on the page.
  const requiredTemplateDocs = templateDocs.filter((d) => d.is_required);
  const docsTotal = requiredTemplateDocs.length;
  const docsReceived = requiredTemplateDocs.filter((d) =>
    itemReceived(liveByCode.get(d.document_code)),
  ).length;

  // Payment status line beneath the amount.
  const paymentStatusLine = paidInFull
    ? "Paid in full"
    : retainerSatisfied
      ? "Retainer satisfied"
      : `${paymentPct}% paid`;

  // Government identifiers. The UCI is per-person, so it is sourced from the
  // client and reused across the person's cases; the legacy case column is a
  // fallback during the transition. The IRCC application number is per-
  // application and stays on the case. UCI shows always, the application
  // number only once assigned.
  const uci =
    (fullClient?.uci as string | null) ??
    (caseRow.ircc_uci as string | null) ??
    null;
  const irccApplicationNumber =
    (caseRow.ircc_application_number as string | null) ?? null;
  const identifiersLine = `UCI ${formatUci(uci) ?? "not recorded"}, ${
    irccApplicationNumber
      ? `IRCC ${irccApplicationNumber}`
      : "IRCC application not yet submitted"
  }`;

  // Derived at-risk submission signal. When present, the banner carries the
  // sub-status + action, so the standalone sub-status row is suppressed and
  // the waiting state appears exactly once.
  const risk = deriveSubmissionRisk({
    inCanada: immigrationInCanada,
    status: immigrationStatus,
    expiry: immigrationExpiry,
    caseStatus: caseRow.status,
  });
  let riskHeadline: string | null = null;
  let riskReason: string | null = null;
  if (risk) {
    riskHeadline = `File before ${format(
      new Date(risk.fileBefore + "T00:00:00"),
      "MMM d",
    )} to maintain status`;
    const permitLabel = immigrationStatus
      ? IMMIGRATION_STATUS_LABELS[immigrationStatus]
      : "Permit";
    const expiryPhrase = risk.overdue
      ? `expired ${Math.abs(risk.daysUntilExpiry)} days ago`
      : risk.daysUntilExpiry === 0
        ? "expires today"
        : `expires in ${risk.daysUntilExpiry} days`;
    const blocker =
      chip && chip.waiting_days != null
        ? `, and ${chip.text.split(" · ")[0].toLowerCase()} for ${
            chip.waiting_days
          } day${chip.waiting_days === 1 ? "" : "s"}`
        : "";
    riskReason = `${permitLabel} ${expiryPhrase}${blocker}`;
  }

  // Related parties (principal applicant, sponsor, co-applicants, dependents).
  // Rendered only when present, so solo cases stay minimal.
  const participantsRes = (await supabase
    .schema("crm")
    .from("case_participants")
    .select(
      "id, role, client_id, client:clients(legal_name_full, given_names, family_name)",
    )
    .eq("case_id", id)
    .order("added_at", { ascending: true })) as unknown as {
    data:
      | Array<{
          id: string;
          role: RelatedParty["role"];
          client_id: string;
          client: {
            legal_name_full: string | null;
            given_names: string | null;
            family_name: string | null;
          } | null;
        }>
      | null;
  };
  const relatedParties: RelatedParty[] = (participantsRes.data ?? []).map(
    (p) => {
      const joined = [p.client?.given_names, p.client?.family_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      return {
        id: p.id,
        clientId: p.client_id,
        role: p.role,
        name: p.client?.legal_name_full || joined || "Unnamed person",
      };
    },
  );

  const nextTask = tasks[0];

  return (
    <div className="min-h-dvh bg-[var(--surface-sunken)]">
      <header className="border-b border-border bg-card">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground">
          <Link href="/dashboard/cases" className="hover:text-foreground">
            Cases
          </Link>
          <span aria-hidden className="text-[var(--subtle-foreground)]">/</span>
          <span className="font-medium text-foreground">
            {caseRow.case_number}
          </span>
        </nav>
      </header>

      <main className="space-y-4 px-6 py-6">
        {folderPending && (
          <div
            role="alert"
            className="rounded-lg border border-l-4 border-[var(--warning-subtle)] border-l-[var(--warning)] bg-[var(--warning-subtle)] px-4 py-3 text-sm text-[var(--warning-text)]"
          >
            <strong className="font-semibold">OneDrive folder is pending.</strong>{" "}
            The case was created, but the folder couldn&apos;t be provisioned
            automatically. Use the &ldquo;Retry folder creation&rdquo; button in
            the OneDrive card on the right to try again.
          </div>
        )}

        {intakeProgress && intakeMissing > 0 && (
          <IntakeBanner
            clientId={caseRow.client_id}
            missing={intakeMissing}
            total={intakeProgress.total}
          />
        )}

        {/* Header card */}
        <div className="rounded-lg border border-border bg-card p-5">
          {/* Top row: name + meta, primary action + overflow */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-foreground">
                {client?.legal_name_full ?? "Unnamed client"}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {service?.name ?? "Service not set"}, {caseRow.case_number},
                opened {format(new Date(caseRow.opened_at), "MMM d, yyyy")}
              </p>
              {(client?.email || clientPhone) && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                  {client?.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="hover:text-foreground"
                    >
                      {client.email}
                    </a>
                  )}
                  {client?.email && clientPhone && (
                    <span aria-hidden className="text-[var(--subtle-foreground)]">
                      ·
                    </span>
                  )}
                  {clientPhone && (
                    <a
                      href={`tel:${clientPhone}`}
                      className="hover:text-foreground"
                    >
                      {formatPhone(clientPhone)}
                    </a>
                  )}
                </p>
              )}
              {/* Government identifiers: UCI always, IRCC number once assigned. */}
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {identifiersLine}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {me && staffCan(me, "manage_appointments") && (
                <NewAppointmentDialog
                  types={appointmentTypes}
                  officeAddress={officeAddress}
                  prefilledClient={{
                    id: caseRow.client_id,
                    name: clientNameForPrefill,
                    email: client?.email ?? "",
                    phone: null,
                  }}
                  prefilledCase={{
                    id: caseRow.id,
                    case_number: caseRow.case_number,
                  }}
                  triggerLabel="Schedule meeting"
                  triggerVariant="primary"
                />
              )}
              <CaseOverflowMenu
                caseId={caseRow.id}
                caseNumber={caseRow.case_number}
                rcicId={team.rcic?.id ?? null}
                rcicOptions={rcicOptions}
                priority={(caseRow.priority as string | null) ?? "normal"}
                canEdit={canEditCase}
                canDelete={Boolean(me && staffCan(me, "delete_cases"))}
              />
            </div>
          </div>

          {/* When at risk of missing a status deadline, the banner carries the
              sub-status + action. Otherwise the plain sub-status row shows.
              Either way the waiting state appears exactly once. */}
          {risk && riskHeadline && riskReason ? (
            <div className="mt-4">
              <AtRiskBanner
                headline={riskHeadline}
                reason={riskReason}
                overdue={risk.overdue}
              >
                <SubStatusRow
                  caseId={caseRow.id}
                  chip={chip}
                  status={caseRow.status}
                  clientEmail={client?.email ?? null}
                  closedOutcome={closedOutcome}
                />
              </AtRiskBanner>
            </div>
          ) : (
            <div className="mt-4">
              <SubStatusRow
                caseId={caseRow.id}
                chip={chip}
                status={caseRow.status}
                clientEmail={client?.email ?? null}
                closedOutcome={closedOutcome}
              />
            </div>
          )}

          {/* Key facts strip */}
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
            <Fact label="Assigned">
              <AssignedFact rcic={team.rcic} workers={team.workers} />
            </Fact>
            <Fact label="Immigration status">
              <ImmigrationStatusFact
                clientId={caseRow.client_id}
                canEdit={canEditClient}
                inCanada={immigrationInCanada}
                status={immigrationStatus}
                expiry={immigrationExpiry}
                note={immigrationNote}
                uci={uci}
              />
            </Fact>
            <Fact label="Payment">
              <div className="text-sm font-medium text-foreground">
                {formatCad(collected)} / {formatCad(quoted)}
              </div>
              <div
                className={`mt-0.5 flex items-center gap-1.5 text-xs ${
                  paidInFull
                    ? "text-[var(--success-text)]"
                    : "text-muted-foreground"
                }`}
              >
                {paidInFull && (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-[var(--success)]"
                  />
                )}
                {paymentStatusLine}
              </div>
            </Fact>
            <Fact label="Documents">
              <div className="text-sm font-medium text-foreground">
                {docsTotal === 0
                  ? "None required yet"
                  : `${docsReceived} of ${docsTotal} required collected`}
              </div>
            </Fact>
          </div>

          {/* Related parties, only when the case has linked people. */}
          <RelatedPeopleRow parties={relatedParties} />
        </div>

        <CasePhaseTracker
          status={caseRow.status}
          caseId={caseRow.id}
          quotedFeeCad={quoted}
          retainerMinimumCad={retainerMin}
          collectedCad={collected}
        />

        <CaseTabs
          caseId={caseRow.id}
          activeTab={tab}
          retainerReady={retainerReady}
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <div className="min-w-0 space-y-4">
            {tab === "retainer" ? (
          retainerRow && retainerData ? (
            <RetainerTab
              caseId={caseRow.id}
              retainerId={retainerRow.id}
              status={retainerRow.status}
              caseQuotedFeeCad={Number(caseRow.quoted_fee_cad)}
              data={retainerData}
              meta={{
                sent_to_email: retainerRow.sent_to_email,
                sent_at: retainerRow.sent_at,
                token_expires_at: retainerRow.token_expires_at,
                signed_at: retainerRow.signed_at,
                method: retainerRow.method,
                resent_count: retainerRow.resent_count ?? 0,
                last_resent_at: retainerRow.last_resent_at,
                void_reason: retainerRow.void_reason,
                voided_at: retainerRow.voided_at,
                void_voided_by_name: voidedByRes.data
                  ? `${voidedByRes.data.first_name} ${voidedByRes.data.last_name}`.trim()
                  : null,
                signed_by_name: signedByRes.data
                  ? `${signedByRes.data.first_name} ${signedByRes.data.last_name}`.trim()
                  : null,
                final_document_web_url:
                  finalDocRes.data?.sharepoint_web_url ?? null,
                final_document_file_name:
                  finalDocRes.data?.file_name ?? null,
                final_document_present: Boolean(
                  retainerRow.final_document_id,
                ),
              }}
              rcicHasSignature={(() => {
                const list = rcicListRes.data ?? [];
                if (retainerRow.rcic_id) {
                  return Boolean(
                    list.find((r) => r.id === retainerRow.rcic_id)
                      ?.signature_image_url,
                  );
                }
                if (list.length === 1) {
                  return Boolean(list[0].signature_image_url);
                }
                return false;
              })()}
              canManage={me ? staffCan(me, "manage_retainers") : false}
              canVoid={me ? staffCan(me, "void_retainers") : false}
              defaultRecipientEmail={client?.email ?? ""}
              rcicOptions={(rcicListRes.data ?? []).map((r) => ({
                id: r.id,
                name: `${r.first_name} ${r.last_name}`.trim(),
                hasSignature: Boolean(r.signature_image_url),
              }))}
              currentRcicId={retainerRow.rcic_id ?? null}
            />
          ) : (
            <Card>
              <CardContent className="space-y-2 p-6 text-center text-sm">
                {retainerLoadError ? (
                  <>
                    <p className="font-medium text-amber-900">
                      Retainer can&apos;t be rendered yet.
                    </p>
                    <p className="text-stone-600">{retainerLoadError}</p>
                  </>
                ) : !retainerRow ? (
                  <>
                    <p className="text-stone-500">
                      Retainer record not found for this case.
                    </p>
                    {lazyError && (
                      <p className="text-xs text-red-700">
                        {lazyError}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-stone-500">Loading…</p>
                )}
              </CardContent>
            </Card>
          )
        ) : tab === "documents" ? (
          <div className="space-y-4">
            {/* Assemble the client's uploads into a merged, compressed
                submission package (opens the browser-side PDF tool). */}
            <div className="flex justify-end gap-2">
              {me && staffCan(me, "edit_cases") && (
                <GenerateFormDialog caseId={caseRow.id} />
              )}
              <Link
                href={`/dashboard/pdf-tool?case=${caseRow.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--navy)] px-3 text-sm font-medium text-white hover:bg-[var(--navy-800)]"
              >
                Build submission package
              </Link>
            </div>
            <ChecklistBoard
              caseId={caseRow.id}
              templateDocs={templateDocs}
              liveByCode={Object.fromEntries(liveByCode)}
              historyByCode={Object.fromEntries(historyByCode)}
              reviewerNameById={reviewerNameById}
              canEditRequired={me ? staffCan(me, "review_documents") : false}
              canReview={me ? staffCan(me, "review_documents") : false}
              canUpload={me ? staffCan(me, "upload_documents") : false}
              caseShareToken={caseRow.client_portal_token ?? null}
              clientEmail={client?.email ?? null}
              shareButtonSlot={
                me && staffCan(me, "upload_documents") ? (
                  <ShareLinkDialog
                    caseId={caseRow.id}
                    initialToken={caseRow.client_portal_token ?? null}
                    clientEmail={client?.email ?? null}
                  />
                ) : null
              }
            />
            <AdditionalDocumentsSection
              caseId={caseRow.id}
              groups={additionalDocsGroups}
              canUpload={me ? staffCan(me, "upload_documents") : false}
              canReview={me ? staffCan(me, "review_documents") : false}
            />
            <FormFillsSection caseId={caseRow.id} />
          </div>
        ) : tab === "activity" ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-stone-700">
                  Timeline
                </h2>
                <p className="text-xs text-stone-500">
                  Real-world events recorded against this case. Status is
                  derived from the most recent milestone.
                </p>
              </div>
              <TimelineList events={timelineEvents} />
            </CardContent>
          </Card>
        ) : tab === "payments" ? (
          <PaymentsTab
            caseId={caseRow.id}
            payments={paymentRows}
            totalQuoted={quoted}
            quotedFee={quotedBase}
            quotedHst={quotedHst}
            quotedGovernmentFee={quotedGovernmentFee}
            canManage={canManagePayments}
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-stone-500">
              Coming soon
            </CardContent>
          </Card>
        )}
          </div>

          {/* Sticky right rail — shared across every tab */}
          <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Payment
                </div>
                <div className="text-xl font-semibold text-stone-900">
                  {formatCad(collected)} / {formatCad(quoted)}
                </div>
                <div className="text-xs text-stone-500">{paymentPct}% paid</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${paymentPct}%` }}
                  />
                </div>

                <div className="border-t border-stone-100 pt-2">
                  <PaymentBreakdown
                    fee={quotedBase}
                    hst={quotedHst}
                    governmentFee={quotedGovernmentFee}
                  />
                </div>

                {(paidInFull || retainerSatisfied) && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {paidInFull && (
                      <Badge className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Paid in full
                      </Badge>
                    )}
                    {retainerSatisfied && !paidInFull && (
                      <Badge className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Retainer satisfied
                      </Badge>
                    )}
                  </div>
                )}

                {pendingVerificationAmount > 0 && (
                  <Link
                    href="/dashboard/payments?proof=pending"
                    className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 hover:bg-amber-100"
                  >
                    <span>
                      <strong>{formatCad(pendingVerificationAmount)}</strong>{" "}
                      awaiting verification
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                )}

                <RecordPaymentTrigger caseId={caseRow.id} />
                {canManagePayments && (
                  <NotifyForPaymentTrigger
                    caseId={caseRow.id}
                    clientEmail={client?.email ?? null}
                    paidInFull={paidInFull}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <CaseTeamPanel
                  caseId={caseRow.id}
                  team={team}
                  rcicOptions={rcicOptions}
                  workerOptions={workerOptions}
                  canEdit={canEditCase}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-1 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Tasks
                </div>
                <div className="text-sm font-medium text-stone-900">
                  {tasks.length} open
                </div>
                {nextTask ? (
                  <div className="text-xs text-stone-500">
                    Next: {nextTask.title}
                    {nextTask.due_date
                      ? ` due ${format(new Date(nextTask.due_date), "MMM d")}`
                      : ""}
                  </div>
                ) : (
                  <div className="text-xs text-stone-500">No open tasks</div>
                )}
              </CardContent>
            </Card>

            <BiometricsCard
              caseId={caseRow.id}
              status={caseRow.biometrics_status}
              linkedRecord={linkedBiometricRecord ?? null}
              priorRecords={priorBiometricRecords ?? []}
              canEdit={canEditCase}
              latestBiometricsEvent={latestBiometricsEvent}
            />

            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  OneDrive
                </div>
                <OneDriveCard
                  caseId={caseRow.id}
                  folderId={caseRow.sharepoint_folder_id}
                  folderUrl={caseRow.sharepoint_folder_url}
                  provisioning={folderProvisioning}
                />
              </CardContent>
            </Card>

            <UpcomingAppointmentsCard
              title="Upcoming appointments"
              appointments={caseAppointments}
              viewAllHref="/dashboard/appointments"
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

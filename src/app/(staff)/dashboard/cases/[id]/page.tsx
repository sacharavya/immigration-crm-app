import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionChip } from "@/components/cases/action-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  chipInputFromViewRow,
  computeActionChip,
} from "@/lib/cases/action-chip";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

import { getIntakeProgress } from "@/lib/intake/completeness";
import { loadRetainerData } from "@/lib/pdf/render-retainer";

import {
  AssignmentCard,
  type StaffOption,
} from "./_components/assignment-card";
import { CaseTabs, VALID_TABS, type Tab } from "./_components/case-tabs";
import { DeleteCaseTrigger } from "./_components/delete-case-trigger";
import { IntakeBanner } from "./_components/intake-banner";
import { RetainerTab } from "./_components/retainer-tab";
import { ShareLinkDialog } from "./_components/share-link-dialog";
import {
  DocumentChecklist,
  type LatestDoc,
} from "./_components/document-checklist";
import {
  AdditionalDocumentsSection,
  type AdditionalDocsGroup,
} from "./_components/additional-documents-section";
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
import { PhasePipeline } from "./_components/phase-pipeline";
import { NotifyForPaymentTrigger } from "./_components/notify-for-payment-trigger";
import { RecordPaymentTrigger } from "./_components/record-payment-trigger";
import {
  TimelineActions,
  TimelineList,
  type TimelineEvent,
} from "./_components/timeline-panel";

type CaseStatus = Database["crm"]["Enums"]["case_status"];

const statusPill: Record<CaseStatus, { label: string; className: string }> = {
  retainer_pending: {
    label: "Retainer Pending",
    className: "bg-gray-200 text-gray-700",
  },
  documentation_in_progress: {
    label: "Documentation",
    className: "bg-blue-100 text-blue-800",
  },
  documentation_review: {
    label: "In Review",
    className: "bg-blue-100 text-blue-800",
  },
  submitted_to_ircc: {
    label: "Submitted",
    className: "bg-amber-100 text-amber-800",
  },
  passport_requested: {
    label: "Approved",
    className: "bg-green-100 text-green-800",
  },
  refused: {
    label: "Refused",
    className: "bg-red-100 text-red-800",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-200 text-gray-700",
  },
};

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});
const formatCad = (n: number) => cadFormatter.format(n);

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
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("clients")
      .select("legal_name_full, client_number, family_name, given_names, email")
      .eq("id", caseRow.client_id)
      .maybeSingle(),
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
        "id, document_code, required_document_id, status, file_name, version_number, sharepoint_web_url, rejection_reason, reviewed_at, reviewed_by",
      )
      .eq("case_id", id)
      .is("deleted_at", null),
    supabase
      .schema("crm")
      .from("payments")
      .select(
        "id, amount_cad, method, reference, received_date, notes, is_refund, recorded_by, proof_document_id",
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
      .select("id, first_name, last_name, role")
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
  ]);

  const client = clientRes.data;
  const service = serviceRes.data;

  // FLOW-3a: pull this case's chip-input row and compute the chip.
  const { data: chipRow } = await supabase
    .schema("crm")
    .from("v_case_chip_inputs")
    .select("*")
    .eq("case_id", id)
    .maybeSingle();
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
  const templateDocs = (templateDocsRes.data ?? []).map((d) => ({
    ...d,
    is_required: requiredDocCodes.has(d.document_code),
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
        "id, name, code, duration_minutes, requires_case, default_location_type",
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

  // Role-based gating is intentionally off for now — assignment is open
  // to any active staff member. We'll narrow this down later once the
  // role/permission story for assignments is settled.
  const assignableStaff: StaffOption[] = allStaff.map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
  }));

  // Latest version per document_code
  const latestByCode = new Map<string, LatestDoc>();
  for (const doc of uploadedDocs) {
    if (!doc.document_code) continue;
    const existing = latestByCode.get(doc.document_code);
    if (!existing || doc.version_number > existing.version_number) {
      latestByCode.set(doc.document_code, {
        id: doc.id,
        status: doc.status,
        file_name: doc.file_name,
        sharepoint_web_url: doc.sharepoint_web_url,
        version_number: doc.version_number,
        rejection_reason: doc.rejection_reason,
      });
    }
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

  const collected = payments.reduce(
    (acc, p) => acc + (p.is_refund ? -1 : 1) * Number(p.amount_cad),
    0,
  );
  const quoted = Number(caseRow.quoted_fee_cad);

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

  // Override the Phase 1 pill once the retainer is signed: the case
  // status is still 'retainer_pending' (it won't advance until the
  // retainer minimum payment arrives — see crm.can_advance_phase),
  // but "Retainer Pending" is misleading at that point. Surface what's
  // actually pending instead.
  const retainerSigned =
    retainerRow?.status === "signed" || retainerRow?.status === "uploaded";
  const pill =
    caseRow.status === "retainer_pending" && retainerSigned
      ? {
          label: retainerSatisfied ? "Retainer Signed" : "Awaiting Payment",
          className: "bg-emerald-100 text-emerald-800",
        }
      : statusPill[caseRow.status];

  const nextTask = tasks[0];

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4 text-sm">
          <Link href="/dashboard" className="text-stone-500 hover:text-stone-800">
            Cases
          </Link>
          <span className="mx-2 text-stone-400">›</span>
          <span className="font-medium text-stone-800">
            {caseRow.case_number}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-6">
        {folderPending && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <strong>OneDrive folder is pending.</strong> The case was created,
            but the folder couldn&apos;t be provisioned automatically. Use the
            &ldquo;Retry folder creation&rdquo; button in the OneDrive card on
            the right to try again.
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
        <Card>
          <CardContent className="flex items-start justify-between gap-6 p-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--navy)]">
                {client?.legal_name_full ?? "—"}
              </h1>
              <p className="mt-1 text-sm text-stone-600">
                {service?.name ?? "—"} · {caseRow.case_number} · opened{" "}
                {format(new Date(caseRow.opened_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {chip && <ActionChip chip={chip} />}
              <Badge
                className={`${pill.className} shrink-0 rounded-full px-3 py-1 font-medium`}
              >
                {pill.label}
              </Badge>
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
                  triggerVariant="outline"
                />
              )}
              {me && canEditCase && staffCan(me, "delete_cases") && (
                <DeleteCaseTrigger
                  caseId={caseRow.id}
                  caseNumber={caseRow.case_number}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <PhasePipeline status={caseRow.status}>
          <TimelineActions
            caseId={caseRow.id}
            currentStatus={caseRow.status}
            quotedFeeCad={quoted}
            retainerMinimumCad={retainerMin}
            collectedCad={collected}
          />
        </PhasePipeline>

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
            <DocumentChecklist
              caseId={caseRow.id}
              templateDocs={templateDocs}
              latestByCode={latestByCode}
              canEditRequired={me ? staffCan(me, "review_documents") : false}
              canReview={me ? staffCan(me, "review_documents") : false}
              canUpload={me ? staffCan(me, "upload_documents") : false}
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
              <CardContent className="space-y-2 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Assigned
                </div>
                <AssignmentCard
                  caseId={caseRow.id}
                  assignedId={caseRow.assigned_rcic}
                  options={assignableStaff}
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

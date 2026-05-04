import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
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
import {
  DocumentChecklist,
  type LatestDoc,
} from "./_components/document-checklist";
import { OneDriveCard } from "./_components/onedrive-card";
import { PhasePipeline } from "./_components/phase-pipeline";
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
  biometrics_pending: {
    label: "Biometrics",
    className: "bg-teal-100 text-teal-800",
  },
  biometrics_completed: {
    label: "Biometrics",
    className: "bg-teal-100 text-teal-800",
  },
  awaiting_decision: {
    label: "Awaiting Decision",
    className: "bg-teal-100 text-teal-800",
  },
  passport_requested: {
    label: "Passport Request",
    className: "bg-green-100 text-green-800",
  },
  refused: {
    label: "Refused",
    className: "bg-red-100 text-red-800",
  },
  additional_info_requested: {
    label: "More Info",
    className: "bg-amber-100 text-amber-800",
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
  const { data: retainerRow } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select(
      "id, status, signed_at, sent_to_email, sent_at, token_expires_at, signing_token, resent_count, last_resent_at, method, void_reason, voided_at, voided_by, signed_by_staff_id, final_document_id, service_description, government_fee_cad, first_installment_cad, second_installment_cad, hst_cad, withdrawal_refund_floor_cad, rcic_id",
    )
    .eq("case_id", id)
    .is("deleted_at", null)
    .maybeSingle();

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
          is_required,
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
      .schema("files")
      .from("documents")
      .select(
        "document_code, status, file_name, version_number, sharepoint_web_url",
      )
      .eq("case_id", id)
      .is("deleted_at", null),
    supabase
      .schema("crm")
      .from("payments")
      .select("amount_cad, is_refund")
      .eq("case_id", id)
      .is("deleted_at", null),
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
      })
    : null;
  const intakeMissing = intakeProgress
    ? intakeProgress.total - intakeProgress.complete
    : 0;
  const templateDocs = templateDocsRes.data ?? [];
  const uploadedDocs = uploadedDocsRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const allStaff = staffRes.data ?? [];
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
        status: doc.status,
        file_name: doc.file_name,
        sharepoint_web_url: doc.sharepoint_web_url,
        version_number: doc.version_number,
      });
    }
  }

  const collected = payments.reduce(
    (acc, p) => acc + (p.is_refund ? -1 : 1) * Number(p.amount_cad),
    0,
  );
  const quoted = Number(caseRow.quoted_fee_cad);
  const paymentPct =
    quoted > 0 ? Math.min(100, Math.round((collected / quoted) * 100)) : 0;
  const retainerMin =
    caseRow.retainer_minimum_cad === null
      ? null
      : Number(caseRow.retainer_minimum_cad);
  const paidInFull = quoted > 0 && collected >= quoted;
  const retainerSatisfied =
    retainerMin === null ? collected > 0 : collected >= retainerMin;

  const pill = statusPill[caseRow.status];

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
              <Badge
                className={`${pill.className} shrink-0 rounded-full px-3 py-1 font-medium`}
              >
                {pill.label}
              </Badge>
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
                  <p className="text-stone-500">
                    Retainer record not found for this case. Try refreshing.
                  </p>
                ) : (
                  <p className="text-stone-500">Loading…</p>
                )}
              </CardContent>
            </Card>
          )
        ) : tab === "documents" ? (
          <DocumentChecklist
            caseId={caseRow.id}
            templateDocs={templateDocs}
            latestByCode={latestByCode}
          />
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

            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  OneDrive
                </div>
                <OneDriveCard
                  caseId={caseRow.id}
                  folderId={caseRow.sharepoint_folder_id}
                  folderUrl={caseRow.sharepoint_folder_url}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

import Image from "next/image";

import { type LatestDoc } from "@/app/(staff)/dashboard/cases/[id]/_components/document-checklist";
import { adminClient } from "@/lib/supabase/admin";
import { fetchAllowsMultipleByCode } from "@/lib/files/template-docs";

import { loadCaseByPortalToken } from "./actions";
import { ClientChecklist } from "./_components/client-checklist";
import {
  type ClientFile,
  type ClientFileState,
  type ClientRequirement,
} from "./_components/client-doc-row";
import { ExpiredCard } from "./_components/expired-card";
import {
  PortalAdditionalDocs,
  type PortalAdditionalDocsGroup,
} from "./_components/portal-additional-docs";

// Always re-render server-side. The portal reflects review-state changes that
// may have just been written by staff; cached HTML would stale-out the replace
// prompts and done pills.
export const dynamic = "force-dynamic";

// Staff statuses projected to the client's plain states. 'requested' and
// 'superseded' have no real file to show, so they drop out.
const STATUS_TO_STATE: Record<string, ClientFileState> = {
  accepted: "done",
  uploaded: "received",
  under_review: "received",
  rejected: "replace",
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function ClientUploadPage({ params }: Props) {
  const { token } = await params;
  const caseRow = await loadCaseByPortalToken(token);
  if (!caseRow) {
    return <ExpiredCard />;
  }

  const supabase = adminClient();

  const [
    { data: requiredRows },
    { data: templateRows },
    { data: client },
    { data: uploadedDocs },
    { data: adEvents },
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("case_required_documents")
      .select(
        "id, document_code, custom_label, due_date, requested_at_event_id",
      )
      .eq("case_id", caseRow.id),
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
          instructions,
          expected_quantity,
          group:checklist_groups(name, display_order)
        `,
      )
      .eq("service_template_id", caseRow.service_template_id)
      .order("display_order"),
    supabase
      .schema("crm")
      .from("clients")
      .select("legal_name_full, given_names, preferred_name")
      .eq("id", caseRow.client_id)
      .maybeSingle(),
    supabase
      .schema("files")
      .from("documents")
      .select(
        "id, document_code, required_document_id, status, file_name, version_number, sharepoint_web_url, rejection_reason, file_group_key, created_at, uploaded_by_client",
      )
      .eq("case_id", caseRow.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .schema("crm")
      .from("case_events")
      .select("id, occurred_at, event_data")
      .eq("case_id", caseRow.id)
      .eq("event_type", "additional_documents_requested")
      .order("occurred_at", { ascending: true }),
  ]);

  const requiredCodes = new Set(
    (requiredRows ?? [])
      .filter((r) => r.requested_at_event_id === null && r.document_code)
      .map((r) => r.document_code as string),
  );

  // Project files into the client's plain shape, keyed by document_code. Also
  // build the legacy single-file projection the additional-docs panel needs.
  const filesByCode = new Map<string, ClientFile[]>();
  const latestByRequiredDocId = new Map<string, LatestDoc>();
  for (const doc of uploadedDocs ?? []) {
    const state = STATUS_TO_STATE[doc.status];
    if (doc.document_code && state) {
      const list = filesByCode.get(doc.document_code) ?? [];
      list.push({
        id: doc.id,
        state,
        fileName: doc.file_name,
        reason: doc.rejection_reason,
        fileGroupKey: doc.file_group_key,
        addedByFirm: doc.uploaded_by_client === false,
      });
      filesByCode.set(doc.document_code, list);
    }
    if (doc.required_document_id) {
      const ex = latestByRequiredDocId.get(doc.required_document_id);
      if (!ex || doc.version_number > ex.version_number) {
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
  }

  // Tolerant read of allows_multiple (see fetchAllowsMultipleByCode): a missing
  // column falls back to the legacy expected_quantity so the portal never breaks.
  const allowsMultipleByCode = await fetchAllowsMultipleByCode(
    supabase,
    caseRow.service_template_id,
  );
  const requirements: ClientRequirement[] = (templateRows ?? []).map((d) => ({
    code: d.document_code,
    label: d.document_label,
    acceptsMultiple:
      allowsMultipleByCode[d.document_code] ?? (d.expected_quantity ?? 1) > 1,
    required: requiredCodes.has(d.document_code),
    instructions: d.instructions,
    files: filesByCode.get(d.document_code) ?? [],
  }));

  // Additional-docs-requested groups (IRCC asks), unchanged in shape.
  const additionalDocsGroups: PortalAdditionalDocsGroup[] = (() => {
    const rowsByEvent = new Map<
      string,
      Array<{
        id: string;
        customLabel: string;
        dueDate: string | null;
        latest: LatestDoc | null;
      }>
    >();
    for (const r of requiredRows ?? []) {
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
    const groups: PortalAdditionalDocsGroup[] = [];
    for (const e of adEvents ?? []) {
      const rows = rowsByEvent.get(e.id);
      if (!rows) continue;
      const data =
        e.event_data &&
        typeof e.event_data === "object" &&
        !Array.isArray(e.event_data)
          ? (e.event_data as Record<string, unknown>)
          : {};
      groups.push({
        eventId: e.id,
        requestedAt: e.occurred_at,
        overallDueDate:
          typeof data.overall_due_date === "string"
            ? data.overall_due_date
            : null,
        notes: typeof data.notes === "string" ? data.notes : null,
        rows,
      });
    }
    return groups;
  })();

  const greetingName =
    client?.preferred_name?.trim() ||
    client?.given_names?.trim() ||
    client?.legal_name_full ||
    "there";

  const requiredCount = requirements.filter((r) => r.required).length;
  const showOriginalChecklist = !caseRow.additional_docs_only;

  return (
    <main className="min-h-dvh bg-[var(--surface-sunken)]">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-5">
          <Image
            src="/genzdatalabs-logo.png"
            alt="genzdatalabs Immigration"
            width={400}
            height={200}
            className="h-11 w-auto object-contain"
            priority
          />
          <p className="min-w-0 text-sm text-muted-foreground">
            Your case, {caseRow.case_number}, documents for {greetingName}
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-2xl space-y-4 px-5 py-7">
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-foreground">
          <p>
            Hi {greetingName},{" "}
            {caseRow.additional_docs_only
              ? "we need a few more documents for your application. Please add them below."
              : "please add the documents below so we can move your application forward."}
          </p>
          {showOriginalChecklist && (
            <p className="mt-2 text-muted-foreground">
              {requiredCount === 0
                ? "Nothing is required right now."
                : `${requiredCount} ${
                    requiredCount === 1 ? "document is" : "documents are"
                  } required.`}{" "}
              You can upload PDF, JPG, PNG, HEIC, DOC, or DOCX files, up to 4 MB
              each.
            </p>
          )}
        </div>

        {additionalDocsGroups.length > 0 && (
          <PortalAdditionalDocs token={token} groups={additionalDocsGroups} />
        )}

        {showOriginalChecklist && (
          <ClientChecklist token={token} requirements={requirements} />
        )}

        <p className="px-1 text-center text-xs text-muted-foreground">
          Need help? Reply to the email this link came from, or call our office
          at +1 416-386-5351.
        </p>
      </section>
    </main>
  );
}

import Image from "next/image";

import {
  DocumentChecklist,
  type FileRow,
  type LatestDoc,
  type TemplateDoc,
} from "@/app/(staff)/dashboard/cases/[id]/_components/document-checklist";
import { adminClient } from "@/lib/supabase/admin";

import { loadCaseByPortalToken } from "./actions";
import { ExpiredCard } from "./_components/expired-card";
import {
  PortalAdditionalDocs,
  type PortalAdditionalDocsGroup,
} from "./_components/portal-additional-docs";

// Always re-render server-side. The portal reflects review-state
// changes that may have just been written by staff; cached HTML would
// stale-out the rejection banners and accept pills.
export const dynamic = "force-dynamic";

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

  // Fetch the case's required-doc set, the template, the client name,
  // any uploaded files, and the additional-docs-requested events in
  // parallel.
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
      .from("clients")
      .select("legal_name_full, given_names, preferred_name")
      .eq("id", caseRow.client_id)
      .maybeSingle(),
    supabase
      .schema("files")
      .from("documents")
      .select(
        "id, document_code, required_document_id, status, file_name, mime_type, version_number, sharepoint_web_url, rejection_reason, file_group_key, created_at",
      )
      .eq("case_id", caseRow.id)
      .is("deleted_at", null),
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
  const templateDocs: TemplateDoc[] = (templateRows ?? []).map((d) => ({
    document_code: d.document_code,
    document_label: d.document_label,
    group_code: d.group_code,
    condition_label: d.condition_label,
    display_order: d.display_order,
    instructions: d.instructions,
    expected_quantity: d.expected_quantity ?? 1,
    is_required: requiredCodes.has(d.document_code),
    group: d.group,
  }));

  // Live files grouped by document_code for the multi-file checklist.
  // Mirrors the partial unique index uniq_document_live_per_group:
  // status != 'superseded' AND deleted_at IS NULL.
  const liveByCode = new Map<string, FileRow[]>();
  // Legacy single-file projection retained for the additional-docs panel
  // (which still consumes LatestDoc).
  const latestByRequiredDocId = new Map<string, LatestDoc>();
  for (const doc of uploadedDocs ?? []) {
    if (doc.document_code && doc.status !== "superseded") {
      const list = liveByCode.get(doc.document_code) ?? [];
      list.push({
        id: doc.id,
        status: doc.status,
        file_name: doc.file_name,
        mime_type: doc.mime_type,
        version_number: doc.version_number,
        rejection_reason: doc.rejection_reason,
        file_group_key: doc.file_group_key,
        created_at: doc.created_at,
      });
      liveByCode.set(doc.document_code, list);
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
  for (const list of liveByCode.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // Build additional-docs groups (mirror of staff page).
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
        e.event_data && typeof e.event_data === "object" && !Array.isArray(e.event_data)
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

  const requiredCount = templateDocs.filter((d) => d.is_required).length;
  const showOriginalChecklist = !caseRow.additional_docs_only;

  return (
    <main className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-5">
          <Image
            src="/logo.png"
            alt="Big Bang Immigration"
            width={400}
            height={200}
            className="h-12 w-auto object-contain"
            priority
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Your case · {caseRow.case_number}
            </p>
            <p className="text-sm font-medium text-stone-900">
              Documents for {greetingName}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-5 px-6 py-8">
        <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-700">
          <p>
            Hi {greetingName},{" "}
            {caseRow.additional_docs_only
              ? "IRCC has requested additional documents for your application. Please upload them below."
              : "please upload the documents below for your application."}
          </p>
          {showOriginalChecklist && (
            <p className="mt-2">
              Items marked with a red{" "}
              <span className="font-semibold text-red-600">*</span> are
              required ({requiredCount} required total). Optional items are
              welcome but not blocking.
            </p>
          )}
          <p className="mt-2 text-stone-500">
            Allowed file types: PDF, JPG, PNG, HEIC, DOC, DOCX. Max 4 MB
            per file.
          </p>
        </div>

        {additionalDocsGroups.length > 0 && (
          <PortalAdditionalDocs token={token} groups={additionalDocsGroups} />
        )}

        {showOriginalChecklist && (
          <DocumentChecklist
            caseId={caseRow.id}
            templateDocs={templateDocs}
            liveByCode={liveByCode}
            canEditRequired={false}
            canReview={false}
            canUpload={true}
            clientPortalToken={token}
          />
        )}

        <p className="text-center text-xs text-stone-500">
          Need help? Reply to the email this link came from, or contact
          our office at info@bigbangimmigration.com / +1 416-386-5351.
        </p>
      </section>
    </main>
  );
}

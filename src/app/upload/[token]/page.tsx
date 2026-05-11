import { createClient as createServiceClient } from "@supabase/supabase-js";
import Image from "next/image";

import {
  DocumentChecklist,
  type LatestDoc,
  type TemplateDoc,
} from "@/app/(staff)/dashboard/cases/[id]/_components/document-checklist";
import type { Database } from "@/lib/supabase/types";

import { loadCaseByPortalToken } from "./actions";
import { ExpiredCard } from "./_components/expired-card";

// Always re-render server-side. The portal reflects review-state
// changes that may have just been written by staff; cached HTML would
// stale-out the rejection banners and accept pills.
export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Service role not configured.");
  }
  return createServiceClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
  // and any uploaded files in parallel.
  const [
    { data: requiredRows },
    { data: templateRows },
    { data: client },
    { data: uploadedDocs },
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("case_required_documents")
      .select("document_code")
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
        "id, document_code, status, file_name, version_number, sharepoint_web_url, rejection_reason",
      )
      .eq("case_id", caseRow.id)
      .is("deleted_at", null),
  ]);

  const requiredCodes = new Set(
    (requiredRows ?? []).map((r) => r.document_code),
  );
  const templateDocs: TemplateDoc[] = (templateRows ?? []).map((d) => ({
    document_code: d.document_code,
    document_label: d.document_label,
    group_code: d.group_code,
    condition_label: d.condition_label,
    display_order: d.display_order,
    instructions: d.instructions,
    is_required: requiredCodes.has(d.document_code),
    group: d.group,
  }));

  const latestByCode = new Map<string, LatestDoc>();
  for (const doc of uploadedDocs ?? []) {
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

  const greetingName =
    client?.preferred_name?.trim() ||
    client?.given_names?.trim() ||
    client?.legal_name_full ||
    "there";

  const requiredCount = templateDocs.filter((d) => d.is_required).length;

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
            Hi {greetingName}, please upload the documents below for your
            application. Items marked with a red <span className="text-red-600 font-semibold">*</span>{" "}
            are required ({requiredCount} required total). Optional items
            are welcome but not blocking.
          </p>
          <p className="mt-2 text-stone-500">
            Allowed file types: PDF, JPG, PNG, HEIC, DOC, DOCX. Max 4 MB
            per file. If a document is rejected, you&apos;ll see a note
            from our team explaining what to fix — just upload a new
            version using the upload button on that row.
          </p>
        </div>

        <DocumentChecklist
          caseId={caseRow.id}
          templateDocs={templateDocs}
          latestByCode={latestByCode}
          canEditRequired={false}
          canReview={false}
          canUpload={true}
          clientPortalToken={token}
        />

        <p className="text-center text-xs text-stone-500">
          Need help? Reply to the email this link came from, or contact
          our office at info@bigbangimmigration.com / +1 416-386-5351.
        </p>
      </section>
    </main>
  );
}

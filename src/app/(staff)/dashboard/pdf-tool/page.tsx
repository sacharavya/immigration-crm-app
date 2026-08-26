import { redirect } from "next/navigation";

import type { CaseDocumentItem } from "@/components/pdf-tool/case-documents-panel";
import { EditorShell } from "@/components/pdf-tool/editor/editor-shell";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import {
  createFinalUploadSession,
  getCaseDocumentDownloadUrl,
  getCaseDriveFileDownloadUrl,
  listCaseFolderChildren,
} from "./actions";

export const dynamic = "force-dynamic";

const SUPPORTED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

export default async function PdfToolPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const me = await getStaff();
  if (!me) redirect("/login");

  const { case: caseId } = await searchParams;

  let caseDocuments: CaseDocumentItem[] = [];
  let validCaseId: string | undefined;
  let initialTitle: string | undefined;

  if (caseId) {
    const supabase = await createClient();
    const { data: caseRow } = await supabase
      .schema("crm")
      .from("cases")
      .select("id, case_number")
      .eq("id", caseId)
      .is("deleted_at", null)
      .maybeSingle();

    if (caseRow) {
      validCaseId = caseRow.id;
      // Per the original spec: {caseRef}_Submission_{YYYY-MM-DD}.
      initialTitle = `${caseRow.case_number}_Submission_${new Date()
        .toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}`;
      const { data: docs } = await supabase
        .schema("files")
        .from("documents")
        .select(
          "id, display_name, file_name, mime_type, file_size_bytes, category, status, sharepoint_item_id",
        )
        .eq("case_id", caseRow.id)
        .is("deleted_at", null)
        .not("sharepoint_item_id", "is", null)
        .not("status", "in", '("rejected","superseded")')
        .order("created_at", { ascending: true });

      caseDocuments = (docs ?? [])
        .filter((d) => SUPPORTED_MIMES.has((d.mime_type ?? "").toLowerCase()))
        .map((d) => ({
          id: d.id,
          name: d.display_name || d.file_name || "Document",
          mime: (d.mime_type ?? "application/pdf").toLowerCase(),
          sizeBytes: Number(d.file_size_bytes ?? 0),
          category: d.category,
        }));
    }
  }

  // Full-bleed: the editor brings its own chrome. The staff layout's scroll
  // container adds pb-8, hence the 2rem in the height calc.
  return (
    <div className="h-[calc(100dvh-2rem)]">
      <EditorShell
        caseDocuments={caseDocuments}
        getDownloadUrl={getCaseDocumentDownloadUrl}
        caseId={validCaseId}
        listCaseFolder={listCaseFolderChildren}
        getDriveFileUrl={getCaseDriveFileDownloadUrl}
        createFinalUpload={createFinalUploadSession}
        initialTitle={initialTitle}
      />
    </div>
  );
}

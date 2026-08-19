import Link from "next/link";
import { redirect } from "next/navigation";

import type { CaseDocumentItem } from "@/components/pdf-tool/case-documents-panel";
import { PdfTool } from "@/components/pdf-tool/pdf-tool";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { getCaseDocumentDownloadUrl } from "./actions";

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

  let caseLabel: string | null = null;
  let caseDocuments: CaseDocumentItem[] = [];

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
      caseLabel = caseRow.case_number;
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">
          Submission package builder
          {caseLabel && (
            <span className="ml-2 font-mono text-base text-stone-500">
              {caseLabel}
            </span>
          )}
        </h1>
        <p className="text-sm text-stone-500">
          Merge PDFs and images, reorder and rotate pages, and compress to a
          portal size limit - all in the browser, nothing leaves this device.
        </p>
        {caseLabel && caseId && (
          <p className="mt-1 text-sm text-stone-500">
            Working on case documents.{" "}
            <Link
              href={`/dashboard/cases/${caseId}`}
              className="text-[var(--navy)] hover:underline"
            >
              Back to case
            </Link>
          </p>
        )}
      </div>
      <PdfTool
        caseDocuments={caseDocuments}
        getDownloadUrl={getCaseDocumentDownloadUrl}
      />
    </div>
  );
}

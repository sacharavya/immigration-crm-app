import { DocumentRow } from "./document-row";

export type TemplateDoc = {
  document_code: string;
  document_label: string;
  group_code: string;
  is_required: boolean;
  condition_label: string | null;
  display_order: number;
  instructions: string | null;
  expected_quantity: number;
  allows_multiple?: boolean;
  group: { name: string; display_order: number } | null;
};

// File-row shape consumed by the multi-file checklist UI. One per live
// row in files.documents for the slot (status not superseded, not soft-
// deleted). For single-file slots the array has 0 or 1 entries and the
// row renders the existing single-file UI unchanged.
export type FileRow = {
  id: string;
  status: string;
  file_name: string | null;
  mime_type: string | null;
  version_number: number;
  rejection_reason: string | null;
  file_group_key: string;
  created_at: string;
  // Optional: only the staff case page selects these. The client upload
  // page omits them, so they stay optional to keep that call site valid.
  reviewed_by?: string | null;
  uploaded_by_client?: boolean;
};

// Legacy single-file shape kept for the additional-docs surface and
// other callers that haven't migrated yet. Equivalent to FileRow minus
// mime/group/created_at.
export type LatestDoc = {
  id: string;
  status: string;
  file_name: string | null;
  sharepoint_web_url: string | null;
  version_number: number;
  rejection_reason: string | null;
};

type Group = {
  code: string;
  name: string;
  displayOrder: number;
  docs: TemplateDoc[];
};

function groupDocs(docs: TemplateDoc[]): Group[] {
  const byCode = new Map<string, Group>();
  for (const d of docs) {
    const key = d.group_code;
    let g = byCode.get(key);
    if (!g) {
      g = {
        code: key,
        name: d.group?.name ?? key,
        displayOrder: d.group?.display_order ?? 1000,
        docs: [],
      };
      byCode.set(key, g);
    }
    g.docs.push(d);
  }
  return Array.from(byCode.values())
    .map((g) => ({
      ...g,
      docs: [...g.docs].sort((a, b) => a.display_order - b.display_order),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

// Item-level "received" derivation. A slot is "received" the moment
// it has at least one live file in (uploaded, accepted). This is the
// same threshold for every slot — multi-file slots no longer require
// hitting an expected_quantity target because the quantity field is
// deprecated (every slot accepts unlimited files by default; see the
// drop of the "Add another" cap in document-row.tsx).
export function itemReceived(files: FileRow[] | undefined): boolean {
  if (!files || files.length === 0) return false;
  return files.some(
    (f) => f.status === "uploaded" || f.status === "accepted",
  );
}

export function DocumentChecklist({
  caseId,
  templateDocs,
  liveByCode,
  canEditRequired,
  canReview,
  canUpload,
  clientPortalToken,
  shareButtonSlot,
}: {
  caseId: string;
  templateDocs: TemplateDoc[];
  liveByCode: Map<string, FileRow[]>;
  canEditRequired: boolean;
  canReview: boolean;
  canUpload: boolean;
  clientPortalToken?: string;
  shareButtonSlot?: React.ReactNode;
}) {
  const receivedCount = templateDocs.filter((d) =>
    itemReceived(liveByCode.get(d.document_code)),
  ).length;

  const groups = groupDocs(templateDocs);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Document checklist</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">
            {receivedCount} of {templateDocs.length} received
          </span>
          {shareButtonSlot}
        </div>
      </div>
      {templateDocs.length === 0 ? (
        <p className="text-sm text-stone-500">
          No documents in this service template.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.code}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                {g.name}
              </h3>
              <ul className="divide-y divide-stone-100">
                {g.docs.map((d) => (
                  <DocumentRow
                    key={d.document_code}
                    caseId={caseId}
                    templateDoc={{
                      document_code: d.document_code,
                      document_label: d.document_label,
                      is_required: d.is_required,
                      condition_label: d.condition_label,
                      instructions: d.instructions,
                      allows_multiple: d.allows_multiple ?? false,
                    }}
                    files={liveByCode.get(d.document_code) ?? []}
                    categoryLabel={g.name}
                    canEditRequired={canEditRequired}
                    canReview={canReview}
                    canUpload={canUpload}
                    clientPortalToken={clientPortalToken}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

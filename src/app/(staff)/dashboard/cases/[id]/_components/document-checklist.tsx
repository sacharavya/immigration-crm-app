import { DocumentRow } from "./document-row";

export type TemplateDoc = {
  document_code: string;
  document_label: string;
  group_code: string;
  is_required: boolean;
  condition_label: string | null;
  display_order: number;
  instructions: string | null;
  group: { name: string; display_order: number } | null;
};

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

export function DocumentChecklist({
  caseId,
  templateDocs,
  latestByCode,
  canEditRequired,
  canReview,
  canUpload,
  clientPortalToken,
  shareButtonSlot,
}: {
  caseId: string;
  templateDocs: TemplateDoc[];
  latestByCode: Map<string, LatestDoc>;
  canEditRequired: boolean;
  canReview: boolean;
  canUpload: boolean;
  clientPortalToken?: string;
  shareButtonSlot?: React.ReactNode;
}) {
  const isReceived = (code: string) => {
    const u = latestByCode.get(code);
    return Boolean(u && (u.status === "uploaded" || u.status === "accepted"));
  };

  const receivedCount = templateDocs.filter((d) =>
    isReceived(d.document_code),
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
                    }}
                    uploaded={latestByCode.get(d.document_code) ?? null}
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

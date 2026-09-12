import { ExternalLink } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

// FORMS-4: history of generated form fills for a case. Server component;
// fetches its own rows so the (already large) case page stays lean.
export async function FormFillsSection({ caseId }: { caseId: string }) {
  const supabase = await createClient();
  const { data: fills } = await supabase
    .schema("crm")
    .from("form_fills")
    .select(
      "id, file_name, sharepoint_web_url, unmapped_fields, generated_at, generated_by, participant:case_participants(client:clients(legal_name_full)), version:form_versions(version_label, status, form:forms(form_number, title))",
    )
    .eq("case_id", caseId)
    .order("generated_at", { ascending: false })
    .limit(50);

  if (!fills || fills.length === 0) return null;

  return (
    <div className="border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-5 py-3">
        <h2 className="text-sm font-medium text-stone-700">Generated forms</h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Filled from intake data; saved in the case&apos;s Final folder.
        </p>
      </div>
      <ul className="divide-y divide-stone-100">
        {fills.map((f) => {
          const blanks = Array.isArray(f.unmapped_fields)
            ? (f.unmapped_fields as Array<{ reason: string }>).filter(
                (u) => u.reason !== "skip" && u.reason !== "manual",
              ).length
            : 0;
          const deprecated = f.version?.status === "deprecated";
          return (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-900">
                    {f.version?.form?.form_number}
                  </span>
                  <span className="text-stone-500">
                    {f.participant?.client?.legal_name_full}
                  </span>
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">
                    {f.version?.version_label}
                  </span>
                  {deprecated && (
                    <span
                      className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"
                      title="A newer version of this form has been activated since this fill was generated."
                    >
                      outdated version
                    </span>
                  )}
                  {blanks > 0 && (
                    <span className="text-[11px] text-stone-400">
                      {blanks} blank{blanks === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-stone-400">
                {new Date(f.generated_at).toLocaleDateString("en-CA")}
              </span>
              {f.sharepoint_web_url && (
                <a
                  href={f.sharepoint_web_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--navy)] underline-offset-2 hover:underline"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

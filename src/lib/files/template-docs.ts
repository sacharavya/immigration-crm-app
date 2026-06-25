import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Tolerant read of the allows_multiple flag, isolated from the main checklist
// query on purpose. The main template_documents SELECT must NOT reference
// allows_multiple: if it did and the column were missing (code deployed before
// the migration applied), the whole checklist query would error and render
// empty. Instead we fetch just (document_code, allows_multiple) here and, if
// that fails for any reason, return an empty map so callers fall back to the
// legacy expected_quantity heuristic. The checklist always renders.
//
// Once the migration is applied this is a cheap extra query; before it is
// applied it degrades gracefully. Callers merge the result by document_code.
export async function fetchAllowsMultipleByCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  serviceTemplateId: string,
): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await supabase
      .schema("ref")
      .from("template_documents")
      .select("document_code, allows_multiple")
      .eq("service_template_id", serviceTemplateId);
    if (error || !data) return {};
    const out: Record<string, boolean> = {};
    for (const row of data as Array<{
      document_code: string;
      allows_multiple: boolean | null;
    }>) {
      out[row.document_code] = !!row.allows_multiple;
    }
    return out;
  } catch {
    return {};
  }
}

// Same tolerant read, keyed by template_document id, used by the checklist
// editor, whose rows span multiple template versions so document_code is not
// unique. Returns {} (everything defaults to single) if the column is missing.
export async function fetchAllowsMultipleByDocId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  docIds: string[],
): Promise<Record<string, boolean>> {
  if (docIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .schema("ref")
      .from("template_documents")
      .select("id, allows_multiple")
      .in("id", docIds);
    if (error || !data) return {};
    const out: Record<string, boolean> = {};
    for (const row of data as Array<{
      id: string;
      allows_multiple: boolean | null;
    }>) {
      out[row.id] = !!row.allows_multiple;
    }
    return out;
  } catch {
    return {};
  }
}

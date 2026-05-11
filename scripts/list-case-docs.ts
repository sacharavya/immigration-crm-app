/**
 * One-shot: print the document checklist for a given case_number,
 * showing which docs are required, optional, and conditional.
 *
 * Run:  npx tsx --env-file=.env.local scripts/list-case-docs.ts BB-2026-0017
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const caseNumber = process.argv[2];
  if (!caseNumber) {
    throw new Error("Pass a case number, e.g. BB-2026-0017");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: c } = await sb
    .schema("crm")
    .from("cases")
    .select("id, case_number, service_template_id, service_type_id")
    .eq("case_number", caseNumber)
    .maybeSingle();
  if (!c) throw new Error(`Case ${caseNumber} not found`);

  const { data: variant } = await sb
    .schema("ref")
    .from("service_types")
    .select("name")
    .eq("id", c.service_type_id)
    .maybeSingle();

  const { data: docs } = await sb
    .schema("ref")
    .from("template_documents")
    .select("document_code, document_label, group_code, is_required, condition_label, display_order")
    .eq("service_template_id", c.service_template_id)
    .order("group_code")
    .order("display_order");

  console.log(`\nCase ${c.case_number}  variant: ${variant?.name ?? "?"}`);
  console.log(`Total: ${docs?.length ?? 0} documents on the template\n`);

  const required: typeof docs = [];
  const optional: typeof docs = [];
  const conditional: typeof docs = [];
  for (const d of docs ?? []) {
    if (d.condition_label) conditional.push(d);
    else if (d.is_required) required.push(d);
    else optional.push(d);
  }

  function printRow(d: NonNullable<typeof docs>[number]) {
    const cond = d.condition_label ? `  (${d.condition_label})` : "";
    console.log(`  [${d.group_code}] ${d.document_label}${cond}`);
  }

  console.log(`REQUIRED (${required.length})`);
  required.forEach(printRow);
  console.log(`\nCONDITIONAL (${conditional.length})  — only required when condition is met`);
  conditional.forEach(printRow);
  console.log(`\nOPTIONAL (${optional.length})`);
  optional.forEach(printRow);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

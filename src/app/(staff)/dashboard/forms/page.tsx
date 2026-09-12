import { FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { NewFormDialog } from "./_components/new-form-dialog";
import {
  FORM_TYPE_LABELS,
  ISSUING_BODIES,
  ISSUING_BODY_LABELS,
} from "./constants";

export const dynamic = "force-dynamic";

// FORMS-1: registry of official immigration forms and firm templates.
// Readable by all staff; writes gate on manage_forms.

type Props = {
  searchParams: Promise<{ body?: string; tag?: string; q?: string }>;
};

export default async function FormsPage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  const canManage = staffCan(me, "manage_forms");

  const sp = await searchParams;
  const filterBody = ISSUING_BODIES.find((b) => b === sp.body) ?? null;
  const filterTag = sp.tag?.trim() || null;
  const query = sp.q?.trim().toLowerCase() || null;

  const supabase = await createClient();
  const [{ data: formsData }, { data: versionsData }] = await Promise.all([
    supabase
      .schema("crm")
      .from("forms")
      .select(
        "id, form_number, title, issuing_body, form_type, program_tags, scope, is_active, updated_at",
      )
      .order("form_number"),
    supabase
      .schema("crm")
      .from("form_versions")
      .select("form_id, version_label, status"),
  ]);

  const activeVersionByForm = new Map(
    (versionsData ?? [])
      .filter((v) => v.status === "active")
      .map((v) => [v.form_id, v.version_label]),
  );
  const versionCountByForm = new Map<string, number>();
  for (const v of versionsData ?? []) {
    versionCountByForm.set(
      v.form_id,
      (versionCountByForm.get(v.form_id) ?? 0) + 1,
    );
  }

  const allTags = [
    ...new Set((formsData ?? []).flatMap((f) => f.program_tags ?? [])),
  ].sort();

  const forms = (formsData ?? []).filter((f) => {
    if (filterBody && f.issuing_body !== filterBody) return false;
    if (filterTag && !(f.program_tags ?? []).includes(filterTag)) return false;
    if (
      query &&
      !f.form_number.toLowerCase().includes(query) &&
      !f.title.toLowerCase().includes(query)
    )
      return false;
    return true;
  });

  const filterHref = (next: { body?: string | null; tag?: string | null }) => {
    const params = new URLSearchParams();
    const body = next.body === undefined ? filterBody : next.body;
    const tag = next.tag === undefined ? filterTag : next.tag;
    if (body) params.set("body", body);
    if (tag) params.set("tag", tag);
    if (sp.q) params.set("q", sp.q);
    const qs = params.toString();
    return qs ? `/dashboard/forms?${qs}` : "/dashboard/forms";
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Forms</h1>
          <p className="mt-1 text-sm text-stone-500">
            Versioned registry of official immigration forms and firm
            templates.
          </p>
        </div>
        {canManage && <NewFormDialog />}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <form action="/dashboard/forms" className="flex items-center gap-2">
          {filterBody && <input type="hidden" name="body" value={filterBody} />}
          {filterTag && <input type="hidden" name="tag" value={filterTag} />}
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search number or title..."
            className="h-9 w-64 rounded-md border border-stone-200 bg-white px-3 text-sm"
          />
        </form>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Link
            href={filterHref({ body: null })}
            className={`rounded-full border px-2.5 py-1 ${!filterBody ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}
          >
            All bodies
          </Link>
          {ISSUING_BODIES.map((b) => (
            <Link
              key={b}
              href={filterHref({ body: b })}
              className={`rounded-full border px-2.5 py-1 ${filterBody === b ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}
            >
              {ISSUING_BODY_LABELS[b]}
            </Link>
          ))}
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {allTags.map((t) => (
              <Link
                key={t}
                href={filterHref({ tag: filterTag === t ? null : t })}
                className={`rounded-full border px-2.5 py-1 ${filterTag === t ? "border-[var(--gold)] bg-[var(--accent)] text-[var(--primary)]" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}
              >
                {t}
              </Link>
            ))}
          </div>
        )}
      </div>

      {forms.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-stone-400">
          <FileText className="h-8 w-8" />
          <p className="text-sm">
            {(formsData ?? []).length === 0
              ? "No forms registered yet."
              : "No forms match these filters."}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-stone-300 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 font-medium">Form</th>
                <th className="px-4 py-3 font-medium">Issuing body</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Active version</th>
                <th className="px-4 py-3 font-medium">Versions</th>
                <th className="px-4 py-3 font-medium">Program tags</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-stone-100 last:border-0 hover:bg-stone-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/forms/${f.id}`}
                      className="font-medium text-stone-900 hover:text-[var(--primary)] hover:underline"
                    >
                      {f.form_number}
                    </Link>
                    <div className="max-w-72 truncate text-xs text-stone-500">
                      {f.title}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {ISSUING_BODY_LABELS[f.issuing_body as keyof typeof ISSUING_BODY_LABELS] ?? f.issuing_body}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {FORM_TYPE_LABELS[f.form_type as keyof typeof FORM_TYPE_LABELS] ?? f.form_type}
                  </td>
                  <td className="px-4 py-3">
                    {activeVersionByForm.get(f.id) ? (
                      <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        {activeVersionByForm.get(f.id)}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400">none</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {versionCountByForm.get(f.id) ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {(f.program_tags ?? []).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {new Date(f.updated_at).toLocaleDateString("en-CA")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${f.is_active ? "bg-stone-100 text-stone-600" : "bg-rose-50 text-rose-700"}`}
                    >
                      {f.is_active ? "active" : "retired"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

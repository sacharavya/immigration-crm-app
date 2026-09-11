import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { UploadVersionDialog } from "../_components/upload-version-dialog";
import { VersionActions } from "../_components/version-actions";
import { FORM_TYPE_LABELS, ISSUING_BODY_LABELS } from "../constants";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-600",
  active: "bg-green-100 text-green-800",
  deprecated: "bg-amber-50 text-amber-700",
};

function fmtDate(v: string | null) {
  return v ? new Date(v).toLocaleDateString("en-CA") : null;
}

export default async function FormDetailPage({ params }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  const canManage = staffCan(me, "manage_forms");

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: form }, { data: versions }] = await Promise.all([
    supabase
      .schema("crm")
      .from("forms")
      .select(
        "id, form_number, title, issuing_body, form_type, program_tags, scope, is_active",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .schema("crm")
      .from("form_versions")
      .select(
        "id, version_label, status, published_at, activated_at, superseded_at, file_name, file_size_bytes, notes, created_at, sharepoint_item_id",
      )
      .eq("form_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!form) notFound();

  return (
    <div className="p-6">
      <Link
        href="/dashboard/forms"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[var(--primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Forms
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            {form.form_number}
            {!form.is_active && (
              <span className="ml-2 rounded bg-rose-50 px-2 py-0.5 text-xs font-normal text-rose-700">
                retired
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-stone-600">{form.title}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
            <span className="rounded bg-stone-100 px-2 py-0.5">
              {ISSUING_BODY_LABELS[form.issuing_body as keyof typeof ISSUING_BODY_LABELS] ?? form.issuing_body}
            </span>
            <span className="rounded bg-stone-100 px-2 py-0.5">
              {FORM_TYPE_LABELS[form.form_type as keyof typeof FORM_TYPE_LABELS] ?? form.form_type}
            </span>
            <span className="rounded bg-stone-100 px-2 py-0.5">
              {form.scope}
            </span>
            {(form.program_tags ?? []).map((t: string) => (
              <span key={t} className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                {t}
              </span>
            ))}
          </div>
        </div>
        {canManage && <UploadVersionDialog formId={form.id} />}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Version history
      </h2>
      {(versions ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-stone-400">
          No versions uploaded yet.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-stone-300 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium">Activated</th>
                <th className="px-4 py-3 font-medium">Superseded</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(versions ?? []).map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-stone-100 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-900">
                      {v.version_label}
                    </div>
                    {v.notes && (
                      <div
                        className="max-w-64 truncate text-xs text-stone-400"
                        title={v.notes}
                      >
                        {v.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_STYLES[v.status] ?? ""}`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {fmtDate(v.published_at) ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {fmtDate(v.activated_at) ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {fmtDate(v.superseded_at) ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {fmtDate(v.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {v.sharepoint_item_id && (
                        <a
                          href={`/api/forms/blank/${v.id}`}
                          className="inline-flex items-center gap-1 text-xs text-[var(--navy)] underline-offset-2 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" /> Blank
                        </a>
                      )}
                      {canManage && (
                        <VersionActions
                          versionId={v.id}
                          status={v.status}
                        />
                      )}
                    </div>
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

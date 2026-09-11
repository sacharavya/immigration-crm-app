import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import type { FormMapping } from "@/lib/forms/mapping";
import type { FormFieldSchema } from "@/lib/forms/types";
import { createClient } from "@/lib/supabase/server";

import { MappingEditor } from "../../../_components/mapping-editor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; versionId: string }> };

export default async function MappingPage({ params }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "manage_forms")) redirect("/dashboard/forms");

  const { id, versionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(versionId)) {
    notFound();
  }

  const supabase = await createClient();
  const [{ data: form }, { data: version }] = await Promise.all([
    supabase
      .schema("crm")
      .from("forms")
      .select("id, form_number, title")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .schema("crm")
      .from("form_versions")
      .select("id, form_id, version_label, status, field_schema_json, mapping_json")
      .eq("id", versionId)
      .maybeSingle(),
  ]);
  if (!form || !version || version.form_id !== form.id) notFound();

  return (
    <div className="flex h-full flex-col p-6">
      <Link
        href={`/dashboard/forms/${form.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[var(--primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> {form.form_number}
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-stone-900">
        Field mapping · {version.version_label}
        <span className="ml-2 align-middle text-xs font-normal text-stone-500">
          {version.status}
        </span>
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        Point each form field at a profile path, a constant, or mark it
        manual. Required fields must be resolved before this version can
        activate.
      </p>

      <div className="mt-5 min-h-0 flex-1">
        <MappingEditor
          versionId={version.id}
          editable={version.status !== "deprecated"}
          fields={(version.field_schema_json ?? []) as FormFieldSchema[]}
          initialMapping={(version.mapping_json ?? {}) as FormMapping}
        />
      </div>
    </div>
  );
}

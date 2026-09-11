"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan, type StaffWithOverrides } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { ensureFormsLibraryFolder } from "@/lib/graph/folders";
import { uploadFile } from "@/lib/graph/uploads";
import { createClient } from "@/lib/supabase/server";

import { FORM_TYPES, ISSUING_BODIES } from "./constants";

// FORMS-1: registry CRUD + version lifecycle. All writes gate on
// manage_forms (super_user + admin); RLS enforces the same rule in SQL.

const createFormSchema = z.object({
  form_number: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(300),
  issuing_body: z.enum(ISSUING_BODIES),
  form_type: z.enum(FORM_TYPES),
  program_tags: z.array(z.string().trim().min(1).max(40)).max(20),
  scope: z.enum(["global", "firm"]).default("global"),
});

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { error: string }
  : ({ ok: true } & T) | { error: string };

async function gateManageForms(): Promise<
  { error: string } | { me: StaffWithOverrides }
> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_forms")) {
    return { error: "You don't have permission to manage forms." };
  }
  return { me };
}

function rev(formId?: string) {
  revalidatePath("/dashboard/forms");
  if (formId) revalidatePath(`/dashboard/forms/${formId}`);
}

export async function createForm(
  input: z.input<typeof createFormSchema>,
): Promise<ActionResult<{ id: string }>> {
  const g = await gateManageForms();
  if ("error" in g) return g;

  const parsed = createFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("crm")
    .from("forms")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) {
    return {
      error: error.code === "23505"
        ? "A form with this number already exists."
        : error.message,
    };
  }
  rev();
  return { ok: true, id: data.id };
}

export async function setFormActive(
  formId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const g = await gateManageForms();
  if ("error" in g) return g;

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("forms")
    .update({ is_active: isActive })
    .eq("id", formId);
  if (error) return { error: error.message };
  rev(formId);
  return { ok: true };
}

// Upload arrives as FormData because server actions cannot take a File in a
// plain object. The blank PDF goes to OneDrive "Forms Library/<form number>/"
// named "<version_label>.pdf"; sha256 is computed here so duplicate bytes for
// the same form are rejected before anything is stored.
const uploadVersionSchema = z.object({
  form_id: z.string().uuid(),
  version_label: z.string().trim().min(1).max(60),
  published_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

export async function uploadFormVersion(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const g = await gateManageForms();
  if ("error" in g) return g;

  const parsed = uploadVersionSchema.safeParse({
    form_id: formData.get("form_id"),
    version_label: formData.get("version_label"),
    published_at: (formData.get("published_at") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF file to upload." };
  }
  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are accepted." };
  }

  const supabase = await createClient();
  const { data: form, error: formErr } = await supabase
    .schema("crm")
    .from("forms")
    .select("id, form_number")
    .eq("id", parsed.data.form_id)
    .single();
  if (formErr || !form) return { error: "Form not found." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  // Duplicate-bytes check before touching OneDrive.
  const { count } = await supabase
    .schema("crm")
    .from("form_versions")
    .select("id", { count: "exact", head: true })
    .eq("form_id", form.id)
    .eq("file_sha256", sha256);
  if ((count ?? 0) > 0) {
    return { error: "This exact file is already uploaded for this form." };
  }

  let uploaded;
  try {
    const { driveId, folderItemId } = await ensureFormsLibraryFolder(
      form.form_number,
    );
    uploaded = await uploadFile(
      driveId,
      folderItemId,
      `${parsed.data.version_label}.pdf`,
      bytes,
      "application/pdf",
    );
    const { data, error } = await supabase
      .schema("crm")
      .from("form_versions")
      .insert({
        form_id: form.id,
        version_label: parsed.data.version_label,
        sharepoint_drive_id: driveId,
        sharepoint_item_id: uploaded.id,
        sharepoint_web_url: uploaded.webUrl,
        file_name: uploaded.name,
        file_size_bytes: file.size,
        file_sha256: sha256,
        published_at: parsed.data.published_at,
        notes: parsed.data.notes,
        created_by: g.me.id,
      })
      .select("id")
      .single();
    if (error) {
      return {
        error: error.code === "23505"
          ? "A version with this label already exists for this form."
          : error.message,
      };
    }
    rev(form.id);
    return { ok: true, id: data.id };
  } catch (err) {
    console.error("[forms] version upload failed:", err);
    return { error: "Upload to OneDrive failed. Please try again." };
  }
}

export async function activateVersion(
  versionId: string,
): Promise<ActionResult> {
  const g = await gateManageForms();
  if ("error" in g) return g;

  const supabase = await createClient();
  // The lifecycle trigger enforces the file + required-mapping gates and
  // deprecates the previously active version atomically.
  const { data, error } = await supabase
    .schema("crm")
    .from("form_versions")
    .update({ status: "active" })
    .eq("id", versionId)
    .eq("status", "draft")
    .select("form_id")
    .maybeSingle();
  if (error) {
    return {
      error: error.message.includes("Cannot activate")
        ? error.message
        : "Could not activate this version.",
    };
  }
  if (!data) return { error: "Only draft versions can be activated." };
  rev(data.form_id);
  return { ok: true };
}

export async function deprecateVersion(
  versionId: string,
): Promise<ActionResult> {
  const g = await gateManageForms();
  if ("error" in g) return g;

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("crm")
    .from("form_versions")
    .update({ status: "deprecated" })
    .eq("id", versionId)
    .eq("status", "active")
    .select("form_id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Only the active version can be deprecated." };
  rev(data.form_id);
  return { ok: true };
}

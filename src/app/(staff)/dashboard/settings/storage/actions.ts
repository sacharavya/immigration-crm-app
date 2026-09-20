"use server";

import { requireStaffTenantId } from "@/lib/tenant/context";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { IMPLEMENTED_PROVIDERS } from "@/lib/storage/resolve";
import { createClient } from "@/lib/supabase/server";

// Single mutation: persists the firm-wide crm.storage_settings singleton.
// Gated by manage_settings (super_user + admin), matching the SQL policy.
//
// Changing these fields redirects where NEW folders and uploads go. Files
// already in the old library keep their stored drive + item ids, so they
// stay readable — this is not a migration tool, and the UI says so.

type Ok = { ok: true };
type Err = { ok?: false; error: string };
export type StorageSettingsResult = Ok | Err;

const schema = z.object({
  provider: z.enum(["onedrive", "google_drive"]),
  // "" from the form means "fall back to GRAPH_DOCUMENT_LIBRARY_ID".
  drive_id: z.string().trim().max(500).nullable().or(z.literal("")),
  // Path prefix; "" anchors at the drive root. Reject absolute paths and
  // traversal so a typo can't point the tree somewhere surprising.
  root_folder: z
    .string()
    .trim()
    .max(400)
    .refine((v) => !v.startsWith("/"), "Leave off the leading slash.")
    .refine(
      (v) => !v.split("/").some((p) => p.trim() === ".." || p.trim() === "."),
      "Path segments cannot be . or ..",
    ),
});

export type StorageSettingsInput = z.infer<typeof schema>;

export async function updateStorageSettings(
  raw: unknown,
): Promise<StorageSettingsResult> {
  const staff = await getStaff();
  if (!staff) return { error: "Not authenticated" };
  if (!staffCan(staff, "manage_settings")) return { error: "Not authorized" };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  // Refuse to strand the firm on a backend with no adapter. The column
  // accepts the value so the schema is ready; the app gates it here.
  if (!IMPLEMENTED_PROVIDERS.has(input.provider)) {
    return {
      error:
        "Google Drive support is not available yet. Uploads would fail immediately, so the change was not saved.",
    };
  }

  const driveId = input.drive_id?.trim() || null;
  if (!driveId && !process.env.GRAPH_DOCUMENT_LIBRARY_ID?.trim()) {
    return {
      error:
        "Enter a document library id — there is no GRAPH_DOCUMENT_LIBRARY_ID fallback configured on this deployment.",
    };
  }

  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .schema("crm")
    .from("storage_settings")
    .select("id")
    .maybeSingle();

  if (readErr) return { error: readErr.message };
  if (!existing) {
    return {
      error:
        "Storage settings row missing. Re-apply the storage settings migration.",
    };
  }

  const { error } = await supabase
    .schema("crm")
    .from("storage_settings")
    .update({
      provider: input.provider,
      drive_id: driveId,
      root_folder: input.root_folder,
      updated_by: staff.id,
    })
    .eq("id", existing.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings/storage");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Connected account
// ---------------------------------------------------------------------------

export async function disconnectAccount(): Promise<
  { ok: true } | { ok?: false; error: string }
> {
  const staff = await getStaff();
  if (!staff) return { error: "Not authenticated" };
  if (!staffCan(staff, "manage_settings")) return { error: "Not authorized" };

  const tenantId = await requireStaffTenantId();
  // Deleting the row destroys the encrypted refresh token; revoking at the
  // provider is the firm's own choice from their account security page.
  const { disconnect } = await import("@/lib/connections/store");
  await disconnect(tenantId);

  revalidatePath("/dashboard/settings/storage");
  return { ok: true };
}

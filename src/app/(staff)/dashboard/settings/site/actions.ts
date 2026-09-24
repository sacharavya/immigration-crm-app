"use server";

import { fileTypeFromBuffer } from "file-type";
import { revalidatePath } from "next/cache";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { requireStaffTenantId } from "@/lib/tenant/context";

// Site settings for a firm. Today that means the logo their staff and their
// clients see; the rest of the firm identity (address, payment recipient)
// follows the same shape.

type Ok = { ok: true; logoUrl: string | null };
type Err = { ok?: false; error: string };
export type SiteSettingsResult = Ok | Err;

// Raster only. An SVG can carry script and would be served from the storage
// origin, so it is refused even though it would scale better.
const ALLOWED = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);
const MAX_BYTES = 2 * 1024 * 1024;

export async function uploadFirmLogo(
  form: FormData,
): Promise<SiteSettingsResult> {
  const staff = await getStaff();
  if (!staff) return { error: "Not authenticated" };
  if (!staffCan(staff, "manage_settings")) return { error: "Not authorized" };

  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That image is over 2MB. A logo should be far smaller." };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());

  // Trust the bytes, not the declared type or the extension — the browser's
  // Content-Type is attacker-controlled on a direct POST.
  const detected = await fileTypeFromBuffer(buffer);
  const ext = detected ? ALLOWED.get(detected.mime) : undefined;
  if (!ext) {
    return { error: "Use a PNG, JPEG or WebP image." };
  }

  const tenantId = await requireStaffTenantId();
  const supabase = await createClient();

  // Path is <tenant>/logo.<ext>; the bucket policy requires the first segment
  // to be the writer's own tenant, so a firm cannot overwrite another's.
  const path = `${tenantId}/logo.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("branding")
    .upload(path, buffer, {
      contentType: detected!.mime,
      upsert: true,
    });
  if (uploadErr) return { error: uploadErr.message };

  // Built from the browser-facing URL, not the client's: inside Docker the
  // server reaches Supabase by another name, and this URL is what <img> loads.
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding/${path}`;

  // Cache-bust, or a replaced logo keeps showing the old one: the path is
  // stable by design so that old uploads don't accumulate.
  const versioned = `${publicUrl}?v=${Date.now()}`;

  // Through the setter, not a direct UPDATE: firm staff hold only SELECT on
  // crm.tenants, so a plain update matched zero rows and PostgREST reported
  // no error — the upload looked like it worked while the brand never moved.
  const { error } = await supabase
    .schema("crm")
    .rpc("set_tenant_logo", { p_logo_url: versioned });
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { ok: true, logoUrl: versioned };
}

export async function removeFirmLogo(): Promise<SiteSettingsResult> {
  const staff = await getStaff();
  if (!staff) return { error: "Not authenticated" };
  if (!staffCan(staff, "manage_settings")) return { error: "Not authorized" };

  const tenantId = await requireStaffTenantId();
  const supabase = await createClient();

  // Best effort: the row is the source of truth, so clearing it is what
  // actually reverts the brand even if the object lingers.
  await supabase.storage
    .from("branding")
    .remove([`${tenantId}/logo.png`, `${tenantId}/logo.jpg`, `${tenantId}/logo.webp`]);

  const { error } = await supabase
    .schema("crm")
    .rpc("set_tenant_logo", {});  // omitted = clear it
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { ok: true, logoUrl: null };
}

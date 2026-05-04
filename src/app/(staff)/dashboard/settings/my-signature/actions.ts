"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

// Max signature payload size, post-decoding. Signatures are PNGs at ~30KB
// in practice; 2 MB is a generous upper bound that protects the DB
// column from accidental upload of full-resolution photos.
const MAX_BYTES = 2 * 1024 * 1024;

const ACCEPTED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/heic",
]);

const setSignatureSchema = z.object({
  method: z.enum(["drawn", "uploaded"]),
  imageDataUrl: z
    .string()
    .regex(
      /^data:image\/(png|jpeg|jpg|heic);base64,/i,
      "Image must be a PNG/JPEG/HEIC data URL",
    ),
  printedName: z.string().trim().min(1, "Printed name is required").max(200),
});

export async function setStaffSignature(
  input: z.input<typeof setSignatureSchema>,
): Promise<{ ok: true } | { error: string }> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_own_signature")) {
    return {
      error: "You don't have permission to manage your signature.",
    };
  }

  const parsed = setSignatureSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Sanity-check the encoded payload size + mime type before persisting.
  const match = parsed.data.imageDataUrl.match(
    /^data:(image\/[a-z]+);base64,(.*)$/i,
  );
  if (!match) return { error: "Could not parse signature image" };
  const mimeType = match[1].toLowerCase();
  if (!ACCEPTED_MIME.has(mimeType)) {
    return { error: `Unsupported image type: ${mimeType}` };
  }
  // Base64 expands ~4/3; reverse it for an approximate decoded byte count.
  const approxBytes = Math.floor((match[2].length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    return { error: "Signature image must be under 2 MB" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("staff")
    .update({
      signature_image_url: parsed.data.imageDataUrl,
      signature_image_set_at: new Date().toISOString(),
      printed_name_for_signature: parsed.data.printedName,
      signature_capture_method: parsed.data.method,
    })
    .eq("id", me.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings/my-signature");
  return { ok: true };
}

export async function removeStaffSignature(): Promise<
  { ok: true } | { error: string }
> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_own_signature")) {
    return {
      error: "You don't have permission to manage your signature.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("staff")
    .update({
      signature_image_url: null,
      signature_image_set_at: null,
      printed_name_for_signature: null,
      signature_capture_method: null,
    })
    .eq("id", me.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings/my-signature");
  return { ok: true };
}

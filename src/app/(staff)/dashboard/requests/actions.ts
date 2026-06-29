"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

const dismissSchema = z.object({ requestId: z.string().uuid() });

export type DismissRequestResult = { ok: true } | { error: string };

export async function dismissRequest(
  input: z.infer<typeof dismissSchema>,
): Promise<DismissRequestResult> {
  const parsed = dismissSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid request" };

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "create_cases")) {
    return { error: "You don't have permission to handle case requests." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("case_requests")
    .update({
      status: "dismissed",
      handled_by: me.id,
      handled_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/dashboard/requests");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

// Lets a firm raise a complaint, bug or request with the platform operator.
// tenant_id is filled by the column default (crm.current_tenant_id()), and
// the RLS WITH CHECK re-asserts it, so a firm cannot file under another.

type Ok = { ok: true };
type Err = { ok?: false; error: string };
export type FeedbackResult = Ok | Err;

const schema = z.object({
  kind: z.enum(["complaint", "bug", "feature_request", "question"]),
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(5000),
});

export type FeedbackInput = z.infer<typeof schema>;

export async function submitFeedback(raw: unknown): Promise<FeedbackResult> {
  const staff = await getStaff();
  if (!staff) return { error: "Not authenticated" };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("platform")
    .from("feedback")
    .insert({ ...parsed.data, submitted_by: staff.id });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/feedback");
  return { ok: true };
}

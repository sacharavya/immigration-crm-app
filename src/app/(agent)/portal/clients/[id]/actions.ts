"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAgent } from "@/lib/auth/agent";
import { createClient } from "@/lib/supabase/server";

const requestCaseSchema = z.object({
  clientId: z.string().uuid(),
  // Optional: the agent may not know the exact stream. Empty string -> null.
  serviceTypeId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
    z.string().uuid().optional(),
  ),
  note: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z.string().max(2000).optional(),
  ),
});

export type RequestCaseResult = { ok: true } | { error: string };

export async function requestCase(
  payload: unknown,
): Promise<RequestCaseResult> {
  const agent = await getAgent();
  if (!agent) return { error: "Not authorized" };

  const parsed = requestCaseSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }
  const { clientId, serviceTypeId, note } = parsed.data;

  const supabase = await createClient();

  // RLS (case_requests_agent_insert) plus the scrub trigger enforce that the
  // client is one of this agent's own and that the row is attributed to them;
  // we set agent_id here so the row matches WITH CHECK.
  const { error } = await supabase
    .schema("crm")
    .from("case_requests")
    .insert({
      client_id: clientId,
      service_type_id: serviceTypeId ?? null,
      note: note ?? null,
      agent_id: agent.id,
    });

  if (error) return { error: error.message };

  revalidatePath(`/portal/clients/${clientId}`);
  return { ok: true };
}

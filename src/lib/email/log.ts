import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

type Args = {
  supabase: SupabaseClient<Database>;
  caseId?: string | null;
  clientId?: string | null;
  staffId?: string | null;
  to: string | string[];
  subject: string;
  body: string;
};

// Logs an outbound email to crm.communications. Does its own try/catch;
// a logging failure must never roll back the calling action. The
// schema's CHECK constraint requires either case_id or client_id, so
// we silently skip writes that would violate it (e.g. staff invites).
export async function logEmail(args: Args): Promise<void> {
  if (!args.caseId && !args.clientId) return;
  try {
    const recipients = Array.isArray(args.to) ? args.to : [args.to];
    await args.supabase
      .schema("crm")
      .from("communications")
      .insert({
        case_id: args.caseId ?? null,
        client_id: args.clientId ?? null,
        channel: "email",
        direction: "outbound",
        subject: args.subject,
        body: args.body,
        to_addresses: recipients,
        occurred_at: new Date().toISOString(),
        handled_by: args.staffId ?? null,
        logged_by: args.staffId ?? null,
      });
  } catch (err) {
    console.warn("[email] logEmail failed:", err);
  }
}

import { redirect } from "next/navigation";

import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { FeedbackForm } from "./_components/feedback-form";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const me = await getStaff();
  if (!me) redirect("/login");

  const supabase = await createClient();
  // RLS limits this to the firm's own tickets.
  const { data: mine } = await supabase
    .schema("platform")
    .from("feedback")
    .select("id, kind, subject, body, status, admin_response, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-xl font-semibold text-stone-900">
          Feedback &amp; support
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Report a problem or suggest a change. This goes to the team that
          runs the software.
        </p>
      </header>

      <FeedbackForm existing={mine ?? []} />
    </div>
  );
}

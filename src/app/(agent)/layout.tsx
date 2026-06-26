import { redirect } from "next/navigation";

import { getAgent } from "@/lib/auth/agent";
import { AgentProvider } from "@/lib/auth/agent-context";

import { AgentHeader } from "./_components/agent-header";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Single auth + agent lookup, deduped by React.cache so nested pages share
  // this result. Returns null for staff (no agent row) → bounced to login.
  const agent = await getAgent();

  if (!agent) {
    redirect("/login?error=unauthorized");
  }

  // Forced-reset gate. Mirrors the (staff) layout. The reset-password page
  // lives in (auth)/, so this layout doesn't run there — no redirect loop.
  if (agent.password_reset_required_at !== null) {
    redirect("/reset-password");
  }

  return (
    <AgentProvider agent={agent}>
      <div className="flex h-dvh flex-col bg-stone-50">
        <AgentHeader />
        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </AgentProvider>
  );
}

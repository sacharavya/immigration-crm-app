"use client";

import { CaseBindLogo } from "@/components/brand/casebind-logo";
import { LogOut } from "lucide-react";
import Link from "next/link";

import { useAgent } from "@/lib/auth/agent-context";

export function AgentHeader() {
  const agent = useAgent();

  return (
    <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-6">
      <Link
        href="/portal"
        aria-label="CaseBind"
        className="flex h-full items-center transition-opacity hover:opacity-80"
      >
        <CaseBindLogo className="h-10 w-auto text-[#1E2136]" />
      </Link>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-medium text-stone-900">
            {agent.name}
          </div>
          {agent.organization && (
            <div className="text-xs text-stone-500">{agent.organization}</div>
          )}
        </div>
        <form action="/logout" method="post">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

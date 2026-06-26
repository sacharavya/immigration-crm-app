"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Agent } from "./agent";

const AgentContext = createContext<Agent | null>(null);

export function AgentProvider({
  agent,
  children,
}: {
  agent: Agent;
  children: ReactNode;
}) {
  return (
    <AgentContext.Provider value={agent}>{children}</AgentContext.Provider>
  );
}

/**
 * Read the active referral agent. Throws if used outside the (agent) layout
 * — deliberate, so a misplaced component surfaces the bug loudly.
 */
export function useAgent(): Agent {
  const agent = useContext(AgentContext);
  if (!agent) {
    throw new Error(
      "useAgent() must be called inside the (agent) layout's AgentProvider",
    );
  }
  return agent;
}

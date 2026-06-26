"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/index";

import { RoleTag, TeamAvatar } from "./team-avatar";
import { staffName, type TeamMember } from "./team";

// Compact, display-only view of the case team for the header key-facts strip.
// The license number and the reassignment controls live in the rail Case team
// panel, not here. Reads from the same team data as the panel, so the two can
// never disagree.
export function AssignedFact({
  rcic,
  workers,
}: {
  rcic: TeamMember | null;
  workers: TeamMember[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (!rcic && workers.length === 0) {
    return <span className="text-sm text-muted-foreground">No team yet</span>;
  }

  const shownWorkers = expanded ? workers : workers.slice(0, 1);
  const extra = workers.length - shownWorkers.length;

  return (
    <div className="flex flex-col gap-1.5">
      {rcic && (
        <div className="flex items-center gap-2">
          <TeamAvatar member={rcic} variant="rcic" className="h-6 w-6" />
          <span className="truncate text-sm text-foreground">
            {staffName(rcic)}
          </span>
          <RoleTag variant="rcic" />
        </div>
      )}

      {shownWorkers.map((w) => (
        <div key={w.id} className="flex items-center gap-2">
          <TeamAvatar member={w} variant="worker" className="h-6 w-6" />
          <span className="truncate text-sm text-foreground">{staffName(w)}</span>
          <RoleTag variant="worker" />
        </div>
      ))}

      {extra > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cn(
            "self-start rounded px-0.5 text-xs font-medium text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
        >
          {`+${extra} more`}
        </button>
      )}
    </div>
  );
}

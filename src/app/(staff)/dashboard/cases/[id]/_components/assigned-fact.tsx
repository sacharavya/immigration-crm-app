"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/index";

import type { StaffOption } from "./assignment-card";
import { ReassignDialog } from "./reassign-dialog";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AssignedFact({
  caseId,
  assignedId,
  options,
  canEdit,
}: {
  caseId: string;
  assignedId: string | null;
  options: StaffOption[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((s) => s.id === assignedId) ?? null;
  const name = current ? `${current.first_name} ${current.last_name}`.trim() : null;

  const body = name ? (
    <span className="flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--navy-100)] text-[10px] font-medium text-[var(--navy-700)]">
        {initials(name)}
      </span>
      <span className="truncate text-sm text-foreground">{name}</span>
    </span>
  ) : (
    <span className="flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground">Unassigned</span>
      {canEdit && (
        <span className="text-xs font-medium text-[var(--navy-700)]">
          Assign
        </span>
      )}
    </span>
  );

  if (!canEdit) {
    return body;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={name ? `Reassign case, currently ${name}` : "Assign case"}
        className={cn(
          "-mx-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted",
          "focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
      >
        {body}
      </button>
      <ReassignDialog
        open={open}
        onOpenChange={setOpen}
        caseId={caseId}
        options={options}
        currentId={assignedId}
      />
    </>
  );
}

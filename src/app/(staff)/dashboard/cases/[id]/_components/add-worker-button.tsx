"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import type { StaffOption } from "./team";
import { WorkerPickerDialog } from "./worker-picker-dialog";

// Navy "Add a worker" affordance. Opens the worker picker in add mode; the
// existing workers are excluded so the same person cannot be added twice.
export function AddWorkerButton({
  caseId,
  options,
  excludeIds,
}: {
  caseId: string;
  options: StaffOption[];
  excludeIds: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-0.5 py-1 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Plus aria-hidden className="h-4 w-4" />
        Add a worker
      </button>
      <WorkerPickerDialog
        open={open}
        onOpenChange={setOpen}
        caseId={caseId}
        options={options}
        excludeIds={excludeIds}
      />
    </>
  );
}

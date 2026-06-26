"use client";

import { useState } from "react";

import { RcicPickerDialog } from "./rcic-picker-dialog";
import type { StaffOption } from "./team";

// Defensive empty state: a case with no RCIC of record. Should not occur given
// the data model, but lets a manager set one rather than dead-end.
export function SetRcicButton({
  caseId,
  options,
}: {
  caseId: string;
  options: StaffOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        Assign RCIC of record
      </button>
      <RcicPickerDialog
        open={open}
        onOpenChange={setOpen}
        caseId={caseId}
        options={options}
        currentId={null}
      />
    </>
  );
}

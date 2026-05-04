"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteConfirmDialog } from "@/components/checklists/delete-confirm-dialog";
import { Button } from "@/components/ui/button";

import { deleteCase } from "../actions";

export function DeleteCaseTrigger({
  caseId,
  caseNumber,
}: {
  caseId: string;
  caseNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCase(caseId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/dashboard/cases");
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-destructive hover:bg-red-50 hover:text-destructive"
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Delete case
      </Button>

      <DeleteConfirmDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setError(null);
          setOpen(o);
        }}
        title="Delete this case?"
        description="This permanently removes the case and all its case-scoped history. The OneDrive folder is not removed. Soft-deletion (archive) is preferred for compliance. Are you sure you want a hard delete?"
        warningLines={[
          "Events, communications, participants, tasks, document metadata, and the retainer agreement are removed.",
          "OneDrive folder and uploaded files are NOT removed.",
          "Invoices or payments on this case will block the delete — void or reassign them first.",
          "The audit log captures the deletion event.",
        ]}
        expectedToken={caseNumber}
        tokenLabel="Type the case number to confirm"
        pending={pending}
        error={error}
        onConfirm={runDelete}
        confirmLabel="Delete case"
      />
    </>
  );
}

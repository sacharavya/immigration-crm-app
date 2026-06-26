"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { removeCaseWorker } from "../actions";

// Light confirm before removing a case worker. The server still enforces the
// "at least one worker" rule, so this is a courtesy check, not the guard.
export function RemoveWorkerDialog({
  open,
  onOpenChange,
  caseId,
  worker,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseId: string;
  worker: { id: string; name: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await removeCaseWorker({ caseId, staffId: worker.id });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {worker.name} from this case?</DialogTitle>
          <DialogDescription>
            They lose access to this case. You can add them back at any time.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={pending}
          >
            {pending && <Loader2 className="animate-spin" />}
            Remove from case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

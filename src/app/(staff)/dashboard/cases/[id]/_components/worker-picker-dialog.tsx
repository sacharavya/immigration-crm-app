"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import { addCaseWorker, replaceCaseWorker } from "../actions";
import { staffName, type StaffOption } from "./team";

const selectClass =
  "h-9 w-full rounded-lg border border-[var(--input)] bg-card px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

// One dialog serves both "Add a worker" and the per-worker "Change". In change
// mode `replacing` carries the worker being swapped out. `excludeIds` are the
// staff already on the team as workers, so the same person cannot be added twice.
export function WorkerPickerDialog({
  open,
  onOpenChange,
  caseId,
  options,
  excludeIds,
  replacing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseId: string;
  options: StaffOption[];
  excludeIds: string[];
  replacing?: { id: string; name: string };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const available = options.filter((s) => !excludeIds.includes(s.id));
  const title = replacing ? "Change case worker" : "Add a worker";

  function save() {
    if (selected === "") {
      setError("Pick a staff member.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = replacing
        ? await replaceCaseWorker({
            caseId,
            fromStaffId: replacing.id,
            toStaffId: selected,
          })
        : await addCaseWorker({ caseId, staffId: selected });
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="case-worker">
            {replacing ? `Replace ${replacing.name} with` : "Case worker"}
          </FieldLabel>
          <select
            id="case-worker"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={selectClass}
          >
            <option value="">Pick a staff member...</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {staffName(s)}
              </option>
            ))}
          </select>
          {error && <FieldError>{error}</FieldError>}
        </Field>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

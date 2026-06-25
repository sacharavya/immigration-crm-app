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

import { updateAssignment } from "../actions";
import type { StaffOption } from "./assignment-card";

const selectClass =
  "h-9 w-full rounded-lg border border-[var(--input)] bg-card px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

export function ReassignDialog({
  open,
  onOpenChange,
  caseId,
  options,
  currentId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseId: string;
  options: StaffOption[];
  currentId: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (selected === "") {
      setError("Pick a staff member.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateAssignment({ caseId, rcicId: selected });
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
          <DialogTitle>Reassign case</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="reassign-staff">Assigned to</FieldLabel>
          <select
            id="reassign-staff"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={selectClass}
          >
            <option value="">Unassigned</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {`${s.first_name} ${s.last_name}`.trim()}
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

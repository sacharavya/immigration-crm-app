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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

import { setRcicOfRecord } from "../actions";
import { staffName, type StaffOption } from "./team";

const selectClass =
  "h-9 w-full rounded-lg border border-[var(--input)] bg-card px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

// The picker is limited to licensed consultants (RCICs). The constraint is
// stated in text, not by color or an icon alone.
export function RcicPickerDialog({
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
      setError("Pick a licensed consultant.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setRcicOfRecord({ caseId, staffId: selected });
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
          <DialogTitle>Change RCIC of record</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="rcic-of-record">RCIC of record</FieldLabel>
          <select
            id="rcic-of-record"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={selectClass}
          >
            <option value="">Pick a licensed consultant...</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {staffName(s)}
              </option>
            ))}
          </select>
          <FieldDescription>
            Only licensed consultants (RCICs) can be the RCIC of record. They are
            named to IRCC as the authorized representative.
          </FieldDescription>
          {options.length === 0 && (
            <FieldDescription>
              No staff are flagged as an RCIC. Add an RCIC in staff settings first.
            </FieldDescription>
          )}
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

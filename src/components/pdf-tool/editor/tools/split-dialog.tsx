"use client";

// Split tool: export a page range as its own merge-only PDF without touching
// the working session. The hook's exportRange applies the range, builds,
// downloads, and restores the full model in a finally block, so a failure
// cannot strand the session.

import { Scissors } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PageModel, PageRef } from "@/lib/pdf-engine/types";

interface SplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: PageModel | null;
  title: string;
  /** 1-based positions of the current selection, for prefill. */
  selectedPositions: readonly number[];
  disabled: boolean;
  exportRange: (
    pages: readonly PageRef[],
    fileName: string,
  ) => Promise<boolean | null>;
}

/** Mounted only while open, so the range prefills fresh from the selection. */
function SplitBody({
  onOpenChange,
  model,
  title,
  selectedPositions,
  disabled,
  exportRange,
}: Omit<SplitDialogProps, "open">) {
  const pageCount = model?.pages.length ?? 0;
  const [from, setFrom] = useState(() =>
    selectedPositions.length > 0 ? Math.min(...selectedPositions) : 1,
  );
  const [to, setTo] = useState(() =>
    selectedPositions.length > 0 ? Math.max(...selectedPositions) : pageCount,
  );

  const valid =
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    from >= 1 &&
    to >= from &&
    to <= pageCount;

  const handleSplit = async () => {
    if (!model || !valid) return;
    const pages = model.pages.slice(from - 1, to);
    const baseName = title.replace(/\.pdf$/i, "");
    const ok = await exportRange(pages, `${baseName}_pages_${from}-${to}.pdf`);
    if (ok) onOpenChange(false);
  };

  return (
    <>
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="split-from">From page</Label>
          <Input
            id="split-from"
            type="number"
            min={1}
            max={pageCount}
            step={1}
            className="w-24"
            value={Number.isInteger(from) ? from : ""}
            onChange={(e) => setFrom(Number.parseInt(e.target.value, 10))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="split-to">To page</Label>
          <Input
            id="split-to"
            type="number"
            min={1}
            max={pageCount}
            step={1}
            className="w-24"
            value={Number.isInteger(to) ? to : ""}
            onChange={(e) => setTo(Number.parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      {!valid && (
        <p className="text-sm text-red-700">
          Enter a range between 1 and {pageCount}.
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button disabled={!valid || disabled} onClick={() => void handleSplit()}>
          <Scissors data-icon="inline-start" />
          Download range
        </Button>
      </DialogFooter>
    </>
  );
}

export function SplitDialog(props: SplitDialogProps) {
  const { open, onOpenChange, model } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Split off pages</DialogTitle>
          <DialogDescription>
            Downloads the chosen range as its own PDF. The package here keeps
            all {model?.pages.length ?? 0} pages.
          </DialogDescription>
        </DialogHeader>
        {open && <SplitBody {...props} />}
      </DialogContent>
    </Dialog>
  );
}

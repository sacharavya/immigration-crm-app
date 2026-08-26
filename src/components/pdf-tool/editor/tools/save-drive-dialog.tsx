"use client";

import { CloudUpload } from "lucide-react";
import { useEffect, useState } from "react";

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

// The exporter names the file explicitly before it lands in the case's
// Final folder. Prefilled from the package title; ".pdf" is appended
// automatically when missing.
export function SaveDriveDialog({
  open,
  defaultName,
  saving,
  onCancel,
  onSave,
}: {
  open: boolean;
  defaultName: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (fileName: string) => void;
}) {
  const [name, setName] = useState(defaultName);

  // Re-seed whenever the dialog opens with a fresh default.
  useEffect(() => {
    if (open) queueMicrotask(() => setName(defaultName));
  }, [open, defaultName]);

  const trimmed = name.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : onCancel())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to OneDrive</DialogTitle>
          <DialogDescription>
            Saves the finished package to this case&apos;s{" "}
            <span className="font-medium">Final</span> folder. If the name is
            already taken, a numbered copy is created instead of overwriting.
          </DialogDescription>
        </DialogHeader>
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
          File name
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            placeholder="BB-2026-0012_Submission_2026-08-26"
            className="mt-1"
            autoFocus
          />
        </label>
        <p className="text-[11px] text-stone-500">
          .pdf is added automatically.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(trimmed)}
            disabled={saving || trimmed.length === 0}
          >
            <CloudUpload data-icon="inline-start" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

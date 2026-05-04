"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { removeStaffSignature } from "../actions";
import { SignatureForm } from "./signature-form";

export function ReplaceTrigger({
  defaultPrintedName,
}: {
  defaultPrintedName: string;
}) {
  const [showCapture, setShowCapture] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doRemove() {
    setError(null);
    startTransition(async () => {
      const r = await removeStaffSignature();
      if ("error" in r) {
        setError(r.error);
        return;
      }
      // Server revalidates; the page re-renders with the empty state.
    });
  }

  if (showCapture) {
    return (
      <div className="space-y-4">
        <SignatureForm defaultPrintedName={defaultPrintedName} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCapture(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => setShowCapture(true)}
      >
        Replace signature
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={doRemove}
        disabled={pending}
        className="text-destructive hover:bg-red-50 hover:text-destructive"
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        {pending ? "Removing…" : "Remove signature"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

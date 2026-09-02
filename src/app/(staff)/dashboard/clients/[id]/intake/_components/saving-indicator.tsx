"use client";

import { AlertCircle, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import type { SaveState } from "./use-autosave";

export function SavingIndicator({
  state,
  error,
  className = "",
}: {
  state: SaveState;
  error?: string | null;
  className?: string;
}) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-stone-500 ${className}`}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-emerald-600 ${className}`}
      >
        <Check className="h-3 w-3" />
        Saved
      </span>
    );
  }
  return (
    <span
      role="alert"
      className={`inline-flex items-center gap-1 text-xs text-destructive ${className}`}
    >
      <AlertCircle className="h-3 w-3" />
      {error ?? "Failed to save"}
    </span>
  );
}

// Shared confirm-delete row button used across all section row editors.
// Add-row buttons fire a server action whose new row only appears once the
// page refresh lands — seconds on slow connections. Owning the pending state
// here makes the tap show "Adding…" immediately, blocks double-taps, and
// surfaces failures instead of swallowing them.
export function AddRowButton({
  label,
  onAdd,
  disabled,
  className,
}: {
  label: string;
  onAdd: () => Promise<{ ok: true } | { error: string } | void>;
  disabled?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function run() {
    if (pending) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const r = await onAdd();
        if (r && "error" in r) setFailed(true);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-2 ${className ?? ""}`}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={run}
        disabled={disabled || pending}
      >
        {pending ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="mr-1 h-3.5 w-3.5" />
        )}
        {pending ? "Adding…" : label}
      </Button>
      {failed && (
        <span role="alert" className="text-xs text-red-600">
          Could not add. Please tap again.
        </span>
      )}
    </span>
  );
}

export function DeleteRowButton({
  onConfirm,
  disabled,
}: {
  onConfirm: () => Promise<{ ok: true } | { error: string }> | void;
  disabled?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const r = await onConfirm();
      if (r && "error" in r) {
        setError(r.error);
      }
    });
  }

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={run}
          disabled={disabled || pending}
        >
          Confirm delete
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setConfirm(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </span>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => setConfirm(true)}
      disabled={disabled}
      className="text-destructive hover:bg-red-50 hover:text-destructive"
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      Delete
    </Button>
  );
}

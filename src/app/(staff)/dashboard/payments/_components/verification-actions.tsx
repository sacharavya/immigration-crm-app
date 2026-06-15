"use client";

import { Check, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { rejectClientUpload, verifyClientUpload } from "../actions";

// Inline Approve / Reject buttons for a single pending client-upload
// payment row in the payments dashboard table. Reject opens a small
// dialog that asks for a reason (free text) and submits soft-delete.
//
// Optimistic UI: the rows disappear from the pending list after a
// successful action (server triggers revalidatePath, the page reloads).

export function VerificationActions({
  paymentId,
}: {
  paymentId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  function handleVerify() {
    setError(null);
    startTransition(async () => {
      const r = await verifyClientUpload({ paymentId });
      if ("error" in r) setError(r.error);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        onClick={handleVerify}
        disabled={pending}
        title="Approve this client-uploaded payment"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        <span className="ml-1 hidden sm:inline">Approve</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setRejectOpen(true)}
        disabled={pending}
        title="Reject this client-uploaded payment"
        className="text-rose-700"
      >
        <X className="h-3.5 w-3.5" />
        <span className="ml-1 hidden sm:inline">Reject</span>
      </Button>

      <RejectDialog
        paymentId={paymentId}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
      />

      {error && (
        <span
          role="alert"
          className="ml-2 text-xs text-destructive"
        >
          {error}
        </span>
      )}
    </div>
  );
}

function RejectDialog({
  paymentId,
  open,
  onOpenChange,
}: {
  paymentId: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!reason.trim()) {
      setError("Reason is required so the case event has context.");
      return;
    }
    startTransition(async () => {
      const r = await rejectClientUpload({ paymentId, reason });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setReason("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject this payment proof</DialogTitle>
          <DialogDescription>
            The payment row is soft-deleted and the amount drops off the
            case balance immediately. The reason below is recorded on the
            case timeline so staff can refer to it later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label
            htmlFor="reject_reason"
            className="text-xs font-semibold uppercase tracking-wider text-stone-500"
          >
            Reason
          </label>
          <textarea
            id="reject_reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={pending}
            placeholder="e.g. Screenshot unreadable. Please re-upload a clearer image."
            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
          />
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Rejecting…
              </>
            ) : (
              "Reject payment"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

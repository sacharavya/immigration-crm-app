"use client";

import { Loader2, Mail } from "lucide-react";
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
import { Input } from "@/components/ui/input";

import { notifyClientForPayment } from "../actions";

type Props = {
  caseId: string;
  // Pre-fills the recipient input. Falls back to "" if the case's
  // client has no email yet — staff can type one in.
  clientEmail: string | null;
  // Already-paid + quoted are read on the case page; we just pass the
  // booleans so the button can render disabled when there's nothing
  // to ask for. Server re-checks before sending.
  paidInFull: boolean;
};

export function NotifyForPaymentTrigger({
  caseId,
  clientEmail,
  paidInFull,
}: Props) {
  const [open, setOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(clientEmail ?? "");
  const [customMessage, setCustomMessage] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "sent"; to: string }
    | { kind: "failed"; reason: string }
  >({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setTimeout(() => setStatus({ kind: "idle" }), 200);
  }

  function handleSend() {
    setStatus({ kind: "idle" });
    const trimmed = recipientEmail.trim();
    if (!trimmed) {
      setStatus({ kind: "failed", reason: "Enter a recipient email." });
      return;
    }
    startTransition(async () => {
      const res = await notifyClientForPayment({
        caseId,
        recipientEmail: trimmed,
        customMessage: customMessage.trim() || undefined,
      });
      if ("error" in res) {
        setStatus({ kind: "failed", reason: res.error });
        return;
      }
      if (res.emailSent) {
        setStatus({ kind: "sent", to: trimmed });
      } else {
        setStatus({
          kind: "failed",
          reason: res.emailError ?? "Email could not be sent.",
        });
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
        disabled={paidInFull}
        title={
          paidInFull
            ? "Case is paid in full — no payment to request."
            : "Email the client with payment instructions"
        }
      >
        <Mail className="mr-2 h-3.5 w-3.5" />
        Notify client for payment
      </Button>

      <Dialog open={open} onOpenChange={(o) => (pending ? null : setOpen(o))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify client for payment</DialogTitle>
            <DialogDescription>
              Sends an email with Interac e-transfer instructions and a
              secure link where the client can upload proof of payment.
              The proof lands in the case&rsquo;s OneDrive folder under
              &ldquo;00 Payments&rdquo; and shows up in /dashboard/payments
              for verification.
            </DialogDescription>
          </DialogHeader>

          {status.kind === "sent" ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
              Email sent to <strong>{status.to}</strong>.
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs">
                <span className="block font-medium text-stone-600">
                  Recipient email
                </span>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  disabled={pending}
                  placeholder="client@example.com"
                  className="mt-1"
                />
              </label>
              <label className="block text-xs">
                <span className="block font-medium text-stone-600">
                  Personal note (optional)
                </span>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  disabled={pending}
                  maxLength={1000}
                  rows={3}
                  placeholder="Hi Pranisha, your file is almost ready — please send the next instalment when you can."
                  className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
                />
              </label>
              {status.kind === "failed" && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {status.reason}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={close} disabled={pending}>
              {status.kind === "sent" ? "Done" : "Cancel"}
            </Button>
            {status.kind !== "sent" && (
              <Button
                onClick={handleSend}
                disabled={pending || !recipientEmail.trim()}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-3.5 w-3.5" />
                    Send payment request
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

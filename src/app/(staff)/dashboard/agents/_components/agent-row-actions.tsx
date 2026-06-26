"use client";

import { CheckCircle2, Copy, Loader2 } from "lucide-react";
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

import {
  deactivateAgent,
  reactivateAgent,
  resetAgentPassword,
  type ResetAgentPasswordResult,
} from "../actions";

type Target = {
  id: string;
  name: string;
  email: string | null;
  deactivated: boolean;
};

export function AgentRowActions({ target }: { target: Target }) {
  return (
    <>
      {!target.deactivated && target.email && (
        <ResetPasswordButton target={target} />
      )}
      <DeactivateButton target={target} />
    </>
  );
}

/* ───────────────────── Reset password ───────────────────── */

function ResetPasswordButton({ target }: { target: Target }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ResetAgentPasswordResult | null>(null);

  function handleReset() {
    startTransition(async () => {
      const r = await resetAgentPassword(target.id);
      setResult(r);
    });
  }

  function close() {
    setOpen(false);
    setTimeout(() => setResult(null), 200);
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        Reset password
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-md">
          {result && "ok" in result ? (
            <ResetSuccessView result={result} onClose={close} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Reset password</DialogTitle>
                <DialogDescription>
                  Reset the password for <strong>{target.name}</strong>
                  {target.email ? ` (${target.email})` : ""}. They&rsquo;ll get
                  an email with a temporary password and must choose a new one
                  on next sign-in.
                </DialogDescription>
              </DialogHeader>
              {result && "error" in result && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {result.error}
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={close} disabled={pending}>
                  Cancel
                </Button>
                <Button onClick={handleReset} disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Resetting…
                    </>
                  ) : (
                    "Reset password"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResetSuccessView({
  result,
  onClose,
}: {
  result: {
    ok: true;
    tempPassword: string;
    emailSent: boolean;
    emailError?: string;
  };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(result.tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle>Password reset</DialogTitle>
            <DialogDescription>
              {result.emailSent
                ? "Email sent with the temporary password."
                : "Email could not be sent — share the temporary password manually."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="min-w-0 space-y-2 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Temporary password
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <code className="block min-w-0 flex-1 truncate rounded bg-white px-3 py-2 font-mono text-sm">
            {result.tempPassword}
          </code>
          <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
            <Copy className="mr-1 h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {!result.emailSent && result.emailError && (
          <p className="text-xs text-destructive">
            Email error: {result.emailError}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}

/* ───────────────────── Deactivate / Reactivate ───────────────────── */

function DeactivateButton({ target }: { target: Target }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const action = target.deactivated ? "Reactivate" : "Deactivate";

  function handle() {
    setError(null);
    startTransition(async () => {
      const r = target.deactivated
        ? await reactivateAgent(target.id)
        : await deactivateAgent(target.id);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className={target.deactivated ? "text-green-700" : "text-destructive"}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {action}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action} agent</DialogTitle>
            <DialogDescription>
              {target.deactivated ? (
                <>
                  Reactivate <strong>{target.name}</strong>? They&apos;ll be
                  able to sign in again.
                </>
              ) : (
                <>
                  Deactivate <strong>{target.name}</strong>? They lose access
                  immediately and existing sessions are invalidated. Clients
                  they created remain visible to staff.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={handle}
              disabled={pending}
              variant={target.deactivated ? "default" : "destructive"}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Working…
                </>
              ) : (
                action
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

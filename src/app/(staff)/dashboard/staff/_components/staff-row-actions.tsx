"use client";

import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Role } from "@/lib/auth/permissions";
import { canActOnRole } from "@/lib/validators/staff";

import {
  deactivateStaff,
  reactivateStaff,
  resetStaffPassword,
  sendStaffPasswordResetLink,
  type ResetStaffPasswordResult,
  type SendStaffPasswordResetLinkResult,
} from "../actions";

type Target = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  deactivated: boolean;
};

export function StaffRowActions({
  actorRole,
  actorId,
  target,
}: {
  actorRole: Role;
  actorId: string;
  target: Target;
}) {
  // The actor's role determines which actions are even available.
  const canManageThisRow = canActOnRole(actorRole, target.role);

  return (
    <div className="inline-flex items-center gap-1">
      <Link
        href={`/dashboard/staff/${target.id}`}
        className={buttonVariants({ size: "sm", variant: "ghost" })}
        aria-label={`Edit ${target.firstName} ${target.lastName}`}
      >
        Edit
      </Link>

      {canManageThisRow && !target.deactivated && (
        <ResetPasswordButton target={target} />
      )}

      {canManageThisRow && (
        <DeactivateButton
          target={target}
          actorIsSelf={actorId === target.id}
          actorRole={actorRole}
        />
      )}
    </div>
  );
}

/* ───────────────────── Reset password ───────────────────── */

type ResetResult =
  | { kind: "link"; data: SendStaffPasswordResetLinkResult }
  | { kind: "temp"; data: ResetStaffPasswordResult };

function ResetPasswordButton({ target }: { target: Target }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ResetResult | null>(null);

  function handleSendLink() {
    startTransition(async () => {
      const r = await sendStaffPasswordResetLink(target.id);
      setResult({ kind: "link", data: r });
    });
  }

  function handleTempPassword() {
    startTransition(async () => {
      const r = await resetStaffPassword(target.id);
      setResult({ kind: "temp", data: r });
    });
  }

  function close() {
    setOpen(false);
    setTimeout(() => setResult(null), 200);
  }

  const success =
    result && "ok" in result.data
      ? result
      : null;
  const errorMessage =
    result && "error" in result.data ? result.data.error : null;

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
        <DialogContent>
          {success ? (
            success.kind === "link" ? (
              <ResetLinkSuccessView
                result={success.data as Extract<SendStaffPasswordResetLinkResult, { ok: true }>}
                onClose={close}
              />
            ) : (
              <ResetTempSuccessView
                result={success.data as Extract<ResetStaffPasswordResult, { ok: true }>}
                onClose={close}
              />
            )
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Reset password</DialogTitle>
                <DialogDescription>
                  Choose how to reset the password for{" "}
                  <strong>
                    {target.firstName} {target.lastName}
                  </strong>{" "}
                  ({target.email}).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
                <div>
                  <div className="font-medium text-stone-900">
                    Send a reset link
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Emails a one-time link. They click it, set a new
                    password, and sign in. Recommended.
                  </p>
                </div>
                <div className="border-t border-stone-200 pt-3">
                  <div className="font-medium text-stone-900">
                    Generate a temporary password
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Falls back to a one-time password you can share if
                    the user can&apos;t receive email.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {errorMessage}
                </p>
              )}

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  variant="outline"
                  onClick={close}
                  disabled={pending}
                  className="sm:mr-auto"
                >
                  Cancel
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={handleTempPassword}
                    disabled={pending}
                  >
                    {pending ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Generate temp password
                  </Button>
                  <Button onClick={handleSendLink} disabled={pending}>
                    {pending ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Send reset link
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResetLinkSuccessView({
  result,
  onClose,
}: {
  result: { ok: true; resetUrl: string; emailSent: boolean; emailError?: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(result.resetUrl).then(() => {
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
            <DialogTitle>Reset link generated</DialogTitle>
            <DialogDescription>
              {result.emailSent
                ? "Email sent with a one-time reset link."
                : "Email could not be sent — share the link manually."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Reset link
        </div>
        <div className="flex items-center gap-2">
          <code className="block flex-1 truncate rounded bg-white px-3 py-2 font-mono text-xs">
            {result.resetUrl}
          </code>
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {!result.emailSent && result.emailError && (
          <p className="text-xs text-destructive">
            Email error: {result.emailError}
          </p>
        )}
        <p className="pt-1 text-[11px] text-stone-500">
          One-time use, expires in 24 hours.
        </p>
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}

function ResetTempSuccessView({
  result,
  onClose,
}: {
  result: { ok: true; tempPassword: string; emailSent: boolean; emailError?: string };
  onClose: () => void;
}) {
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
                ? "Email sent with the new temporary password."
                : "Email could not be sent — share the password manually."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Temporary password
        </div>
        <code className="block rounded bg-white px-3 py-2 font-mono text-sm">
          {result.tempPassword}
        </code>
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

function DeactivateButton({
  target,
  actorIsSelf,
  actorRole,
}: {
  target: Target;
  actorIsSelf: boolean;
  actorRole: Role;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const action = target.deactivated ? "Reactivate" : "Deactivate";

  function handle() {
    setError(null);
    startTransition(async () => {
      const r = target.deactivated
        ? await reactivateStaff(target.id)
        : await deactivateStaff(target.id);
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
        className={
          target.deactivated ? "text-green-700" : "text-destructive"
        }
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
            <DialogTitle>{action} staff</DialogTitle>
            <DialogDescription>
              {target.deactivated ? (
                <>
                  Reactivate{" "}
                  <strong>
                    {target.firstName} {target.lastName}
                  </strong>
                  ? They&apos;ll be able to sign in again.
                </>
              ) : (
                <>
                  Deactivate{" "}
                  <strong>
                    {target.firstName} {target.lastName}
                  </strong>
                  {actorIsSelf ? " (yourself)" : ""}? They lose access
                  immediately and existing sessions are invalidated.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {actorIsSelf && actorRole === "super_user" && !target.deactivated && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              You&apos;re deactivating yourself. The action will fail if you
              are the only active super user.
            </p>
          )}

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

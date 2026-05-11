"use client";

import {
  Check,
  Copy,
  Link as LinkIcon,
  Loader2,
  Mail,
  RotateCw,
} from "lucide-react";
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

import {
  emailClientPortalLink,
  generateClientPortalToken,
  revokeClientPortalToken,
} from "../actions";

type Props = {
  caseId: string;
  initialToken: string | null;
  clientEmail: string | null;
};

// Reuses the cross-browser clipboard helper pattern. execCommand
// fallback handles the post-await user-gesture-context issue some
// browsers (Safari) trip into.
async function copy(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }
  if (typeof document !== "undefined") {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
  return false;
}

function buildPortalUrl(token: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${origin}/upload/${token}`;
}

export function ShareLinkDialog({ caseId, initialToken, clientEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(initialToken);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  // Email-share state. Pre-fills with the case's client email when
  // available; staff can edit (e.g. send to a parent / sponsor).
  const [recipientEmail, setRecipientEmail] = useState(clientEmail ?? "");
  const [customMessage, setCustomMessage] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    | { kind: "idle" }
    | { kind: "sent"; to: string }
    | { kind: "failed"; reason: string }
  >({ kind: "idle" });
  const [emailPending, startEmailTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateClientPortalToken(caseId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setToken(result.token);
    });
  }

  function handleRevoke() {
    if (
      !confirm(
        "Revoke the current link? Anyone with the existing URL will see an expired card.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await revokeClientPortalToken(caseId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setToken(null);
    });
  }

  async function handleCopy() {
    if (!token) return;
    const ok = await copy(buildPortalUrl(token));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleEmail() {
    setEmailStatus({ kind: "idle" });
    setError(null);
    const trimmed = recipientEmail.trim();
    if (!trimmed) {
      setEmailStatus({ kind: "failed", reason: "Enter a recipient email." });
      return;
    }
    startEmailTransition(async () => {
      const result = await emailClientPortalLink({
        caseId,
        recipientEmail: trimmed,
        customMessage: customMessage.trim() || undefined,
      });
      if ("error" in result) {
        setEmailStatus({ kind: "failed", reason: result.error });
        return;
      }
      if (result.emailSent) {
        setEmailStatus({ kind: "sent", to: trimmed });
      } else {
        setEmailStatus({
          kind: "failed",
          reason: result.emailError ?? "Email could not be sent.",
        });
      }
    });
  }

  const url = token ? buildPortalUrl(token) : null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Share an upload link with the client"
      >
        <LinkIcon className="mr-1 h-3.5 w-3.5" />
        Share with client
      </Button>

      <Dialog open={open} onOpenChange={(o) => (pending ? null : setOpen(o))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share documents link</DialogTitle>
            <DialogDescription>
              Generates a private upload page for this case. The link
              stays active until the case moves past the Review phase or
              is closed.
            </DialogDescription>
          </DialogHeader>

          {url ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
                Upload link
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(e) => e.currentTarget.select()}
                  className="flex-1 truncate rounded-md border border-stone-200 bg-white px-3 py-2 font-mono text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={pending}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3 w-3 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-stone-500">
                Active until this case moves past Review or is closed.
              </p>

              {/* Email share — separate channel; the same persistent
                  token is delivered, copy-paste still works after. */}
              <div className="mt-4 space-y-2 rounded-md border border-stone-200 bg-stone-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Email the link
                </div>
                <label className="block text-xs">
                  <span className="block font-medium text-stone-600">
                    Recipient email
                  </span>
                  <Input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    disabled={emailPending}
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
                    disabled={emailPending}
                    maxLength={1000}
                    rows={3}
                    placeholder="Hi Ram, here are the documents we need to start your application…"
                    className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    size="sm"
                    onClick={handleEmail}
                    disabled={emailPending || !recipientEmail.trim()}
                  >
                    {emailPending ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-3.5 w-3.5" />
                        Email to client
                      </>
                    )}
                  </Button>
                  {emailStatus.kind === "sent" && (
                    <span className="text-xs text-emerald-700">
                      Email sent to {emailStatus.to}.
                    </span>
                  )}
                  {emailStatus.kind === "failed" && (
                    <span className="text-xs text-amber-700">
                      {emailStatus.reason}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700">
              No active upload link yet. Generate one to share with the
              client.
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Close
            </Button>
            {url ? (
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={pending}
                title="Mint a fresh link. The current one stops working."
              >
                {pending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="mr-2 h-3.5 w-3.5" />
                )}
                Generate new link
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate link"
                )}
              </Button>
            )}
            {url && (
              <Button
                variant="ghost"
                onClick={handleRevoke}
                disabled={pending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Revoke
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

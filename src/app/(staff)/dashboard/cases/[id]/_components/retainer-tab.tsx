"use client";

import { format } from "date-fns";
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  PenTool,
  RefreshCw,
  Send,
  ShieldOff,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import {
  RETAINER_STYLES,
  RetainerDocument,
  type RetainerData,
} from "@/components/retainer/retainer-document";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Database } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/index";

import {
  cancelSigning,
  getSigningLink,
  resendRetainerEmail,
  setRetainerRcic,
  startNewRetainer,
} from "../retainer-actions";
import {
  SendForSignatureDialog,
  UploadSignedRetainerDialog,
  VoidRetainerDialog,
} from "./retainer-dialogs";

type RetainerStatus =
  Database["crm"]["Enums"]["retainer_agreement_status"];

export type RcicOption = {
  id: string;
  name: string;
  hasSignature: boolean;
};

export type RetainerTabProps = {
  caseId: string;
  retainerId: string;
  status: RetainerStatus;
  caseQuotedFeeCad: number;
  data: RetainerData; // assembled on the server, full RetainerData shape
  meta: {
    sent_to_email: string | null;
    sent_at: string | null;
    token_expires_at: string | null;
    signed_at: string | null;
    method: Database["crm"]["Enums"]["retainer_method"] | null;
    resent_count: number;
    last_resent_at: string | null;
    void_reason: string | null;
    voided_at: string | null;
    void_voided_by_name: string | null;
    signed_by_name: string | null;
    final_document_web_url: string | null;
    final_document_file_name: string | null;
  };
  rcicHasSignature: boolean;
  canManage: boolean;
  canVoid: boolean;
  defaultRecipientEmail: string;
  // RCIC picker state
  rcicOptions: RcicOption[];
  currentRcicId: string | null;
};

const STATUS_PILL: Record<
  RetainerStatus,
  { label: string; className: string; dot: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-stone-100 text-stone-700",
    dot: "bg-stone-400",
  },
  pending_signature: {
    label: "Pending Signature",
    className: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500",
  },
  signed: {
    label: "Signed",
    className: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  uploaded: {
    label: "Signed (Uploaded)",
    className: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  void: {
    label: "Void",
    className: "bg-red-100 text-red-800",
    dot: "bg-red-500",
  },
  expired: {
    label: "Token Expired",
    className: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
};

function actionPill(status: RetainerStatus): string | null {
  if (status === "draft") return "Action on us";
  if (status === "pending_signature") return "Action on client";
  if (status === "expired") return "Action on us";
  return null;
}

export function RetainerTab(props: RetainerTabProps) {
  const {
    caseId,
    retainerId,
    status: rawStatus,
    data,
    meta,
    rcicHasSignature,
    canManage,
    canVoid,
    defaultRecipientEmail,
    rcicOptions,
    currentRcicId,
  } = props;

  // RET-1's PART M backfill inserts a 'pending_signature' row for every
  // pre-existing case so the phase gate kicks in immediately, but those
  // rows have no fee details and no signing_token. Treat them as draft
  // for UI purposes — the SQL status stays 'pending_signature' (the
  // phase gate behavior is identical either way) and the user gets the
  // Draft action row so they can fill in details + send properly.
  const isStaleBackfill = rawStatus === "pending_signature" && !meta.sent_at;
  const status: RetainerStatus = isStaleBackfill ? "draft" : rawStatus;

  const [signingLink, setSigningLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkPending, startLinkTransition] = useTransition();
  const [resendPending, startResendTransition] = useTransition();
  const [cancelPending, startCancelTransition] = useTransition();
  const [newPending, startNewTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const [sendOpen, setSendOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Preview reflects the data the server already auto-derived from the
  // case. There's no inline form — staff edit fees on the case itself.
  const previewData: RetainerData = data;

  const previewMode =
    status === "signed" || status === "uploaded" ? "final" : "preview";

  const pill = STATUS_PILL[status];
  const action = actionPill(status);

  function handleGetLink() {
    setActionError(null);
    startLinkTransition(async () => {
      const result = await getSigningLink(retainerId);
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      // Don't auto-copy here — the Clipboard API needs a fresh user
      // gesture and the awaited server call loses that context. Show
      // the link in a card with an explicit Copy button instead.
      setSigningLink(result.signing_path);
    });
  }

  function handleResend() {
    setActionError(null);
    startResendTransition(async () => {
      const result = await resendRetainerEmail(retainerId);
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      setSigningLink(result.signing_path);
    });
  }

  function handleCancel() {
    setActionError(null);
    startCancelTransition(async () => {
      const result = await cancelSigning(retainerId);
      if ("error" in result) {
        setActionError(result.error);
      }
    });
  }

  function handleStartNew() {
    setActionError(null);
    startNewTransition(async () => {
      const result = await startNewRetainer(caseId);
      if ("error" in result) {
        setActionError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Status panel */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge
              className={`${pill.className} inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium`}
            >
              <span className={`h-2 w-2 rounded-full ${pill.dot}`} />
              {pill.label}
            </Badge>
            {action && (
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                {action}
              </span>
            )}
          </div>

          <StatusDetails status={status} meta={meta} />

          {canManage && (status === "draft" || status === "expired") && (
            <RcicPicker
              retainerId={retainerId}
              options={rcicOptions}
              currentRcicId={currentRcicId}
            />
          )}

          {!rcicHasSignature && (status === "draft" || status === "expired") && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              The assigned RCIC hasn&apos;t set up a signature yet.{" "}
              <Link
                href="/dashboard/settings/my-signature"
                className="font-semibold underline"
              >
                Set it up
              </Link>{" "}
              before sending.
            </p>
          )}

          {actionError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {actionError}
            </p>
          )}

          {signingLink && (
            <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
              <div className="font-semibold text-stone-700">
                Signing link
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  readOnly
                  value={absoluteUrl(signingLink)}
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(e) => e.currentTarget.select()}
                  className="flex-1 truncate rounded border border-stone-200 bg-white px-2 py-1 font-mono text-[11px] text-stone-700 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const url = absoluteUrl(signingLink);
                    const ok = await copyToClipboard(url);
                    if (ok) {
                      setLinkCopied(true);
                      window.setTimeout(() => setLinkCopied(false), 2000);
                    }
                  }}
                >
                  {linkCopied ? (
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
              <p className="mt-1 text-stone-500">
                Email delivery is pending RET-6. Click the field to select,
                or hit Copy. Send this link to{" "}
                {meta.sent_to_email ?? "the client"} manually for now.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Action row */}
      {canManage && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            {status === "draft" && (
              <>
                <Button onClick={() => setSendOpen(true)}>
                  <Send className="mr-1 h-3.5 w-3.5" />
                  Send for signature
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGetLink}
                  disabled={linkPending}
                >
                  {linkPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Copy className="mr-1 h-3.5 w-3.5" />
                  )}
                  Get signing link
                </Button>
                <Button variant="outline" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Upload signed retainer
                </Button>
              </>
            )}

            {status === "pending_signature" && (
              <>
                <Button
                  onClick={handleResend}
                  disabled={resendPending}
                >
                  {resendPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  )}
                  Resend
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGetLink}
                  disabled={linkPending}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Get signing link
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={cancelPending}
                >
                  {cancelPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="mr-1 h-3.5 w-3.5" />
                  )}
                  Cancel signing
                </Button>
                <Button variant="outline" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Upload signed copy instead
                </Button>
              </>
            )}

            {(status === "signed" || status === "uploaded") && (
              <>
                <a
                  href={`/api/retainer-document?retainerId=${retainerId}&mode=final`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants())}
                >
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  {status === "uploaded" ? "View signed scan" : "View signed PDF"}
                </a>
                {meta.final_document_web_url && (
                  <a
                    href={meta.final_document_web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Open in OneDrive
                  </a>
                )}
                {canVoid && (
                  <Button
                    variant="ghost"
                    onClick={() => setVoidOpen(true)}
                    className="text-destructive hover:bg-red-50 hover:text-destructive"
                  >
                    <ShieldOff className="mr-1 h-3.5 w-3.5" />
                    Void this retainer
                  </Button>
                )}
              </>
            )}

            {status === "void" && (
              <>
                <Button onClick={handleStartNew} disabled={newPending}>
                  {newPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Start new retainer
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 3: Embedded preview */}
      {status !== "uploaded" && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {previewMode === "final" ? "Signed agreement" : "Preview"}
              </span>
              <a
                href={`/api/retainer-document?retainerId=${retainerId}&mode=${previewMode}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                Open as page
              </a>
            </div>
            <style
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: RETAINER_STYLES }}
            />
            <div className="bg-stone-100 p-4">
              <div className="rounded-md bg-white shadow-sm">
                <RetainerDocument data={previewData} mode={previewMode} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "uploaded" && meta.final_document_web_url && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Uploaded signed retainer
            </div>
            <div className="text-sm text-stone-700">
              {meta.final_document_file_name ?? "—"}
            </div>
            <a
              href={meta.final_document_web_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Open in OneDrive
            </a>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <SendForSignatureDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        retainerId={retainerId}
        defaultEmail={defaultRecipientEmail}
        onSent={(path) => setSigningLink(path)}
      />
      <VoidRetainerDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        retainerId={retainerId}
      />
      <UploadSignedRetainerDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        retainerId={retainerId}
      />
    </div>
  );
}

function StatusDetails({
  status,
  meta,
}: {
  status: RetainerStatus;
  meta: RetainerTabProps["meta"];
}) {
  if (status === "draft") {
    return (
      <p className="text-sm text-stone-600">
        Not yet sent. Complete the retainer details and send for signature
        when ready.
      </p>
    );
  }
  if (status === "pending_signature") {
    return (
      <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        {meta.sent_to_email && meta.sent_at && (
          <div>
            <dt className="text-xs text-stone-500">Sent to</dt>
            <dd className="text-stone-800">
              {meta.sent_to_email} · {format(new Date(meta.sent_at), "MMM d, yyyy")}
            </dd>
          </div>
        )}
        {meta.token_expires_at && (
          <div>
            <dt className="text-xs text-stone-500">Token expires</dt>
            <dd className="text-stone-800">
              {format(new Date(meta.token_expires_at), "MMM d, yyyy")}
            </dd>
          </div>
        )}
        {meta.method && (
          <div>
            <dt className="text-xs text-stone-500">Method</dt>
            <dd className="text-stone-800">{methodLabel(meta.method)}</dd>
          </div>
        )}
        {meta.resent_count > 0 && meta.last_resent_at && (
          <div>
            <dt className="text-xs text-stone-500">Resent</dt>
            <dd className="text-stone-800">
              {meta.resent_count}× · last on{" "}
              {format(new Date(meta.last_resent_at), "MMM d, yyyy")}
            </dd>
          </div>
        )}
      </dl>
    );
  }
  if (status === "signed" || status === "uploaded") {
    return (
      <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        {meta.signed_at && (
          <div>
            <dt className="text-xs text-stone-500">Signed</dt>
            <dd className="text-stone-800">
              {format(new Date(meta.signed_at), "MMM d, yyyy")}
            </dd>
          </div>
        )}
        {meta.signed_by_name && (
          <div>
            <dt className="text-xs text-stone-500">Counter-signed by</dt>
            <dd className="text-stone-800">{meta.signed_by_name}</dd>
          </div>
        )}
        {meta.method && (
          <div>
            <dt className="text-xs text-stone-500">Method</dt>
            <dd className="text-stone-800">{methodLabel(meta.method)}</dd>
          </div>
        )}
        {status === "uploaded" && meta.final_document_file_name && (
          <div>
            <dt className="text-xs text-stone-500">File</dt>
            <dd className="text-stone-800">{meta.final_document_file_name}</dd>
          </div>
        )}
      </dl>
    );
  }
  if (status === "void") {
    return (
      <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        {meta.void_reason && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-stone-500">Reason</dt>
            <dd className="text-stone-800">{meta.void_reason}</dd>
          </div>
        )}
        {meta.voided_at && (
          <div>
            <dt className="text-xs text-stone-500">Voided</dt>
            <dd className="text-stone-800">
              {format(new Date(meta.voided_at), "MMM d, yyyy")}
            </dd>
          </div>
        )}
        {meta.void_voided_by_name && (
          <div>
            <dt className="text-xs text-stone-500">By</dt>
            <dd className="text-stone-800">{meta.void_voided_by_name}</dd>
          </div>
        )}
      </dl>
    );
  }
  if (status === "expired") {
    return (
      <p className="text-sm text-stone-600">
        The signing link expired. Resend or cancel and start over.
      </p>
    );
  }
  return null;
}

function RcicPicker({
  retainerId,
  options,
  currentRcicId,
}: {
  retainerId: string;
  options: RcicOption[];
  currentRcicId: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (options.length === 0) {
    return (
      <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        No RCICs are set up yet. Mark a staff member as an RCIC on their
        team profile so the agreement can be counter-signed.
      </p>
    );
  }

  // Singleton firms see a read-only line — no need to choose between
  // one option. The server-side fallback already auto-resolves this
  // RCIC; the line is purely informational.
  if (options.length === 1) {
    const only = options[0];
    return (
      <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
        <span className="font-semibold text-stone-800">
          Counter-signed by:
        </span>{" "}
        {only.name}
        {!only.hasSignature && (
          <span className="ml-2 text-amber-700">(signature missing)</span>
        )}
      </div>
    );
  }

  function changeRcic(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await setRetainerRcic({
        retainerId,
        rcicStaffId: id,
      });
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
      <div className="mb-1 font-semibold text-stone-700">
        Counter-signed by
      </div>
      <select
        value={currentRcicId ?? ""}
        onChange={(e) => changeRcic(e.target.value)}
        disabled={pending}
        className="w-full rounded-md border border-stone-200 bg-white px-2 py-1 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
      >
        <option value="">Select an RCIC…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.hasSignature ? "" : " (signature missing)"}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function methodLabel(
  m: Database["crm"]["Enums"]["retainer_method"],
): string {
  switch (m) {
    case "online_signature":
      return "Online signature";
    case "signature_image_overlay":
      return "Signature image overlay";
    case "scanned_upload":
      return "Scanned upload";
  }
}

function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy execCommand path below. Browsers
      // block clipboard.writeText outside secure contexts (and Safari
      // is occasionally finicky after an awaited server call); the
      // fallback works on http://localhost too.
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

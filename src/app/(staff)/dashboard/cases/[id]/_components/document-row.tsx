"use client";

import {
  Check,
  ExternalLink,
  Loader2,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition, type ChangeEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/index";
import {
  ALLOWED_EXTENSIONS_HUMAN,
  ALLOWED_MIME_TYPES,
  ALLOWED_MIME_TYPES_SET,
  MAX_UPLOAD_BYTES,
  formatBytesMb,
} from "@/lib/validators/document";

import { uploadAsClient } from "@/app/upload/[token]/actions";

import {
  reviewDocument,
  setCaseDocumentRequired,
  uploadDocument,
} from "../actions";

const ACCEPT = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".doc",
  ".docx",
  ...ALLOWED_MIME_TYPES,
].join(",");

export type DocumentRowProps = {
  caseId: string;
  templateDoc: {
    document_code: string;
    document_label: string;
    is_required: boolean;
    condition_label: string | null;
    instructions: string | null;
  };
  uploaded: {
    id: string;
    status: string;
    file_name: string | null;
    sharepoint_web_url: string | null;
    version_number: number;
    rejection_reason: string | null;
  } | null;
  canEditRequired: boolean;
  canReview: boolean;
  canUpload: boolean;
  // When set, the row is being rendered inside the public client
  // portal at /upload/[token]. Upload clicks hit uploadAsClient
  // (token-validated, no auth) instead of the staff uploadDocument.
  clientPortalToken?: string;
};

export function DocumentRow({
  caseId,
  templateDoc,
  uploaded,
  canEditRequired,
  canReview,
  canUpload,
  clientPortalToken,
}: DocumentRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Required-flag toggle (case-level override).
  const [isRequired, setIsRequired] = useState(templateDoc.is_required);
  const [requiredPending, startRequiredTransition] = useTransition();
  const [requiredError, setRequiredError] = useState<string | null>(null);

  // Review state.
  const [reviewPending, startReviewTransition] = useTransition();
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  function handleToggleRequired(next: boolean) {
    setRequiredError(null);
    setIsRequired(next);
    startRequiredTransition(async () => {
      const result = await setCaseDocumentRequired({
        caseId,
        documentCode: templateDoc.document_code,
        isRequired: next,
      });
      if ("error" in result) {
        setIsRequired(!next);
        setRequiredError(result.error);
      }
    });
  }

  function handleAccept() {
    if (!uploaded) return;
    setReviewError(null);
    startReviewTransition(async () => {
      const result = await reviewDocument({
        documentId: uploaded.id,
        decision: "accept",
      });
      if ("error" in result) setReviewError(result.error);
    });
  }

  function handleReject() {
    if (!uploaded || !rejectReason.trim()) {
      setReviewError("Provide a reason.");
      return;
    }
    setReviewError(null);
    startReviewTransition(async () => {
      const result = await reviewDocument({
        documentId: uploaded.id,
        decision: "reject",
        reason: rejectReason.trim(),
      });
      if ("error" in result) {
        setReviewError(result.error);
        return;
      }
      setRejectOpen(false);
      setRejectReason("");
    });
  }

  const status = uploaded?.status ?? null;
  const isAccepted = status === "accepted";
  const isRejected = status === "rejected";
  const isAwaitingReview = status === "uploaded";
  const hasUpload = isAccepted || isRejected || isAwaitingReview;
  const isConditional = templateDoc.condition_label !== null;

  function trigger() {
    setError(null);
    inputRef.current?.click();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(
        `File exceeds the 4MB limit (${formatBytesMb(file.size)} MB). Compress or split before uploading.`,
      );
      return;
    }
    if (!ALLOWED_MIME_TYPES_SET.has(file.type)) {
      setError(
        `File type ${file.type || "unknown"} is not allowed. Use ${ALLOWED_EXTENSIONS_HUMAN}.`,
      );
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    startTransition(async () => {
      const result = clientPortalToken
        ? await uploadAsClient(
            clientPortalToken,
            templateDoc.document_code,
            fd,
          )
        : await uploadDocument(caseId, templateDoc.document_code, fd);
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <li
      className={cn(
        "relative flex flex-col gap-2 py-3",
        pending && "opacity-60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={ACCEPT}
        onChange={handleChange}
      />

      <div className="flex items-center gap-3">
        {/* Status icon — drives at-a-glance state */}
        {isAccepted ? (
          <span
            aria-label="Accepted"
            title="Accepted"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-200 text-green-800"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        ) : isRejected ? (
          <span
            aria-label="Rejected"
            title="Rejected — reupload required"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-200 text-red-800"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        ) : isAwaitingReview ? (
          <span
            aria-label="Awaiting review"
            title="Awaiting review"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        ) : (
          <span
            aria-label="Missing"
            className="h-6 w-6 shrink-0 rounded-full border-2 border-dashed border-stone-300"
          />
        )}

        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 text-sm",
              isConditional && !hasUpload
                ? "text-stone-500"
                : "font-medium text-stone-900",
            )}
          >
            <span>{templateDoc.document_label}</span>
            {isRequired ? (
              <span
                aria-label="Required"
                title="Required to advance phase"
                className="text-red-600"
              >
                *
              </span>
            ) : (
              <span
                aria-label="Optional"
                className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500"
              >
                Optional
              </span>
            )}
            {isAwaitingReview && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                Awaiting review
              </span>
            )}
            {isRejected && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-800">
                Rejected
              </span>
            )}
            {canEditRequired && (
              <label
                className="ml-2 inline-flex items-center gap-1 text-[11px] font-normal text-stone-500"
                title="Toggle whether this document is required for this case"
              >
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => handleToggleRequired(e.target.checked)}
                  disabled={requiredPending}
                  className="h-3 w-3 cursor-pointer"
                />
                <span>Required</span>
              </label>
            )}
          </div>
          {requiredError && (
            <p className="mt-1 text-xs text-destructive">{requiredError}</p>
          )}
          {templateDoc.condition_label && (
            <div className="mt-0.5 text-xs text-stone-500">
              {templateDoc.condition_label}
            </div>
          )}
          {templateDoc.instructions && (
            <div className="mt-0.5 text-xs text-stone-500">
              {templateDoc.instructions}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasUpload && uploaded?.file_name && (
            <span
              className="max-w-[160px] truncate text-xs text-stone-500"
              title={uploaded.file_name}
            >
              {uploaded.file_name}
            </span>
          )}
          {hasUpload && uploaded?.sharepoint_web_url && canReview && (
            <Link
              href={uploaded.sharepoint_web_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in OneDrive"
              className={buttonVariants({ size: "sm", variant: "ghost" })}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}

          {/* Reviewer controls — only on the latest upload that's still
              awaiting review. Once accepted/rejected, controls hide. */}
          {canReview && isAwaitingReview && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={handleAccept}
                disabled={reviewPending}
                title="Accept this document"
              >
                {reviewPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectOpen(true)}
                disabled={reviewPending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}

          {canUpload && (
            <Button
              variant={hasUpload ? "ghost" : "outline"}
              size="sm"
              onClick={trigger}
              disabled={pending}
              title={
                isRejected
                  ? "Re-upload to replace the rejected version"
                  : hasUpload
                    ? "Replace with a newer version"
                    : "Upload"
              }
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : hasUpload ? (
                <UploadIcon className="h-3.5 w-3.5" />
              ) : (
                <>
                  <UploadIcon className="mr-1 h-3.5 w-3.5" />
                  Upload
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Rejection reason banner — visible to everyone reading the row */}
      {isRejected && uploaded?.rejection_reason && (
        <div className="ml-9 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          <span className="font-semibold">Reviewer note:</span>{" "}
          {uploaded.rejection_reason}
          {canUpload && (
            <span className="ml-2 text-red-800">
              Re-upload using the button above to replace this version.
            </span>
          )}
        </div>
      )}

      {reviewError && (
        <p
          role="alert"
          className="ml-9 text-xs text-destructive"
        >
          {reviewError}
        </p>
      )}

      {/* Reject dialog — required reason */}
      <Dialog
        open={rejectOpen}
        onOpenChange={(o) => {
          if (reviewPending) return;
          setRejectOpen(o);
          if (!o) {
            setRejectReason("");
            setReviewError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>
              Tell the document officer what needs to change. The reason is
              shown on the case page until a replacement is uploaded.
            </DialogDescription>
          </DialogHeader>

          <label className="block text-sm">
            <span className="block text-xs font-medium text-stone-600">
              Reason
            </span>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              maxLength={500}
              disabled={reviewPending}
              placeholder="e.g. Passport photo page is blurry; need a clearer scan."
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
            />
          </label>

          {reviewError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {reviewError}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={reviewPending}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleReject}
              disabled={reviewPending || !rejectReason.trim()}
              className="bg-red-700 text-white hover:bg-red-800"
            >
              {reviewPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Rejecting…
                </>
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

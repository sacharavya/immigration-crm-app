"use client";

import {
  Check,
  Eye,
  Loader2,
  Plus,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import { useRef, useState, useTransition, type ChangeEvent } from "react";

import { FileViewerDialog } from "@/components/files/file-viewer-dialog";
import { Button } from "@/components/ui/button";
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

import {
  reuploadFileAsClient,
  uploadAsClient,
  uploadFileAsClient,
} from "@/app/upload/[token]/actions";

import {
  reuploadFile,
  reviewDocument,
  setCaseDocumentRequired,
  uploadDocument,
  uploadFile,
} from "../actions";

import type { FileRow } from "./document-checklist";

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
    expected_quantity: number;
  };
  // All live (non-superseded, non-deleted) files for the slot, sorted
  // by created_at ascending. Single-file slots have 0 or 1 entries.
  files: FileRow[];
  canEditRequired: boolean;
  canReview: boolean;
  canUpload: boolean;
  // When set, the row is rendered inside the public client portal at
  // /upload/[token]. Upload + reupload clicks hit the portal actions
  // (token-validated, no auth) instead of the staff actions.
  clientPortalToken?: string;
};

// ============================================================================
// Status helpers (shared between single + multi-file branches)
// ============================================================================

type FileStatus = "uploaded" | "accepted" | "rejected" | "unknown";

function fileStatus(file: FileRow): FileStatus {
  if (file.status === "uploaded") return "uploaded";
  if (file.status === "accepted") return "accepted";
  if (file.status === "rejected") return "rejected";
  return "unknown";
}

function StatusIcon({ status }: { status: FileStatus | "missing" }) {
  if (status === "accepted") {
    return (
      <span
        aria-label="Accepted"
        title="Accepted"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-200 text-green-800"
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span
        aria-label="Rejected"
        title="Rejected — reupload required"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-200 text-red-800"
      >
        <X className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "uploaded") {
    return (
      <span
        aria-label="Awaiting review"
        title="Awaiting review"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800"
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      aria-label="Missing"
      className="h-6 w-6 shrink-0 rounded-full border-2 border-dashed border-stone-300"
    />
  );
}

function StatusPill({ status }: { status: FileStatus }) {
  if (status === "accepted") {
    return (
      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-800">
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-800">
        Action needed
      </span>
    );
  }
  if (status === "uploaded") {
    return (
      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
        Awaiting review
      </span>
    );
  }
  return null;
}

// Derived item-level status for the multi-file slot summary.
function deriveItemSummary(files: FileRow[], expected: number): {
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  liveCount: number;
  capacityReached: boolean;
  itemStatus: "approved" | "awaiting_review" | "action_needed" | "missing";
} {
  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;
  for (const f of files) {
    if (f.status === "accepted") approvedCount++;
    else if (f.status === "uploaded") pendingCount++;
    else if (f.status === "rejected") rejectedCount++;
  }
  const liveCount = files.length;
  const capacityReached = liveCount >= expected;
  let itemStatus: "approved" | "awaiting_review" | "action_needed" | "missing";
  if (rejectedCount > 0) {
    itemStatus = "action_needed";
  } else if (pendingCount > 0) {
    itemStatus = "awaiting_review";
  } else if (capacityReached && approvedCount === liveCount && liveCount > 0) {
    itemStatus = "approved";
  } else {
    itemStatus = "missing";
  }
  return {
    approvedCount,
    pendingCount,
    rejectedCount,
    liveCount,
    capacityReached,
    itemStatus,
  };
}

// ============================================================================
// Reject dialog — shared between single and multi-file branches
// ============================================================================

function RejectDialog({
  open,
  pending,
  reason,
  error,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  reason: string;
  error: string | null;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return;
        if (!o) onCancel();
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
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            maxLength={500}
            disabled={pending}
            placeholder="e.g. Passport photo page is blurry; need a clearer scan."
            className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            disabled={pending || !reason.trim()}
            className="bg-red-700 text-white hover:bg-red-800"
          >
            {pending ? (
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
  );
}

// ============================================================================
// Validator shared between the legacy and per-file file inputs
// ============================================================================

function validateFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File exceeds the 4MB limit (${formatBytesMb(file.size)} MB). Compress or split before uploading.`;
  }
  if (!ALLOWED_MIME_TYPES_SET.has(file.type)) {
    return `File type ${file.type || "unknown"} is not allowed. Use ${ALLOWED_EXTENSIONS_HUMAN}.`;
  }
  return null;
}

// ============================================================================
// Main row
// ============================================================================

export function DocumentRow(props: DocumentRowProps) {
  const { templateDoc, files } = props;
  const isMulti = templateDoc.expected_quantity > 1 || files.length > 1;
  return isMulti ? <MultiFileRow {...props} /> : <SingleFileRow {...props} />;
}

// ============================================================================
// SingleFileRow — preserves the legacy single-file UI verbatim, with one
// change: the OneDrive ExternalLink is replaced by an in-app View button
// that opens FileViewerDialog. OneDrive URLs no longer reach the browser.
// ============================================================================

function SingleFileRow({
  caseId,
  templateDoc,
  files,
  canEditRequired,
  canReview,
  canUpload,
  clientPortalToken,
}: DocumentRowProps) {
  const live = files[0] ?? null;
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

  // Viewer state.
  const [viewerOpen, setViewerOpen] = useState(false);

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
    if (!live) return;
    setReviewError(null);
    startReviewTransition(async () => {
      const result = await reviewDocument({
        documentId: live.id,
        decision: "accept",
      });
      if ("error" in result) setReviewError(result.error);
    });
  }

  function handleReject() {
    if (!live || !rejectReason.trim()) {
      setReviewError("Provide a reason.");
      return;
    }
    setReviewError(null);
    startReviewTransition(async () => {
      const result = await reviewDocument({
        documentId: live.id,
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

  const status: FileStatus | "missing" = live ? fileStatus(live) : "missing";
  const hasUpload = status !== "missing";
  const isAccepted = status === "accepted";
  const isRejected = status === "rejected";
  const isAwaitingReview = status === "uploaded";
  const isConditional = templateDoc.condition_label !== null;

  function trigger() {
    setError(null);
    inputRef.current?.click();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validation = validateFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      // Dispatcher wrappers (uploadDocument / uploadAsClient) auto-
      // route to uploadFile for fresh slots and reuploadFile for
      // rejected slots. Single-file branch never adds siblings.
      const result = clientPortalToken
        ? await uploadAsClient(clientPortalToken, templateDoc.document_code, fd)
        : await uploadDocument(caseId, templateDoc.document_code, fd);
      if ("error" in result) setError(result.error);
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
        <StatusIcon status={status} />

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
            {isAwaitingReview && <StatusPill status="uploaded" />}
            {isRejected && <StatusPill status="rejected" />}
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
          {hasUpload && live?.file_name && (
            <span
              className="max-w-[160px] truncate text-xs text-stone-500"
              title={live.file_name}
            >
              {live.file_name}
            </span>
          )}
          {hasUpload && live && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewerOpen(true)}
              title="View file"
              aria-label="View file"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
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
              disabled={pending || isAccepted || isAwaitingReview}
              title={
                isAccepted
                  ? "Already approved"
                  : isAwaitingReview
                    ? "Awaiting review — wait for the reviewer to act before replacing"
                    : isRejected
                      ? "Re-upload to replace the rejected version"
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

      {isRejected && live?.rejection_reason && (
        <div className="ml-9 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          <span className="font-semibold">Reviewer note:</span>{" "}
          {live.rejection_reason}
          {canUpload && (
            <span className="ml-2 text-red-800">
              Re-upload using the button above to replace this version.
            </span>
          )}
        </div>
      )}

      {reviewError && (
        <p role="alert" className="ml-9 text-xs text-destructive">
          {reviewError}
        </p>
      )}

      {live && (
        <FileViewerDialog
          fileId={live.id}
          fileName={live.file_name ?? `file-${live.id.slice(0, 8)}`}
          mimeType={live.mime_type}
          versionNumber={live.version_number}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          reviewSlot={
            canReview && isAwaitingReview ? (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    handleAccept();
                    setViewerOpen(false);
                  }}
                  disabled={reviewPending}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setViewerOpen(false);
                    setRejectOpen(true);
                  }}
                  disabled={reviewPending}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Reject
                </Button>
              </>
            ) : undefined
          }
        />
      )}

      <RejectDialog
        open={rejectOpen}
        pending={reviewPending}
        reason={rejectReason}
        error={reviewError}
        onReasonChange={setRejectReason}
        onCancel={() => {
          setRejectOpen(false);
          setRejectReason("");
          setReviewError(null);
        }}
        onConfirm={handleReject}
      />
    </li>
  );
}

// ============================================================================
// MultiFileRow — summary line + indented sub-list of file rows. Each file
// row has its own Approve / Reject / View / Re-upload controls bound to
// the file's id and file_group_key.
// ============================================================================

function MultiFileRow({
  caseId,
  templateDoc,
  files,
  canEditRequired,
  canReview,
  canUpload,
  clientPortalToken,
}: DocumentRowProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const [addPending, startAddTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);

  const [isRequired, setIsRequired] = useState(templateDoc.is_required);
  const [requiredPending, startRequiredTransition] = useTransition();
  const [requiredError, setRequiredError] = useState<string | null>(null);

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

  function triggerAdd() {
    setAddError(null);
    addInputRef.current?.click();
  }

  function handleAddChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validation = validateFile(file);
    if (validation) {
      setAddError(validation);
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    startAddTransition(async () => {
      // Sibling additions go straight to the new uploadFile /
      // uploadFileAsClient action (fresh group key, version 1).
      const result = clientPortalToken
        ? await uploadFileAsClient(
            clientPortalToken,
            templateDoc.document_code,
            fd,
          )
        : await uploadFile(caseId, templateDoc.document_code, fd);
      if ("error" in result) setAddError(result.error);
    });
  }

  const summary = deriveItemSummary(files, templateDoc.expected_quantity);
  const isConditional = templateDoc.condition_label !== null;
  const canAddMore = canUpload && summary.liveCount < templateDoc.expected_quantity;
  const sortedFiles = [...files].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  return (
    <li className="relative flex flex-col gap-2 py-3">
      <input
        ref={addInputRef}
        type="file"
        hidden
        accept={ACCEPT}
        onChange={handleAddChange}
      />

      <div className="flex items-center gap-3">
        <StatusIcon
          status={
            summary.itemStatus === "approved"
              ? "accepted"
              : summary.itemStatus === "action_needed"
                ? "rejected"
                : summary.itemStatus === "awaiting_review"
                  ? "uploaded"
                  : "missing"
          }
        />

        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 text-sm",
              isConditional && summary.liveCount === 0
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
            <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-600">
              {summary.approvedCount} of {templateDoc.expected_quantity}{" "}
              approved
            </span>
            {summary.pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                {summary.pendingCount} awaiting review
              </span>
            )}
            {summary.rejectedCount > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-800">
                {summary.rejectedCount} action needed
              </span>
            )}
            {canEditRequired && (
              <label className="ml-2 inline-flex items-center gap-1 text-[11px] font-normal text-stone-500">
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
          {addError && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {addError}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canAddMore && (
            <Button
              size="sm"
              variant="outline"
              onClick={triggerAdd}
              disabled={addPending}
              title="Add another file to this slot"
            >
              {addPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add another file
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {sortedFiles.length > 0 && (
        <ul className="ml-9 mt-1 space-y-1 border-l-2 border-stone-100 pl-3">
          {sortedFiles.map((f, idx) => (
            <FileLine
              key={f.id}
              file={f}
              indexLabel={`#${idx + 1}`}
              canReview={canReview}
              canUpload={canUpload}
              clientPortalToken={clientPortalToken}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ============================================================================
// FileLine — one row in the multi-file sub-list. Carries its own review
// + viewer + reupload state since each file is an independent unit.
// ============================================================================

function FileLine({
  file,
  indexLabel,
  canReview,
  canUpload,
  clientPortalToken,
}: {
  file: FileRow;
  indexLabel: string;
  canReview: boolean;
  canUpload: boolean;
  clientPortalToken?: string;
}) {
  const reuploadRef = useRef<HTMLInputElement>(null);
  const [reuploadPending, startReuploadTransition] = useTransition();
  const [reuploadError, setReuploadError] = useState<string | null>(null);

  const [reviewPending, startReviewTransition] = useTransition();
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [viewerOpen, setViewerOpen] = useState(false);

  const status = fileStatus(file);
  const isAwaiting = status === "uploaded";
  const isRejected = status === "rejected";

  function handleAccept() {
    setReviewError(null);
    startReviewTransition(async () => {
      const result = await reviewDocument({
        documentId: file.id,
        decision: "accept",
      });
      if ("error" in result) setReviewError(result.error);
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      setReviewError("Provide a reason.");
      return;
    }
    setReviewError(null);
    startReviewTransition(async () => {
      const result = await reviewDocument({
        documentId: file.id,
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

  function triggerReupload() {
    setReuploadError(null);
    reuploadRef.current?.click();
  }

  function handleReuploadChange(e: ChangeEvent<HTMLInputElement>) {
    const upload = e.target.files?.[0];
    e.target.value = "";
    if (!upload) return;
    const validation = validateFile(upload);
    if (validation) {
      setReuploadError(validation);
      return;
    }
    const fd = new FormData();
    fd.append("file", upload);
    startReuploadTransition(async () => {
      const result = clientPortalToken
        ? await reuploadFileAsClient(
            clientPortalToken,
            file.file_group_key,
            fd,
          )
        : await reuploadFile(file.file_group_key, fd);
      if ("error" in result) setReuploadError(result.error);
    });
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-1 py-1",
        (reuploadPending || reviewPending) && "opacity-60",
      )}
    >
      <input
        ref={reuploadRef}
        type="file"
        hidden
        accept={ACCEPT}
        onChange={handleReuploadChange}
      />

      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-[10px] text-stone-400">
          {indexLabel}
        </span>
        <span
          className="min-w-0 max-w-[220px] truncate text-stone-700"
          title={file.file_name ?? undefined}
        >
          {file.file_name ?? "file"}
        </span>
        {file.version_number > 1 && (
          <span className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] text-stone-600">
            v{file.version_number}
          </span>
        )}
        <StatusPill status={status} />
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setViewerOpen(true)}
            aria-label="View"
            title="View"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canReview && isAwaiting && (
            <>
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={reviewPending}
                title="Accept this file"
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
          {canUpload && isRejected && (
            <Button
              size="sm"
              variant="outline"
              onClick={triggerReupload}
              disabled={reuploadPending}
              title="Replace this rejected file"
            >
              {reuploadPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <UploadIcon className="mr-1 h-3.5 w-3.5" />
                  Re-upload
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isRejected && file.rejection_reason && (
        <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-900">
          <span className="font-semibold">Reviewer note:</span>{" "}
          {file.rejection_reason}
        </div>
      )}

      {reuploadError && (
        <p role="alert" className="text-[11px] text-destructive">
          {reuploadError}
        </p>
      )}
      {reviewError && (
        <p role="alert" className="text-[11px] text-destructive">
          {reviewError}
        </p>
      )}

      <FileViewerDialog
        fileId={file.id}
        fileName={file.file_name ?? `file-${file.id.slice(0, 8)}`}
        mimeType={file.mime_type}
        versionNumber={file.version_number}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        reviewSlot={
          canReview && isAwaiting ? (
            <>
              <Button
                size="sm"
                onClick={() => {
                  handleAccept();
                  setViewerOpen(false);
                }}
                disabled={reviewPending}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setViewerOpen(false);
                  setRejectOpen(true);
                }}
                disabled={reviewPending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          ) : undefined
        }
      />

      <RejectDialog
        open={rejectOpen}
        pending={reviewPending}
        reason={rejectReason}
        error={reviewError}
        onReasonChange={setRejectReason}
        onCancel={() => {
          setRejectOpen(false);
          setRejectReason("");
          setReviewError(null);
        }}
        onConfirm={handleReject}
      />
    </li>
  );
}

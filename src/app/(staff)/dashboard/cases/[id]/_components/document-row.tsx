"use client";

import {
  Check,
  ChevronDown,
  Eye,
  Loader2,
  Pencil,
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
import {
  deriveRequirementState,
  fileStatus,
  parseDocumentFileName,
  type FileDisplayStatus,
  type RequirementState,
} from "@/lib/files/document-display";
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
import { ShareLinkDialog } from "./share-link-dialog";

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
    allows_multiple?: boolean;
  };
  // Live (non-superseded, non-deleted) files for the slot, oldest first.
  files: FileRow[];
  // All files incl. superseded, sorted by version, for the history affordance.
  history?: FileRow[];
  reviewerNameById?: Record<string, string>;
  // Small category label shown on every row so the category is never lost.
  categoryLabel?: string;
  canEditRequired: boolean;
  canReview: boolean;
  canUpload: boolean;
  // Portal mode (client upload page): upload/reupload hit the token actions.
  clientPortalToken?: string;
  // For the staff "Ask client to re-upload" affordance.
  caseShareToken?: string | null;
  clientEmail?: string | null;
};

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function validateFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File exceeds the 4MB limit (${formatBytesMb(file.size)} MB). Compress or split before uploading.`;
  }
  if (!ALLOWED_MIME_TYPES_SET.has(file.type)) {
    return `File type ${file.type || "unknown"} is not allowed. Use ${ALLOWED_EXTENSIONS_HUMAN}.`;
  }
  return null;
}

const STATE_TEXT: Record<RequirementState, string> = {
  not_uploaded: "Not uploaded",
  awaiting_review: "Awaiting your review",
  needs_new_file: "Needs a new file",
  collected: "Collected",
};

// Requirement-level status mark: a small dot whose colour + adjacent text
// convey state (never colour alone).
function StatusMark({ state }: { state: RequirementState }) {
  const cls =
    state === "collected"
      ? "bg-[var(--success-subtle)] text-[var(--success-text)]"
      : state === "awaiting_review"
        ? "bg-[var(--warning-subtle)] text-[var(--warning-text)]"
        : state === "needs_new_file"
          ? "bg-[var(--destructive-subtle)] text-[var(--destructive-text)]"
          : "bg-[var(--muted)] text-[var(--subtle-foreground)]";
  return (
    <span
      aria-label={STATE_TEXT[state]}
      title={STATE_TEXT[state]}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
        cls,
      )}
    >
      {state === "collected" ? (
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      ) : state === "needs_new_file" ? (
        <X className="h-3.5 w-3.5" strokeWidth={3} />
      ) : state === "awaiting_review" ? (
        <span className="h-2 w-2 rounded-full bg-current" />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full border-2 border-current" />
      )}
    </span>
  );
}

function StatusPill({ status }: { status: FileDisplayStatus }) {
  if (status === "approved") {
    return (
      <span className="rounded-full bg-[var(--success-subtle)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--success-text)]">
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-full bg-[var(--destructive-subtle)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--destructive-text)]">
        Needs a new file
      </span>
    );
  }
  if (status === "awaiting_review") {
    return (
      <span className="rounded-full bg-[var(--warning-subtle)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--warning-text)]">
        Awaiting review
      </span>
    );
  }
  return null;
}

function VersionBadge({ version }: { version: number }) {
  return (
    <span className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
      v{version}
    </span>
  );
}

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
            Tell the client what needs to change. The reason shows on the case
            until a replacement is uploaded.
          </DialogDescription>
        </DialogHeader>
        <label className="block text-sm">
          <span className="block text-xs font-medium text-[var(--muted-foreground)]">
            Reason
          </span>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            maxLength={500}
            disabled={pending}
            placeholder="e.g. Passport photo page is blurry; need a clearer scan."
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-[var(--destructive-subtle)] bg-[var(--destructive-subtle)] px-3 py-2 text-sm text-[var(--destructive-text)]"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={pending || !reason.trim()}
            className="bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Rejecting
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

// ---------------------------------------------------------------------------
// FileUnit - one live file: chip + status + view + review/replace actions.
// Reused by single requirements (no index) and multi lines (with a label).
// ---------------------------------------------------------------------------

function FileUnit({
  file,
  documentCode,
  label,
  replaceLabel,
  canReview,
  canUpload,
  clientPortalToken,
}: {
  file: FileRow;
  documentCode: string;
  label?: string;
  replaceLabel: string;
  canReview: boolean;
  canUpload: boolean;
  clientPortalToken?: string;
}) {
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replacePending, startReplace] = useTransition();
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [reviewPending, startReview] = useTransition();
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);

  const status = fileStatus(file.status);
  const isAwaiting = status === "awaiting_review";
  const isRejected = status === "rejected";
  const parsed = parseDocumentFileName(
    file.file_name,
    documentCode,
    file.version_number,
  );

  function handleAccept() {
    setReviewError(null);
    startReview(async () => {
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
    startReview(async () => {
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

  function triggerReplace() {
    setReplaceError(null);
    replaceRef.current?.click();
  }

  function handleReplace(e: ChangeEvent<HTMLInputElement>) {
    const upload = e.target.files?.[0];
    e.target.value = "";
    if (!upload) return;
    const validation = validateFile(upload);
    if (validation) {
      setReplaceError(validation);
      return;
    }
    const fd = new FormData();
    fd.append("file", upload);
    startReplace(async () => {
      const result = clientPortalToken
        ? await reuploadFileAsClient(clientPortalToken, file.file_group_key, fd)
        : await reuploadFile(file.file_group_key, fd);
      if ("error" in result) setReplaceError(result.error);
    });
  }

  return (
    <div className={cn(replacePending || reviewPending ? "opacity-60" : "")}>
      <input
        ref={replaceRef}
        type="file"
        hidden
        accept={ACCEPT}
        onChange={handleReplace}
      />
      <div className="flex items-center gap-2 text-xs">
        {label && (
          <span className="shrink-0 font-medium text-[var(--foreground)]">
            {label}
          </span>
        )}
        <span
          className="min-w-0 max-w-[220px] truncate font-mono text-[var(--muted-foreground)]"
          title={parsed.originalName}
        >
          {parsed.originalName}
        </span>
        <VersionBadge version={parsed.version} />
        <StatusPill status={status} />
        {file.uploaded_by_client === false && (
          <span className="rounded bg-[var(--muted)] px-1 py-0.5 text-[10px] text-[var(--navy-700)]">
            Added by the firm
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setViewerOpen(true)}
            aria-label={`View ${parsed.originalName}`}
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
                className="bg-[var(--navy)] text-white hover:bg-[var(--navy-800)]"
                aria-label="Approve this file"
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
                variant="ghost"
                onClick={() => setRejectOpen(true)}
                disabled={reviewPending}
                className="text-[var(--destructive-text)] hover:bg-[var(--destructive-subtle)] hover:text-[var(--destructive-text)]"
                aria-label="Reject this file"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}
          {canUpload && isRejected && (
            <Button
              size="sm"
              onClick={triggerReplace}
              disabled={replacePending}
              className="bg-[var(--navy)] text-white hover:bg-[var(--navy-800)]"
              aria-label={replaceLabel}
            >
              {replacePending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <UploadIcon className="mr-1 h-3.5 w-3.5" />
                  {replaceLabel}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isRejected && file.rejection_reason && (
        <p className="mt-1 text-[11px]">
          <span className="text-[var(--destructive-text)]">
            {file.rejection_reason}
          </span>
        </p>
      )}
      {replaceError && (
        <p role="alert" className="mt-1 text-[11px] text-[var(--destructive-text)]">
          {replaceError}
        </p>
      )}
      {reviewError && (
        <p role="alert" className="mt-1 text-[11px] text-[var(--destructive-text)]">
          {reviewError}
        </p>
      )}

      <FileViewerDialog
        fileId={file.id}
        fileName={parsed.originalName}
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
                className="bg-[var(--navy)] text-white hover:bg-[var(--navy-800)]"
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setViewerOpen(false);
                  setRejectOpen(true);
                }}
                disabled={reviewPending}
                className="text-[var(--destructive-text)] hover:bg-[var(--destructive-subtle)] hover:text-[var(--destructive-text)]"
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Version history - lists every version (incl. superseded) for the slot.
// ---------------------------------------------------------------------------

function VersionHistory({
  history,
  documentCode,
  reviewerNameById,
}: {
  history: FileRow[];
  documentCode: string;
  reviewerNameById?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);

  return (
    <div className="ml-9 mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        />
        Version history ({history.length})
      </button>
      {open && (
        <ul className="mt-1 space-y-1 border-l-2 border-[var(--border)] pl-3">
          {history.map((h) => {
            const parsed = parseDocumentFileName(
              h.file_name,
              documentCode,
              h.version_number,
            );
            const status = fileStatus(h.status);
            const reviewer = h.reviewed_by
              ? reviewerNameById?.[h.reviewed_by]
              : undefined;
            return (
              <li key={h.id} className="flex flex-col gap-0.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <VersionBadge version={parsed.version} />
                  <span
                    className="min-w-0 max-w-[200px] truncate font-mono text-[var(--muted-foreground)]"
                    title={parsed.originalName}
                  >
                    {parsed.originalName}
                  </span>
                  {h.status === "superseded" ? (
                    <span className="text-[var(--subtle-foreground)]">
                      Replaced
                    </span>
                  ) : (
                    <StatusPill status={status} />
                  )}
                  <button
                    type="button"
                    onClick={() => setViewerId(h.id)}
                    aria-label={`View version ${parsed.version}`}
                    className="ml-auto inline-flex items-center gap-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </button>
                </div>
                {h.rejection_reason && (
                  <p className="pl-1">
                    <span className="text-[var(--destructive-text)]">
                      {h.rejection_reason}
                    </span>
                    {reviewer && (
                      <span className="text-[var(--muted-foreground)]">
                        {" "}
                        by {reviewer}
                      </span>
                    )}
                  </p>
                )}
                {viewerId === h.id && (
                  <FileViewerDialog
                    fileId={h.id}
                    fileName={parsed.originalName}
                    mimeType={h.mime_type}
                    versionNumber={h.version_number}
                    open={viewerId === h.id}
                    onOpenChange={(o) => setViewerId(o ? h.id : null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Required edit affordance - a small pencil that reveals a labelled toggle,
// keeping the status line a clean display of state.
// ---------------------------------------------------------------------------

function RequiredEdit({
  caseId,
  documentCode,
  isRequired,
}: {
  caseId: string;
  documentCode: string;
  isRequired: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(isRequired);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    setError(null);
    setValue(next);
    startTransition(async () => {
      const result = await setCaseDocumentRequired({
        caseId,
        documentCode,
        isRequired: next,
      });
      if ("error" in result) {
        setValue(!next);
        setError(result.error);
      }
    });
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        aria-label="Edit whether this document is required"
        title="Edit requirement"
        className="rounded p-1 text-[var(--subtle-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <Pencil className="h-3 w-3" />
      </button>
      {editing && (
        <span className="absolute left-0 top-6 z-10 w-max rounded-md border border-[var(--border)] bg-white p-2 shadow">
          <label className="flex items-center gap-2 text-xs text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => toggle(e.target.checked)}
              disabled={pending}
              className="h-3.5 w-3.5 accent-[var(--navy)]"
            />
            Required for this case
          </label>
          {error && (
            <span className="mt-1 block text-[11px] text-[var(--destructive-text)]">
              {error}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main row
// ---------------------------------------------------------------------------

export function DocumentRow({
  caseId,
  templateDoc,
  files,
  history = [],
  reviewerNameById,
  categoryLabel,
  canEditRequired,
  canReview,
  canUpload,
  clientPortalToken,
  caseShareToken,
  clientEmail,
}: DocumentRowProps) {
  const allowsMultiple = templateDoc.allows_multiple ?? false;
  const state = deriveRequirementState(files);

  // Requirement-level upload (no files yet, or single-file fresh upload).
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploadPending, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Add another (multi sibling, always a fresh group / version 1).
  const addRef = useRef<HTMLInputElement>(null);
  const [addPending, startAdd] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);

  function triggerUpload() {
    setUploadError(null);
    uploadRef.current?.click();
  }
  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validation = validateFile(file);
    if (validation) {
      setUploadError(validation);
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    startUpload(async () => {
      const result = clientPortalToken
        ? await uploadAsClient(clientPortalToken, templateDoc.document_code, fd)
        : await uploadDocument(caseId, templateDoc.document_code, fd);
      if ("error" in result) setUploadError(result.error);
    });
  }

  function triggerAdd() {
    setAddError(null);
    addRef.current?.click();
  }
  function handleAdd(e: ChangeEvent<HTMLInputElement>) {
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
    startAdd(async () => {
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

  const label = templateDoc.document_label;
  const noun = label || "file";
  const hasHistory = history.length > files.length;
  const isStaff = !clientPortalToken;

  return (
    <li className="flex flex-col gap-2 py-3">
      <input
        ref={uploadRef}
        type="file"
        hidden
        accept={ACCEPT}
        onChange={handleUpload}
      />
      <input
        ref={addRef}
        type="file"
        hidden
        accept={ACCEPT}
        onChange={handleAdd}
      />

      {/* Header: status mark, name, category, required/optional, edit. */}
      <div className="flex items-start gap-3">
        <StatusMark state={state} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">
              {label}
            </span>
            {categoryLabel && (
              <span className="text-[11px] uppercase tracking-wide text-[var(--subtle-foreground)]">
                {categoryLabel}
              </span>
            )}
            {templateDoc.is_required ? (
              <span className="rounded-full bg-[var(--navy-100)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--navy-700)]">
                Required
              </span>
            ) : (
              <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                Optional
              </span>
            )}
            {canEditRequired && (
              <RequiredEdit
                caseId={caseId}
                documentCode={templateDoc.document_code}
                isRequired={templateDoc.is_required}
              />
            )}
          </div>
          {templateDoc.condition_label && (
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {templateDoc.condition_label}
            </p>
          )}
          {templateDoc.instructions && (
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {templateDoc.instructions}
            </p>
          )}
        </div>

        {/* Requirement-level actions on the right. */}
        <div className="flex shrink-0 items-center gap-2">
          {state === "not_uploaded" && canUpload && (
            <Button
              size="sm"
              variant="outline"
              onClick={triggerUpload}
              disabled={uploadPending}
              aria-label={`Upload ${label}`}
            >
              {uploadPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <UploadIcon className="mr-1 h-3.5 w-3.5" />
                  Upload
                </>
              )}
            </Button>
          )}
          {state === "needs_new_file" && isStaff && canUpload && (
            <ShareLinkDialog
              caseId={caseId}
              initialToken={caseShareToken ?? null}
              clientEmail={clientEmail ?? null}
              triggerLabel="Ask client to re-upload"
              triggerVariant="outline"
            />
          )}
        </div>
      </div>

      {uploadError && (
        <p role="alert" className="ml-9 text-xs text-[var(--destructive-text)]">
          {uploadError}
        </p>
      )}

      {/* File body. */}
      {files.length > 0 &&
        (allowsMultiple ? (
          <div className="ml-9 rounded-md border border-[var(--border)] bg-[var(--muted)]/40">
            <ul className="divide-y divide-[var(--border)]">
              {files.map((f, idx) => (
                <li key={f.id} className="px-3 py-2">
                  <FileUnit
                    file={f}
                    documentCode={templateDoc.document_code}
                    label={`${noun} ${idx + 1}`}
                    replaceLabel="Replace"
                    canReview={canReview}
                    canUpload={canUpload}
                    clientPortalToken={clientPortalToken}
                  />
                </li>
              ))}
            </ul>
            {canUpload && (
              <div className="border-t border-[var(--border)] p-2">
                <button
                  type="button"
                  onClick={triggerAdd}
                  disabled={addPending}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--border-secondary)] px-2.5 py-1 text-xs text-[var(--subtle-foreground)] hover:bg-[var(--muted)] disabled:opacity-60"
                >
                  {addPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Add another {noun}
                    </>
                  )}
                </button>
                {addError && (
                  <p
                    role="alert"
                    className="mt-1 text-[11px] text-[var(--destructive-text)]"
                  >
                    {addError}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="ml-9">
            <FileUnit
              file={files[0]}
              documentCode={templateDoc.document_code}
              replaceLabel="Upload replacement"
              canReview={canReview}
              canUpload={canUpload}
              clientPortalToken={clientPortalToken}
            />
          </div>
        ))}

      {hasHistory && (
        <VersionHistory
          history={history}
          documentCode={templateDoc.document_code}
          reviewerNameById={reviewerNameById}
        />
      )}
    </li>
  );
}

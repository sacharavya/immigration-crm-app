"use client";

import {
  Building2,
  Check,
  CircleAlert,
  CircleDashed,
  Clock,
  Loader2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { cn } from "@/lib/utils/index";

import { reuploadFileAsClient, uploadFileAsClient } from "../actions";

// File types the client may send. Mirrors the server's ALLOWED_MIME_TYPES;
// the server re-validates, this is just so the picker filters up front.
const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,application/pdf,image/jpeg,image/png,image/heic,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Plain client-facing state. Staff statuses are projected down to these four:
// accepted -> done, uploaded/under_review -> received, rejected -> replace,
// nothing on file -> empty.
export type ClientFileState = "done" | "received" | "replace";

export type ClientFile = {
  id: string;
  state: ClientFileState;
  fileName: string | null;
  reason: string | null;
  fileGroupKey: string;
  addedByFirm: boolean;
};

export type ClientRequirement = {
  code: string;
  label: string;
  acceptsMultiple: boolean;
  required: boolean;
  instructions: string | null;
  files: ClientFile[];
};

// ---------------------------------------------------------------------------
// Status pill: conveys state in words (never colour alone), with a leading
// icon for extra clarity.
// ---------------------------------------------------------------------------

const PILL: Record<
  ClientFileState | "empty",
  { label: string; cls: string; Icon: typeof Check }
> = {
  done: {
    label: "Done",
    cls: "bg-[var(--success-subtle)] text-[var(--success-text)]",
    Icon: Check,
  },
  received: {
    label: "Received",
    cls: "bg-[var(--warning-subtle)] text-[var(--warning-text)]",
    Icon: Clock,
  },
  replace: {
    label: "Needs a new file",
    cls: "bg-[var(--maple-50)] text-[var(--destructive-text)]",
    Icon: CircleAlert,
  },
  empty: {
    label: "Not uploaded",
    cls: "bg-muted text-[var(--subtle-foreground)]",
    Icon: CircleDashed,
  },
};

function StatusPill({ state }: { state: ClientFileState | "empty" }) {
  const { label, cls, Icon } = PILL[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        cls,
      )}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function FirmLabel() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-[var(--navy-700)]">
      <Building2 aria-hidden className="h-3.5 w-3.5" />
      Added by the firm
    </span>
  );
}

function ViewLink({ fileId, label }: { fileId: string; label: string }) {
  return (
    <a
      href={`/api/files/${fileId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-9 items-center rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
    >
      {label}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Hidden file input + click-to-pick button. One uploader per action so the
// pending state is local to the button the client pressed.
// ---------------------------------------------------------------------------

function Uploader({
  onPick,
  pending,
  children,
  variant,
  ariaLabel,
}: {
  onPick: (file: File) => void;
  pending: boolean;
  children: React.ReactNode;
  variant: "primary" | "dashed";
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => ref.current?.click()}
        disabled={pending}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-60",
          variant === "primary"
            ? "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]"
            : "border border-dashed border-[var(--input)] text-[var(--subtle-foreground)] hover:bg-muted",
        )}
      >
        {pending ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Upload aria-hidden className="h-4 w-4" />
        )}
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          if (ref.current) ref.current.value = "";
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

export function ClientDocRow({
  token,
  requirement,
}: {
  token: string;
  requirement: ClientRequirement;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const { files, acceptsMultiple, label } = requirement;
  const isMulti = acceptsMultiple || files.length > 1;

  function run(key: string, fn: () => Promise<{ ok: true } | { error: string }>) {
    setError(null);
    setPending(key);
    startTransition(async () => {
      const r = await fn();
      setPending(null);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  function uploadNew(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    run("new", () => uploadFileAsClient(token, requirement.code, fd));
  }

  function replace(fileGroupKey: string, file: File) {
    const fd = new FormData();
    fd.set("file", file);
    run(fileGroupKey, () => reuploadFileAsClient(token, fileGroupKey, fd));
  }

  return (
    <li className="px-4 py-4">
      <div className="text-sm font-medium text-foreground">{label}</div>
      {requirement.instructions && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {requirement.instructions}
        </p>
      )}

      <div className="mt-3">
        {files.length === 0 ? (
          // Empty requirement: a single Upload.
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill state="empty" />
            <Uploader
              onPick={uploadNew}
              pending={pendingKey === "new"}
              variant="primary"
              ariaLabel={`Upload ${label}`}
            >
              Upload
            </Uploader>
          </div>
        ) : isMulti ? (
          // Multi-file requirement: each file is its own line in a bordered
          // list, with Add another worded as a question below.
          <div className="space-y-3">
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-muted">
              {files.map((f, i) => (
                <FileLine
                  key={f.id}
                  lineLabel={`${label} ${i + 1}`}
                  file={f}
                  pendingKey={pendingKey}
                  onReplace={replace}
                />
              ))}
            </ul>
            {acceptsMultiple && (
              <Uploader
                onPick={uploadNew}
                pending={pendingKey === "new"}
                variant="dashed"
                ariaLabel={`Add another ${label}`}
              >
                Add another {label.toLowerCase()}
              </Uploader>
            )}
          </div>
        ) : (
          // Single requirement with one file.
          <SingleFileBody
            file={files[0]}
            label={label}
            pendingKey={pendingKey}
            onReplace={replace}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-[var(--destructive-text)]">
          {error}
        </p>
      )}
    </li>
  );
}

// One file inside a multi-file requirement's bordered list.
function FileLine({
  lineLabel,
  file,
  pendingKey,
  onReplace,
}: {
  lineLabel: string;
  file: ClientFile;
  pendingKey: string | null;
  onReplace: (fileGroupKey: string, file: File) => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-card px-3 py-3">
      <span className="min-w-0 flex-1 text-sm text-foreground">{lineLabel}</span>
      {file.addedByFirm && file.state !== "replace" ? (
        <FirmLabel />
      ) : (
        <StatusPill state={file.state} />
      )}
      <ViewLink fileId={file.id} label="View" />
      {file.state === "replace" && (
        <Uploader
          onPick={(f) => onReplace(file.fileGroupKey, f)}
          pending={pendingKey === file.fileGroupKey}
          variant="primary"
          ariaLabel={`Replace ${lineLabel}`}
        >
          Replace file
        </Uploader>
      )}
    </li>
  );
}

// The body of a single-file requirement: a received/done file is read-only,
// a rejected file gets the gentle replace treatment.
function SingleFileBody({
  file,
  label,
  pendingKey,
  onReplace,
}: {
  file: ClientFile;
  label: string;
  pendingKey: string | null;
  onReplace: (fileGroupKey: string, file: File) => void;
}) {
  if (file.state === "replace") {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill state="replace" />
          <ViewLink fileId={file.id} label="View what you sent" />
        </div>
        {file.reason && (
          <p className="text-sm text-[var(--destructive-text)]">{file.reason}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Uploading here replaces the file you sent before. The earlier file is
          kept but not used, and you can still view it above.
        </p>
        <Uploader
          onPick={(f) => onReplace(file.fileGroupKey, f)}
          pending={pendingKey === file.fileGroupKey}
          variant="primary"
          ariaLabel={`Replace ${label}`}
        >
          Replace file
        </Uploader>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {file.addedByFirm ? <FirmLabel /> : <StatusPill state={file.state} />}
      <ViewLink fileId={file.id} label="View" />
      {file.addedByFirm && (
        <span className="text-xs text-muted-foreground">
          Nothing needed from you on this one.
        </span>
      )}
    </div>
  );
}

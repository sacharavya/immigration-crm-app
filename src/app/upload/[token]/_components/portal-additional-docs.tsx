"use client";

import { format } from "date-fns";
import { Check, CircleAlert, CircleDashed, Clock, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { cn } from "@/lib/utils/index";

import { uploadAsClientAdditional } from "../actions";

export type PortalAdditionalDocLatest = {
  id: string;
  status: string;
  file_name: string | null;
  sharepoint_web_url: string | null;
  version_number: number;
  rejection_reason: string | null;
};

export type PortalAdditionalDocRow = {
  id: string;
  customLabel: string;
  dueDate: string | null;
  latest: PortalAdditionalDocLatest | null;
};

export type PortalAdditionalDocsGroup = {
  eventId: string;
  requestedAt: string;
  overallDueDate: string | null;
  notes: string | null;
  rows: PortalAdditionalDocRow[];
};

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,application/pdf,image/jpeg,image/png,image/heic,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function PortalAdditionalDocs({
  token,
  groups,
}: {
  token: string;
  groups: PortalAdditionalDocsGroup[];
}) {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-l-4 border-[var(--warning-subtle)] border-l-[var(--warning)] bg-[var(--warning-subtle)] p-4 text-sm text-[var(--warning-text)]">
        <p className="font-semibold">We need a few more documents</p>
        <p className="mt-1">
          Please add the documents below. We will review each one and let you
          know if anything needs a new file.
        </p>
      </div>
      {groups.map((g) => (
        <section
          key={g.eventId}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <header className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Requested {format(new Date(g.requestedAt), "MMM d, yyyy")}
            </h3>
            {g.overallDueDate && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Please send by {format(new Date(g.overallDueDate), "MMM d, yyyy")}
              </p>
            )}
          </header>
          <ul className="divide-y divide-border">
            {g.rows.map((r) => (
              <PortalRow key={r.id} token={token} row={r} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PortalRow({
  token,
  row,
}: {
  token: string;
  row: PortalAdditionalDocRow;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const status = row.latest?.status ?? null;
  const isRejected = status === "rejected";
  const isAccepted = status === "accepted";
  const canView = row.latest && status !== null;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    setError(null);
    startTransition(async () => {
      const r = await uploadAsClientAdditional(token, row.id, fd);
      if (inputRef.current) inputRef.current.value = "";
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="px-4 py-4">
      <div className="text-sm font-medium text-foreground">
        {row.customLabel}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <StatusPill status={status} />
        {row.dueDate && (
          <span className="text-xs text-muted-foreground">
            Please send by {format(new Date(row.dueDate), "MMM d, yyyy")}
          </span>
        )}
        {canView && row.latest && (
          <a
            href={`/api/files/${row.latest.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            {isRejected ? "View what you sent" : "View"}
          </a>
        )}
      </div>

      {isRejected && row.latest?.rejection_reason && (
        <p className="mt-2 text-sm text-[var(--destructive-text)]">
          {row.latest.rejection_reason}
        </p>
      )}

      {!isAccepted && (
        <div className="mt-3">
          <button
            type="button"
            aria-label={`${isRejected ? "Replace" : "Upload"} ${row.customLabel}`}
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60",
            )}
          >
            {pending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Upload aria-hidden className="h-4 w-4" />
            )}
            {isRejected ? "Replace file" : "Upload"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={onPick}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-[var(--destructive-text)]">
          {error}
        </p>
      )}
    </li>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<
    string,
    { label: string; cls: string; Icon: typeof Check }
  > = {
    empty: {
      label: "Not uploaded",
      cls: "bg-muted text-[var(--subtle-foreground)]",
      Icon: CircleDashed,
    },
    received: {
      label: "Received",
      cls: "bg-[var(--warning-subtle)] text-[var(--warning-text)]",
      Icon: Clock,
    },
    done: {
      label: "Done",
      cls: "bg-[var(--success-subtle)] text-[var(--success-text)]",
      Icon: Check,
    },
    replace: {
      label: "Needs a new file",
      cls: "bg-[var(--maple-50)] text-[var(--destructive-text)]",
      Icon: CircleAlert,
    },
  };
  const key =
    status === null
      ? "empty"
      : status === "accepted"
        ? "done"
        : status === "rejected"
          ? "replace"
          : "received";
  const { label, cls, Icon } = map[key];
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

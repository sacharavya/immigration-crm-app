"use client";

import { format } from "date-fns";
import { ExternalLink, Loader2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";

import { reviewDocument, uploadAdditionalDocument } from "../actions";

export type AdditionalDocLatest = {
  id: string;
  status: string;
  file_name: string | null;
  sharepoint_web_url: string | null;
  version_number: number;
  rejection_reason: string | null;
};

export type AdditionalDocRow = {
  id: string; // case_required_documents.id
  customLabel: string;
  dueDate: string | null;
  latest: AdditionalDocLatest | null;
};

export type AdditionalDocsGroup = {
  eventId: string;
  requestedAt: string;
  overallDueDate: string | null;
  notes: string | null;
  rows: AdditionalDocRow[];
};

type Props = {
  caseId: string;
  groups: AdditionalDocsGroup[];
  canUpload: boolean;
  canReview: boolean;
};

export function AdditionalDocumentsSection({
  caseId,
  groups,
  canUpload,
  canReview,
}: Props) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <GroupCard
          key={g.eventId}
          caseId={caseId}
          group={g}
          canUpload={canUpload}
          canReview={canReview}
        />
      ))}
    </div>
  );
}

function GroupCard({
  caseId,
  group,
  canUpload,
  canReview,
}: {
  caseId: string;
  group: AdditionalDocsGroup;
  canUpload: boolean;
  canReview: boolean;
}) {
  const allAccepted = group.rows.every(
    (r) => r.latest?.status === "accepted",
  );
  // Default expanded if any row still needs work; collapsed once all accepted.
  const [open, setOpen] = useState(!allAccepted);

  return (
    <section className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40">
      <header
        className="flex cursor-pointer items-center justify-between border-b border-amber-200/60 bg-amber-50/80 px-4 py-3"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h3 className="text-sm font-semibold text-amber-900">
            Additional documents requested by IRCC ·{" "}
            {format(new Date(group.requestedAt), "MMM d, yyyy")}
          </h3>
          <p className="mt-0.5 text-xs text-amber-800">
            {group.rows.filter((r) => r.latest?.status === "accepted").length}
            {" "}of {group.rows.length} accepted
            {group.overallDueDate ? (
              <>
                {" · "}due {format(new Date(group.overallDueDate), "MMM d, yyyy")}
              </>
            ) : null}
          </p>
        </div>
        <Badge
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
            allAccepted
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-900",
          )}
        >
          {allAccepted ? "Complete" : "Open"}
        </Badge>
      </header>
      {open && (
        <div className="divide-y divide-amber-100 bg-white">
          {group.rows.map((r) => (
            <Row
              key={r.id}
              caseId={caseId}
              row={r}
              canUpload={canUpload}
              canReview={canReview}
            />
          ))}
          {group.notes && (
            <div className="bg-amber-50/40 px-4 py-2 text-xs text-amber-900">
              <span className="font-medium">Note:</span> {group.notes}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Row({
  caseId,
  row,
  canUpload,
  canReview,
}: {
  caseId: string;
  row: AdditionalDocRow;
  canUpload: boolean;
  canReview: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-900">
          {row.customLabel}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <StatusPill status={row.latest?.status ?? null} />
          {row.dueDate && (
            <span>
              Due {format(new Date(row.dueDate), "MMM d, yyyy")}
            </span>
          )}
          {row.latest?.sharepoint_web_url && (
            <a
              href={row.latest.sharepoint_web_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900"
            >
              <ExternalLink className="h-3 w-3" />
              {row.latest.file_name ?? "file"} · v{row.latest.version_number}
            </a>
          )}
        </div>
        {row.latest?.status === "rejected" && row.latest.rejection_reason && (
          <p className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-900">
            <strong>Reviewer note:</strong> {row.latest.rejection_reason}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canUpload && row.latest?.status !== "accepted" && (
          <UploadButton caseId={caseId} requiredDocumentId={row.id} />
        )}
        {canReview && row.latest && row.latest.status === "uploaded" && (
          <ReviewButtons documentId={row.latest.id} />
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) {
    return (
      <Badge className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
        Awaiting upload
      </Badge>
    );
  }
  if (status === "uploaded" || status === "under_review") {
    return (
      <Badge className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
        Awaiting review
      </Badge>
    );
  }
  if (status === "accepted") {
    return (
      <Badge className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
        Accepted
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">
        Rejected
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
      {status}
    </Badge>
  );
}

function UploadButton({
  caseId,
  requiredDocumentId,
}: {
  caseId: string;
  requiredDocumentId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    setError(null);
    startTransition(async () => {
      const r = await uploadAdditionalDocument(caseId, requiredDocumentId, fd);
      if ("error" in r) setError(r.error);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-1 h-3.5 w-3.5" />
        )}
        Upload
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onPick}
      />
      {error && (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ReviewButtons({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "accept" | "reject") {
    setError(null);
    if (decision === "reject") {
      const reason = window.prompt("Reason for rejection?");
      if (!reason) return;
      startTransition(async () => {
        const r = await reviewDocument({
          documentId,
          decision: "reject",
          reason,
        });
        if ("error" in r) setError(r.error);
      });
      return;
    }
    startTransition(async () => {
      const r = await reviewDocument({ documentId, decision: "accept" });
      if ("error" in r) setError(r.error);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => decide("accept")}
        disabled={pending}
      >
        Accept
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => decide("reject")}
        disabled={pending}
        className="text-destructive hover:bg-red-50 hover:text-destructive"
      >
        Reject
      </Button>
      {error && (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

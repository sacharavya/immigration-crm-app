"use client";

import { format } from "date-fns";
import { ExternalLink, Loader2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { uploadAsClientAdditional } from "../actions";

export type PortalAdditionalDocLatest = {
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
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">IRCC has requested additional documents</p>
        <p className="mt-1 text-amber-800">
          Please upload the documents below as soon as possible. Once you
          upload, our team reviews each one and lets you know if anything
          needs adjusting.
        </p>
      </div>
      {groups.map((g) => (
        <section
          key={g.eventId}
          className="overflow-hidden rounded-xl border border-amber-200 bg-white"
        >
          <header className="border-b border-amber-100 bg-amber-50/40 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-900">
              Requested {format(new Date(g.requestedAt), "MMM d, yyyy")}
            </h3>
            {g.overallDueDate && (
              <p className="mt-0.5 text-xs text-amber-800">
                Due {format(new Date(g.overallDueDate), "MMM d, yyyy")}
              </p>
            )}
          </header>
          <ul className="divide-y divide-stone-100">
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
      const r = await uploadAsClientAdditional(token, row.id, fd);
      if ("error" in r) setError(r.error);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-stone-900">
          {row.customLabel}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <StatusPill status={row.latest?.status ?? null} />
          {row.dueDate && (
            <span>Due {format(new Date(row.dueDate), "MMM d, yyyy")}</span>
          )}
          {row.latest?.sharepoint_web_url && row.latest.status !== "rejected" && (
            <a
              href={row.latest.sharepoint_web_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900"
            >
              <ExternalLink className="h-3 w-3" />
              v{row.latest.version_number}
            </a>
          )}
        </div>
        {row.latest?.status === "rejected" && row.latest.rejection_reason && (
          <p className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-900">
            <strong>Reviewer note:</strong> {row.latest.rejection_reason}.
            Please upload a corrected version below.
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {row.latest?.status !== "accepted" && (
          <>
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
          </>
        )}
        {error && (
          <p className="text-[11px] text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </li>
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
        Received · awaiting review
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
        Needs another upload
      </Badge>
    );
  }
  return null;
}

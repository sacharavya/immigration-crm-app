"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { respondToFeedback } from "../actions";

type Status = "open" | "in_progress" | "resolved" | "declined";

export type FeedbackItem = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  kind: string;
  subject: string;
  body: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-50 text-amber-900",
  in_progress: "bg-sky-50 text-sky-900",
  resolved: "bg-emerald-50 text-emerald-800",
  declined: "bg-stone-100 text-stone-600",
};

const KIND_LABEL: Record<string, string> = {
  complaint: "Complaint",
  bug: "Bug",
  feature_request: "Feature request",
  question: "Question",
};

export function FeedbackInbox({ items }: { items: FeedbackItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-stone-500">
          Nothing raised yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Ticket key={item.id} item={item} />
      ))}
    </div>
  );
}

function Ticket({ item }: { item: FeedbackItem }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(item.status as Status);
  const [response, setResponse] = useState(item.admin_response ?? "");
  const [open, setOpen] = useState(false);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await respondToFeedback({
        id: item.id,
        status,
        admin_response: response.trim() || null,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-stone-900">
                {item.subject}
              </span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                {KIND_LABEL[item.kind] ?? item.kind}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  STATUS_STYLE[item.status] ?? "bg-stone-100 text-stone-600"
                }`}
              >
                {item.status.replace("_", " ")}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-stone-500">
              {item.tenant_name} ·{" "}
              {new Date(item.created_at).toLocaleDateString("en-CA")}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Respond"}
          </Button>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
          {item.body}
        </p>

        {item.admin_response && !open && (
          <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
            <div className="text-xs font-medium text-stone-500">
              Your response
            </div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-stone-700">
              {item.admin_response}
            </p>
          </div>
        )}

        {open && (
          <div className="space-y-2 border-t border-stone-200 pt-3">
            <div className="space-y-1.5">
              <label
                htmlFor={`status-${item.id}`}
                className="text-xs font-medium text-stone-600"
              >
                Status
              </label>
              <select
                id={`status-${item.id}`}
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`resp-${item.id}`}
                className="text-xs font-medium text-stone-600"
              >
                Response to the firm
              </label>
              <textarea
                id={`resp-${item.id}`}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                placeholder="What you are doing about it."
              />
            </div>

            {error && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button onClick={save} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

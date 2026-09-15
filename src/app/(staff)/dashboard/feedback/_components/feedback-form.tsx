"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { submitFeedback, type FeedbackInput } from "../actions";

type Existing = {
  id: string;
  kind: string;
  subject: string;
  body: string;
  status: string;
  admin_response: string | null;
  created_at: string;
};

const KINDS: { value: FeedbackInput["kind"]; label: string }[] = [
  { value: "complaint", label: "Complaint" },
  { value: "bug", label: "Something is broken" },
  { value: "feature_request", label: "Feature request" },
  { value: "question", label: "Question" },
];

export function FeedbackForm({ existing }: { existing: Existing[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<FeedbackInput["kind"]>("question");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function submit() {
    setError(null);
    setSent(false);
    startTransition(async () => {
      const result = await submitFeedback({ kind, subject, body });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSubject("");
      setBody("");
      setSent(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="f-kind">Type</Label>
            <select
              id="f-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as FeedbackInput["kind"])}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-subject">Subject</Label>
            <Input
              id="f-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Document uploads are slow"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-body">Details</Label>
            <textarea
              id="f-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
              placeholder="What happened, what you expected, and how often it occurs."
            />
          </div>

          {error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          {sent && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Sent. You will see a reply here.
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={submit} disabled={pending || !subject || !body}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {existing.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-900">
            Previously raised
          </h2>
          {existing.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-1.5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-stone-900">
                    {e.subject}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                    {e.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-stone-500">
                    {new Date(e.created_at).toLocaleDateString("en-CA")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-stone-700">
                  {e.body}
                </p>
                {e.admin_response && (
                  <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
                    <div className="text-xs font-medium text-stone-500">
                      Reply
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-stone-700">
                      {e.admin_response}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

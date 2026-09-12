"use client";

import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UnmappedField } from "@/lib/forms/fill";

import {
  getFormFillOptions,
  getFormFillPayload,
  saveFormFill,
} from "../form-fill-actions";

// FORMS-4: Generate an IRCC/provincial form for a case participant. The
// blank PDF is fetched through the authenticated proxy and filled entirely
// in the browser; only the finished output goes back to the server.

type Options = Extract<
  Awaited<ReturnType<typeof getFormFillOptions>>,
  { ok: true }
>;

const REASON_LABELS: Record<UnmappedField["reason"], string> = {
  unmapped: "no mapping",
  manual: "marked manual",
  skip: "skipped",
  broken: "broken mapping",
  no_data: "no data on file",
  field_missing: "field not in form",
  option_mismatch: "value not a valid option",
  write_failed: "could not write",
};

export function GenerateFormDialog({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const [participantId, setParticipantId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [phase, setPhase] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    webUrl: string | null;
    fileName: string;
    unmapped: UnmappedField[];
  } | null>(null);

  useEffect(() => {
    if (!open || options) return;
    getFormFillOptions(caseId).then((r) => {
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setOptions(r);
      if (r.participants.length === 1) setParticipantId(r.participants[0].id);
      if (r.forms.length > 0) setVersionId(r.forms[0].versionId);
    });
  }, [open, options, caseId]);

  async function generate() {
    if (!participantId || !versionId) {
      setError("Pick a participant and a form.");
      return;
    }
    setError(null);
    setPhase("working");
    try {
      const payload = await getFormFillPayload(versionId, participantId);
      if ("error" in payload) throw new Error(payload.error);
      if (payload.formType === "portal_reference") {
        throw new Error("This entry is a portal reference, not a fillable PDF.");
      }

      const blankRes = await fetch(`/api/forms/blank/${versionId}`);
      if (!blankRes.ok) throw new Error("Could not load the blank form.");
      const blank = new Uint8Array(await blankRes.arrayBuffer());

      const ctx = { countryNames: payload.countryNames };
      const fill = await import("@/lib/forms/fill");
      const filled =
        payload.formType === "xfa"
          ? await fill.fillXfa(blank, payload.mapping, payload.profile, ctx)
          : await fill.fillAcroForm(blank, payload.mapping, payload.profile, ctx, {
              // Never flatten official forms; firm templates flatten.
              flatten: payload.scope === "firm",
            });

      const fileName = `${payload.formNumber} ${payload.participantName} ${payload.versionLabel}.pdf`;
      const fd = new FormData();
      fd.set("form_version_id", versionId);
      fd.set("case_id", caseId);
      fd.set("participant_id", participantId);
      fd.set("file_name", fileName);
      fd.set("profile_snapshot", JSON.stringify(payload.profile));
      fd.set("unmapped", JSON.stringify(filled.unmapped));
      fd.set(
        "file",
        new File([filled.bytes as BlobPart], fileName, {
          type: "application/pdf",
        }),
      );
      const saved = await saveFormFill(fd);
      if ("error" in saved) throw new Error(saved.error);

      setResult({
        webUrl: saved.webUrl,
        fileName,
        unmapped: filled.unmapped,
      });
      setPhase("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setPhase("idle");
    }
  }

  function reset() {
    setOpen(false);
    setPhase("idle");
    setResult(null);
    setError(null);
  }

  const blanks = result?.unmapped.filter(
    (u) => u.reason !== "skip" && u.reason !== "manual",
  );

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileText className="mr-1.5 h-4 w-4" /> Generate form
      </Button>
      <Dialog open={open} onOpenChange={(o) => (phase === "working" ? null : o ? setOpen(true) : reset())}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate a form</DialogTitle>
            <DialogDescription>
              The blank is filled in your browser from the participant&apos;s
              intake profile and saved to the case&apos;s Final folder.
            </DialogDescription>
          </DialogHeader>

          {phase === "done" && result ? (
            <div className="space-y-4">
              <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm">
                <div className="font-medium text-stone-900">
                  {result.fileName}
                </div>
                {result.webUrl && (
                  <a
                    href={result.webUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-[var(--navy)] underline underline-offset-2"
                  >
                    Open in OneDrive <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              {blanks && blanks.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Left blank ({blanks.length})
                  </div>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-stone-600">
                    {blanks.map((u) => (
                      <li key={u.path} className="flex justify-between gap-3">
                        <span className="truncate font-mono">{u.path}</span>
                        <span className="shrink-0 text-stone-400">
                          {REASON_LABELS[u.reason]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-stone-500">
                Official forms stay editable: open the PDF and complete any
                blanks before submission. XFA forms should be validated in
                Adobe Reader.
              </p>
              <div className="flex justify-end">
                <Button onClick={reset}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Participant
                </span>
                <select
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  disabled={phase === "working" || !options}
                  className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
                >
                  <option value="">Select...</option>
                  {options?.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role.replace(/_/g, " ")})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Form (active versions)
                </span>
                <select
                  value={versionId}
                  onChange={(e) => setVersionId(e.target.value)}
                  disabled={phase === "working" || !options}
                  className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
                >
                  {options?.forms.length === 0 && (
                    <option value="">No active forms in the registry</option>
                  )}
                  {options?.forms.map((f) => (
                    <option key={f.versionId} value={f.versionId}>
                      {f.matched ? "★ " : ""}
                      {f.formNumber} · {f.title} ({f.versionLabel})
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-stone-400">
                  ★ = matches this case&apos;s program
                </span>
              </label>
              {error && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={generate}
                  disabled={phase === "working" || !participantId || !versionId}
                >
                  {phase === "working" ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { FileUp, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { extractFormSchema } from "@/lib/forms/extract";
import type { ExtractionResult } from "@/lib/forms/types";

import { uploadFormVersion } from "../actions";

// Extraction (FORMS-2) runs in the browser the moment a file is picked:
// detects AcroForm vs XFA, lists the fields, and scrapes the printed
// revision label to prefill the version label (still editable).
export function UploadVersionDialog({ formId }: { formId: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    setFile(f);
    setError(null);
    setExtraction(null);
    if (!f) return;
    setExtracting(true);
    f.arrayBuffer()
      .then((buf) => extractFormSchema(new Uint8Array(buf)))
      .then((result) => {
        setExtraction(result);
        if (result.versionLabel) {
          setVersionLabel((v) => v.trim() || result.versionLabel!);
        }
      })
      .catch(() => {
        // Not a readable PDF form; upload can still proceed with no schema.
        setExtraction(null);
      })
      .finally(() => setExtracting(false));
  }

  function submit() {
    if (!file) {
      setError("Choose a PDF file.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("form_id", formId);
      fd.set("version_label", versionLabel);
      fd.set("published_at", publishedAt);
      fd.set("notes", notes);
      fd.set("file", file);
      if (extraction) {
        fd.set("detected_form_type", extraction.formType);
        fd.set("field_schema", JSON.stringify(extraction.fields));
      }
      const result = await uploadFormVersion(fd);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setFile(null);
      setVersionLabel("");
      setPublishedAt("");
      setNotes("");
      setExtraction(null);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload className="mr-1 h-4 w-4" /> Upload new version
      </Button>
      <Dialog open={open} onOpenChange={(o) => (pending ? null : setOpen(o))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload a version</DialogTitle>
            <DialogDescription>
              The blank PDF as published. It uploads as a draft; activate it
              once reviewed.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files?.[0] ?? null);
              }}
              disabled={pending}
              className={`flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-sm transition-colors ${
                dragging
                  ? "border-[var(--navy)] bg-[var(--navy)]/5"
                  : "border-stone-300 bg-stone-50 hover:border-stone-400"
              }`}
            >
              <FileUp className="h-6 w-6 text-stone-400" />
              {file ? (
                <span className="font-medium text-stone-800">{file.name}</span>
              ) : (
                <span className="text-stone-500">
                  Drop the PDF here or click to browse
                </span>
              )}
              {extracting && (
                <span className="text-xs text-stone-400">Reading fields...</span>
              )}
              {extraction && (
                <span className="text-xs text-stone-500">
                  Detected {extraction.formType === "xfa" ? "XFA" : "AcroForm"}
                  {" · "}
                  {extraction.fields.length} field
                  {extraction.fields.length === 1 ? "" : "s"}
                  {extraction.versionLabel
                    ? ` · label ${extraction.versionLabel}`
                    : ""}
                </span>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="uv-label">Version label</FieldLabel>
                <Input
                  id="uv-label"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder="08-2023"
                  maxLength={60}
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="uv-published">
                  Published (optional)
                </FieldLabel>
                <Input
                  id="uv-published"
                  type="date"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="uv-notes">Notes (optional)</FieldLabel>
              <textarea
                id="uv-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                disabled={pending}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
              />
            </Field>
            {error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={pending || !file || !versionLabel.trim()}
            >
              {pending ? "Uploading..." : "Upload version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

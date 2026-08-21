"use client";

// Merge tool: add files to the session from the device (UploadZone) or from
// the case's OneDrive documents (CaseDocumentsPanel). Case bytes flow
// browser-to-Microsoft via short-lived download URLs minted per file.

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LoadedDocument } from "@/lib/pdf-engine/types";

import {
  CaseDocumentsPanel,
  type CaseDocumentItem,
} from "../../case-documents-panel";
import { UploadZone } from "../../upload-zone";

export function MergeDialog({
  open,
  onOpenChange,
  documents,
  inputWarning,
  disabled,
  onFiles,
  caseDocuments,
  getDownloadUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: LoadedDocument[];
  inputWarning: string | null;
  disabled: boolean;
  onFiles: (files: File[]) => Promise<void>;
  caseDocuments?: CaseDocumentItem[];
  getDownloadUrl?: (
    documentId: string,
  ) => Promise<{ url: string } | { error: string }>;
}) {
  const [caseError, setCaseError] = useState<string | null>(null);

  // Pull case documents into the session: mint a fresh download URL per file,
  // fetch bytes directly from Microsoft, and feed them through loadFiles.
  async function addCaseDocuments(items: CaseDocumentItem[]) {
    if (!getDownloadUrl) return;
    setCaseError(null);
    const files: File[] = [];
    const failed: string[] = [];
    for (const item of items) {
      try {
        const res = await getDownloadUrl(item.id);
        if ("error" in res) {
          failed.push(item.name);
          continue;
        }
        const resp = await fetch(res.url);
        if (!resp.ok) {
          failed.push(item.name);
          continue;
        }
        const buf = await resp.arrayBuffer();
        const mime = item.mime === "image/jpg" ? "image/jpeg" : item.mime;
        files.push(new File([buf], item.name, { type: mime }));
      } catch {
        failed.push(item.name);
      }
    }
    if (files.length > 0) await onFiles(files);
    if (failed.length > 0) {
      setCaseError(
        `Could not fetch ${failed.length} document${failed.length === 1 ? "" : "s"} from OneDrive: ${failed.join(", ")}`,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add files</DialogTitle>
          <DialogDescription>
            PDFs and images are appended as pages to the current package.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          {caseError && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {caseError}
            </p>
          )}

          {caseDocuments && caseDocuments.length > 0 && getDownloadUrl && (
            <CaseDocumentsPanel
              items={caseDocuments}
              disabled={disabled}
              onAdd={(items) => addCaseDocuments(items)}
            />
          )}

          <UploadZone
            documents={documents}
            inputWarning={inputWarning}
            disabled={disabled}
            onFiles={(files) => void onFiles(files)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

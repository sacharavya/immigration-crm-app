"use client";

import { useEffect, useState } from "react";

import { LocalDownloadSink } from "@/lib/pdf-engine/sources/local";
import type {
  BuildOptions,
  CompressionPreflight,
  PageNumberOptions,
} from "@/lib/pdf-engine/types";

import {
  CaseDocumentsPanel,
  type CaseDocumentItem,
} from "./case-documents-panel";
import { CompressPanel } from "./compress-panel";
import { ExportBar } from "./export-bar";
import { defaultFileName, SIZE_PRESETS } from "./presets";
import { ProgressOverlay } from "./progress-overlay";
import { ThumbnailGrid } from "./thumbnail-grid";
import { Toolbar } from "./toolbar";
import { UploadZone } from "./upload-zone";
import { usePdfEngine } from "./use-pdf-engine";
import { VerificationDialog } from "./verification-dialog";

const DEFAULT_PAGE_NUMBERS: PageNumberOptions = {
  format: "n-of-total",
  position: "bottom-center",
  startAt: 1,
  fontSize: 9,
  marginPt: 24,
};

/** How long model/preset changes settle before re-running preflight. */
const PREFLIGHT_DEBOUNCE_MS = 500;

export function PdfTool({
  caseDocuments,
  getDownloadUrl,
}: {
  // When opened from a case: its uploaded documents + a staff-gated server
  // action minting short-lived OneDrive download URLs. Bytes flow
  // browser-to-Microsoft directly; our server only hands out URLs.
  caseDocuments?: CaseDocumentItem[];
  getDownloadUrl?: (
    documentId: string,
  ) => Promise<{ url: string } | { error: string }>;
}) {
  const {
    documents,
    model,
    thumbnails,
    busy,
    error,
    inputWarning,
    lastBuild,
    loadFiles,
    reorder,
    rotateBy90,
    deletePages,
    preflight,
    build,
    renderComparison,
    takeOutput,
    discardOutput,
    resetAll,
  } = usePdfEngine();

  const [presetKey, setPresetKey] = useState(SIZE_PRESETS[0].key);
  const [customMb, setCustomMb] = useState(4);
  const [pageNumbersEnabled, setPageNumbersEnabled] = useState(false);
  const [pageNumberOptions, setPageNumberOptions] =
    useState<PageNumberOptions>(DEFAULT_PAGE_NUMBERS);
  const [fileName, setFileName] = useState(() => defaultFileName(new Date()));
  const [preflightResult, setPreflightResult] =
    useState<CompressionPreflight | null>(null);
  /** none = no build; pending = verification dialog open; passed = can download. */
  const [gate, setGate] = useState<"none" | "pending" | "passed">("none");
  const [downloadedSize, setDownloadedSize] = useState<number | null>(null);

  const preset =
    SIZE_PRESETS.find((p) => p.key === presetKey) ?? SIZE_PRESETS[0];
  const targetBytes =
    preset.key === "custom"
      ? customMb > 0
        ? Math.round(customMb * 1_000_000)
        : null
      : preset.targetBytes;

  // Pre-build classification whenever a size preset is active and the model
  // settles, so staff see what would be flattened BEFORE building.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!model || model.pages.length === 0 || targetBytes === null) {
        setPreflightResult(null);
        return;
      }
      void preflight({ compression: { targetBytes } }).then((result) => {
        if (result) setPreflightResult(result);
      });
    }, PREFLIGHT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [model, targetBytes, preflight]);

  // Editing after a build drops the held output; the gate follows it.
  const effectiveGate = lastBuild ? gate : "none";

  const handleBuild = async () => {
    setDownloadedSize(null);
    const options: BuildOptions = { compression: { targetBytes } };
    if (pageNumbersEnabled) options.pageNumbers = pageNumberOptions;
    const report = await build(options);
    if (!report) return;
    const needsGate =
      (report.compression?.pagesRecompressed ?? 0) > 0 &&
      report.worstPages.length > 0;
    setGate(needsGate ? "pending" : "passed");
  };

  const handleDownload = async () => {
    const output = await takeOutput();
    if (!output) return;
    const name = fileName.toLowerCase().endsWith(".pdf")
      ? fileName
      : `${fileName}.pdf`;
    await new LocalDownloadSink().save({ name, bytes: output.bytes });
    setDownloadedSize(output.sizeBytes);
    setGate("passed");
  };

  const handleCancelVerification = async () => {
    setGate("none");
    await discardOutput();
  };

  const handleReset = async () => {
    await resetAll();
    setPreflightResult(null);
    setGate("none");
    setDownloadedSize(null);
    setFileName(defaultFileName(new Date()));
  };

  const editing = busy.active;
  // Pull case documents into the session: mint a fresh download URL per file,
  // fetch bytes directly from Microsoft, and feed them through loadFiles.
  const [caseError, setCaseError] = useState<string | null>(null);
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
    if (files.length > 0) await loadFiles(files);
    if (failed.length > 0) {
      setCaseError(
        `Could not fetch ${failed.length} document${failed.length === 1 ? "" : "s"} from OneDrive: ${failed.join(", ")}`,
      );
    }
  }

  const canBuild = !!model && model.pages.length > 0;
  const canDownload =
    !!lastBuild && effectiveGate === "passed" && downloadedSize === null;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {caseError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {caseError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-4">
          {caseDocuments && caseDocuments.length > 0 && getDownloadUrl && (
            <CaseDocumentsPanel
              items={caseDocuments}
              disabled={editing}
              onAdd={(items) => addCaseDocuments(items)}
            />
          )}
          <UploadZone
            documents={documents}
            inputWarning={inputWarning}
            disabled={editing}
            onFiles={(files) => void loadFiles(files)}
          />
        </div>
        <ThumbnailGrid
          model={model}
          documents={documents}
          thumbnails={thumbnails}
          disabled={editing}
          onReorder={(order) => void reorder(order)}
          onRotate={(pageId) => void rotateBy90(pageId)}
          onDelete={(pageId) => void deletePages([pageId])}
        />
      </div>

      <Toolbar
        presetKey={presetKey}
        onPresetChange={setPresetKey}
        customMb={customMb}
        onCustomMbChange={setCustomMb}
        pageNumbersEnabled={pageNumbersEnabled}
        onPageNumbersEnabledChange={setPageNumbersEnabled}
        pageNumberOptions={pageNumberOptions}
        onPageNumberOptionsChange={setPageNumberOptions}
        fileName={fileName}
        onFileNameChange={setFileName}
        canBuild={canBuild}
        disabled={editing}
        onBuild={() => void handleBuild()}
      />

      <CompressPanel
        preflight={preflightResult}
        report={lastBuild}
        model={model}
        targetBytes={targetBytes}
      />

      <ExportBar
        fileName={fileName}
        outputSize={lastBuild?.outputSize ?? null}
        canDownload={canDownload}
        downloadedSize={downloadedSize}
        disabled={editing}
        onDownload={() => void handleDownload()}
        onReset={() => void handleReset()}
      />

      <VerificationDialog
        open={effectiveGate === "pending"}
        worstPages={lastBuild?.worstPages ?? []}
        model={model}
        renderComparison={renderComparison}
        onDownload={() => void handleDownload()}
        onCancel={() => void handleCancelVerification()}
      />

      <ProgressOverlay busy={busy} />
    </div>
  );
}

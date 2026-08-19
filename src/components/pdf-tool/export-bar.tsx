"use client";

import { CheckCircle2Icon, DownloadIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatBytes } from "./presets";

interface ExportBarProps {
  fileName: string;
  /** Size of the held build, when one exists. */
  outputSize: number | null;
  canDownload: boolean;
  /** Set once a download completed; switches the bar to its done state. */
  downloadedSize: number | null;
  disabled: boolean;
  onDownload: () => void;
  onReset: () => void;
}

export function ExportBar({
  fileName,
  outputSize,
  canDownload,
  downloadedSize,
  disabled,
  onDownload,
  onReset,
}: ExportBarProps) {
  if (outputSize === null && downloadedSize === null) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
      {downloadedSize !== null ? (
        <>
          <CheckCircle2Icon className="size-4 shrink-0 text-green-600" />
          <span className="min-w-0 flex-1 truncate text-sm text-stone-900">
            Downloaded <span className="font-medium">{fileName}</span> (
            {formatBytes(downloadedSize)})
          </span>
          <Button variant="outline" onClick={onReset} disabled={disabled}>
            <RotateCcwIcon data-icon="inline-start" />
            Start new package
          </Button>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-sm text-stone-900">
            <span className="font-medium">{fileName}</span>
            {outputSize !== null && (
              <span className="text-stone-500"> ({formatBytes(outputSize)})</span>
            )}
          </span>
          <Button onClick={onDownload} disabled={!canDownload || disabled}>
            <DownloadIcon data-icon="inline-start" />
            Download
          </Button>
        </>
      )}
    </div>
  );
}

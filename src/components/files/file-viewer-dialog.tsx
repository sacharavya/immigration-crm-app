"use client";

import { Download, ExternalLink, X } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/index";

// Embed strategies. The dialog picks one based on the file's mime type.
// PDFs + Office-converted-to-PDF embed via iframe (the proxy adds CSP
// sandbox + X-Content-Type-Options nosniff). Images embed as <img>.
// SVG / HTML / unknown types only get a Download button because the
// proxy serves those with Content-Disposition: attachment to prevent
// script execution.

type EmbedStrategy = "iframe" | "image" | "download_only";

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/webp",
  "image/gif",
]);

const OFFICE_MIME = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function resolveStrategy(mimeType: string | null): EmbedStrategy {
  if (!mimeType) return "download_only";
  if (mimeType === "application/pdf") return "iframe";
  if (OFFICE_MIME.has(mimeType)) return "iframe";
  if (IMAGE_MIME.has(mimeType)) return "image";
  // Anything else (SVG, HTML, audio, video, unknown) — let the user
  // download. The proxy serves SVG / HTML as attachment to prevent
  // script execution, so embedding them inline would either fail to
  // render or trigger the download anyway.
  return "download_only";
}

export type FileViewerProps = {
  fileId: string;
  fileName: string;
  mimeType: string | null;
  versionNumber: number;
  // Optional review actions next to the viewer. Parent supplies
  // ReactNode so the dialog stays UI-agnostic about how staff
  // expresses Approve / Reject (could be plain buttons, could be a
  // dropdown with rejection reasons, etc).
  reviewSlot?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FileViewerDialog({
  fileId,
  fileName,
  mimeType,
  versionNumber,
  reviewSlot,
  open,
  onOpenChange,
}: FileViewerProps) {
  // Cache-busting key changes when the dialog reopens. Prevents the
  // browser from showing a stale cached body if the underlying file
  // moved (e.g. after a re-upload).
  const [openKey, setOpenKey] = useState(0);

  function handleOpenChange(next: boolean) {
    if (next) setOpenKey((k) => k + 1);
    onOpenChange(next);
  }

  const strategy = resolveStrategy(mimeType);
  // The proxy decides format=pdf for office docs; the client just hits
  // the same URL. Cache-busting param avoids stale browser cache when
  // staff re-opens the dialog after a re-upload.
  const src = `/api/files/${fileId}?k=${openKey}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] w-[92vw] max-w-5xl gap-3 p-0">
        <DialogHeader className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base">
                {fileName}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                Version {versionNumber}
                {mimeType ? ` · ${mimeType}` : ""}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-stone-100 px-5 py-4">
          {strategy === "iframe" && (
            <iframe
              key={openKey}
              src={src}
              title={fileName}
              className="h-[70vh] w-full rounded-md border border-stone-200 bg-white"
              // sandbox attribute also applied by the proxy response
              // header (CSP: sandbox). Belt and suspenders.
              sandbox=""
            />
          )}
          {strategy === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={openKey}
              src={src}
              alt={fileName}
              className="max-h-[70vh] max-w-full rounded-md border border-stone-200 bg-white object-contain"
            />
          )}
          {strategy === "download_only" && (
            <div className="flex flex-col items-center gap-3 text-center text-sm text-stone-600">
              <p>This file type can&rsquo;t be previewed inline.</p>
              <a href={src} download={fileName} className={cn(buttonVariants())}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download {fileName}
              </a>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 border-t border-stone-200 px-5 py-3">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open in new tab
          </a>
          <a
            href={src}
            download={fileName}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </a>
          {reviewSlot}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

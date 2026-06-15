"use client";

import { Download, ExternalLink } from "lucide-react";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
      {/*
        Responsive sizing: full-screen on mobile (< 640px), inset
        dialog from sm: up. The dialog primitive's defaults assume a
        narrow centered panel; we override translate + position so the
        sheet can fill the viewport when needed.
        Using flex-col so the body region (flex-1) can stretch and the
        iframe/image inside fill what's left after header + footer.
      */}
      <DialogContent
        className={cn(
          // overflow-hidden is load-bearing: pdf/image children inside
          // the flex body otherwise push past the dialog's rounded
          // borders on desktop. The body's own overflow handling keeps
          // content visible; this just clips at the dialog edge.
          "flex flex-col gap-0 overflow-hidden p-0",
          // Mobile: pin to viewport edges, fill height.
          "inset-x-0 top-0 left-0 h-dvh max-h-dvh w-screen max-w-full translate-x-0 translate-y-0 rounded-none",
          // sm: revert to a centered, inset dialog.
          // h-[92vh] (not h-auto) gives the body a DEFINITE height so
          // flex-1 + min-h-0 clamps the iframe / image inside instead
          // of letting them push the dialog past the viewport.
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[92vh] sm:max-h-[92vh] sm:w-[92vw] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
        )}
      >
        <DialogHeader className="border-b border-stone-200 px-4 py-3 pr-12 sm:px-5 sm:py-4">
          <DialogTitle className="truncate text-sm sm:text-base">
            {fileName}
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-xs">
            Version {versionNumber}
            {mimeType ? ` · ${mimeType}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/*
          min-h-0 here is load-bearing: without it the flex child can't
          shrink below its content's natural height, so the iframe's
          h-full would push the dialog past the viewport on phones.
          overflow-auto on the container handles cases where the image
          is naturally larger than the box (e.g. a 4000px-wide flag PNG)
          — user scrolls within the body region rather than the page.
        */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-stone-100 px-3 py-3 sm:px-5 sm:py-4">
          {strategy === "iframe" && (
            // <object> instead of <iframe> for PDFs: Chrome refuses to
            // render application/pdf responses in iframes in some
            // contexts ("This page has been blocked by Chrome"). The
            // <object> element is the spec-blessed embed mechanism
            // and explicitly tells the browser "render this as PDF",
            // routing through the browser's native PDF viewer rather
            // than treating it as a generic frame navigation. The
            // children render only when the browser declines to embed
            // — they act as a graceful fallback.
            // Defense in depth survives: the proxy authenticates by
            // case_id, forces SVG/HTML/XML to attachment so they
            // never embed, and sends X-Content-Type-Options: nosniff.
            <object
              key={openKey}
              data={src}
              type="application/pdf"
              className="h-full min-h-[280px] w-full rounded-md border border-stone-200 bg-white sm:min-h-[400px]"
              aria-label={fileName}
            >
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-stone-600">
                <p>
                  Your browser can&rsquo;t preview this file inline.
                </p>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants())}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open in new tab
                </a>
              </div>
            </object>
          )}
          {strategy === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={openKey}
              src={src}
              alt={fileName}
              // max-h-full + object-contain clamps to the body's
              // definite height (set via dialog h-[92vh] on desktop /
              // h-dvh on mobile, propagated through flex-1 + min-h-0).
              // Without the dialog's definite height, the image would
              // push the body past the viewport.
              className="max-h-full max-w-full rounded-md border border-stone-200 bg-white object-contain"
            />
          )}
          {strategy === "download_only" && (
            <div className="flex flex-col items-center gap-3 text-center text-sm text-stone-600">
              <p>This file type can&rsquo;t be previewed inline.</p>
              <a
                href={src}
                download={fileName}
                className={cn(buttonVariants(), "max-w-full truncate")}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                <span className="truncate">Download {fileName}</span>
              </a>
            </div>
          )}
        </div>

        {/*
          Plain div instead of DialogFooter to avoid the primitive's
          negative margins (-mx-4 -mb-4) and bg-muted styling, which
          fight the full-screen mobile shell. Buttons stack on mobile,
          row on sm+. Anchors styled as buttons so they keep the
          shared button look without dragging in asChild.
        */}
        <div className="flex flex-col gap-2 border-t border-stone-200 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:px-5">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full justify-center sm:w-auto",
            )}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open in new tab
          </a>
          <a
            href={src}
            download={fileName}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full justify-center sm:w-auto",
            )}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </a>
          {reviewSlot}
        </div>
      </DialogContent>
    </Dialog>
  );
}

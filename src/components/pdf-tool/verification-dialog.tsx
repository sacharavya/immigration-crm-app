"use client";

// THE GATE: after a build that recompressed pages, staff must eyeball the
// most aggressively compressed pages at 100 percent zoom before the download
// unlocks. Cancel discards the held output and returns to editing.

import { useEffect, useRef, useState } from "react";
import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ComparisonPair, PageId, PageModel } from "@/lib/pdf-engine/types";

const MAX_PAGES_SHOWN = 6;
const COMPARISON_EDGE_PX = 1400;

interface ComparisonView {
  pageId: PageId;
  pageNumber: number | null;
  originalUrl: string;
  originalWidth: number;
  compressedUrl: string;
  compressedWidth: number;
  appliedDpi: number | null;
  appliedQuality: number | null;
}

interface VerificationDialogProps {
  open: boolean;
  worstPages: readonly PageId[];
  model: PageModel | null;
  renderComparison: (
    pageId: PageId,
    maxEdgePx: number,
  ) => Promise<ComparisonPair | null>;
  onDownload: () => void;
  onCancel: () => void;
}

function toUrl(png: Uint8Array): string {
  return URL.createObjectURL(
    new Blob([png as BlobPart], { type: "image/png" }),
  );
}

/**
 * Mounted only while the dialog is open, so comparison and checkbox state
 * start fresh on every open and object URLs are revoked on close.
 */
function VerificationGateBody({
  worstPages,
  model,
  renderComparison,
  onDownload,
  onCancel,
}: Omit<VerificationDialogProps, "open">) {
  const [views, setViews] = useState<ComparisonView[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const position = new Map(
      (model?.pages ?? []).map((p, i) => [p.id, i + 1]),
    );

    void (async () => {
      const next: ComparisonView[] = [];
      for (const pageId of worstPages.slice(0, MAX_PAGES_SHOWN)) {
        const pair = await renderComparison(pageId, COMPARISON_EDGE_PX);
        if (cancelled) return;
        if (!pair) continue;
        const originalUrl = toUrl(pair.original.png);
        const compressedUrl = toUrl(pair.compressed.png);
        urlsRef.current.push(originalUrl, compressedUrl);
        next.push({
          pageId,
          pageNumber: position.get(pageId) ?? null,
          originalUrl,
          originalWidth: pair.original.width,
          compressedUrl,
          compressedWidth: pair.compressed.width,
          appliedDpi: pair.appliedDpi,
          appliedQuality: pair.appliedQuality,
        });
      }
      if (!cancelled) setViews(next);
    })();

    const urls = urlsRef.current;
    return () => {
      cancelled = true;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.length = 0;
    };
  }, [worstPages, model, renderComparison]);

  return (
    <>
      <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
        {views === null ? (
          <p className="py-8 text-center text-sm text-stone-500">
            Rendering comparisons...
          </p>
        ) : views.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500">
            No comparison pages available.
          </p>
        ) : (
          views.map((view) => (
            <div key={view.pageId} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3 text-xs text-stone-600">
                <span className="font-medium text-stone-900">
                  {view.pageNumber !== null
                    ? `Page ${view.pageNumber}`
                    : "Page"}
                </span>
                {view.appliedDpi !== null && <span>{view.appliedDpi} DPI</span>}
                {view.appliedQuality !== null && (
                  <span>quality {view.appliedQuality}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="overflow-hidden rounded-lg border border-stone-200">
                  <p className="border-b border-stone-100 bg-stone-50 px-2 py-1 text-[11px] font-medium text-stone-500">
                    Original
                  </p>
                  <div className="max-h-80 overflow-auto">
                    <img
                      src={view.originalUrl}
                      alt={`Original page ${view.pageNumber ?? ""}`}
                      className="max-w-none"
                      style={{ width: view.originalWidth }}
                    />
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-stone-200">
                  <p className="border-b border-stone-100 bg-stone-50 px-2 py-1 text-[11px] font-medium text-stone-500">
                    Compressed
                  </p>
                  <div className="max-h-80 overflow-auto">
                    <img
                      src={view.compressedUrl}
                      alt={`Compressed page ${view.pageNumber ?? ""}`}
                      className="max-w-none"
                      style={{ width: view.compressedWidth }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium select-none">
        <input
          type="checkbox"
          className="size-4 accent-[var(--primary)]"
          checked={confirmed}
          disabled={views === null}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I confirm every page shown is legible
      </label>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onDownload} disabled={!confirmed || views === null}>
          <DownloadIcon data-icon="inline-start" />
          Download
        </Button>
      </DialogFooter>
    </>
  );
}

export function VerificationDialog({
  open,
  worstPages,
  model,
  renderComparison,
  onDownload,
  onCancel,
}: VerificationDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-5xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Verify compressed pages</DialogTitle>
          <DialogDescription>
            These are the most aggressively compressed pages, shown at 100
            percent zoom next to their originals. Confirm every one is legible
            before downloading.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <VerificationGateBody
            worstPages={worstPages}
            model={model}
            renderComparison={renderComparison}
            onDownload={onDownload}
            onCancel={onCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

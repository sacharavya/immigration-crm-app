"use client";

// Compress tool: pick a portal size limit, see the pre-build classification
// (what would be flattened), run the staged compression build, and review
// per-page results. A build that recompressed pages must then pass the
// verification gate (opened by the shell); the confirmed build stays held in
// the worker as THE pending export - the top bar's Download takes it.

import { Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { INPUT_BASE_CLASS } from "@/components/ui/input-class";
import { Label } from "@/components/ui/label";
import type {
  BuildOptions,
  BuildReport,
  CompressionPreflight,
  PageModel,
} from "@/lib/pdf-engine/types";

import { CompressPanel } from "../../compress-panel";
import { formatBytes, SIZE_PRESETS } from "../../presets";

/** How long preset/model changes settle before re-running preflight. */
const PREFLIGHT_DEBOUNCE_MS = 500;

const COMPRESS_PRESETS = SIZE_PRESETS.filter((p) => p.targetBytes !== null);

export function CompressDialog({
  open,
  onOpenChange,
  model,
  report,
  gatePassed,
  disabled,
  preflight,
  onCompress,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: PageModel | null;
  /** The held build's report, when one exists. */
  report: BuildReport | null;
  /** True once the held build passed (or never needed) the gate. */
  gatePassed: boolean;
  disabled: boolean;
  preflight: (options: BuildOptions) => Promise<CompressionPreflight | null>;
  onCompress: (targetBytes: number) => Promise<void>;
}) {
  const [presetKey, setPresetKey] = useState(COMPRESS_PRESETS[0].key);
  const [customMb, setCustomMb] = useState(4);
  const [preflightResult, setPreflightResult] =
    useState<CompressionPreflight | null>(null);

  const preset =
    COMPRESS_PRESETS.find((p) => p.key === presetKey) ?? COMPRESS_PRESETS[0];
  const targetBytes =
    preset.key === "custom"
      ? customMb > 0
        ? Math.round(customMb * 1_000_000)
        : null
      : preset.targetBytes;

  // Pre-build classification whenever the dialog is open and inputs settle,
  // so staff see what would be flattened BEFORE building.
  useEffect(() => {
    if (!open) return;
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
  }, [open, model, targetBytes, preflight]);

  const compressed = report?.compression != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compress to a size limit</DialogTitle>
          <DialogDescription>
            Only image-dominant pages (scans) are recompressed; text and form
            pages pass through untouched.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compress-preset">Size limit</Label>
              <select
                id="compress-preset"
                className={`${INPUT_BASE_CLASS} w-52`}
                value={presetKey}
                disabled={disabled}
                onChange={(e) => setPresetKey(e.target.value)}
              >
                {COMPRESS_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {presetKey === "custom" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="compress-custom-mb">Limit (MB)</Label>
                <Input
                  id="compress-custom-mb"
                  type="number"
                  min={1}
                  step={1}
                  className="w-24"
                  value={customMb}
                  disabled={disabled}
                  onChange={(e) => {
                    const mb = Number(e.target.value);
                    setCustomMb(Number.isFinite(mb) && mb > 0 ? mb : 0);
                  }}
                />
              </div>
            )}
          </div>

          <CompressPanel
            preflight={preflightResult}
            report={report}
            model={model}
            targetBytes={targetBytes}
          />

          {compressed && gatePassed && report && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Compressed build ready ({formatBytes(report.outputSize)}). Use
              Download in the top bar to save it.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={
              disabled ||
              targetBytes === null ||
              !model ||
              model.pages.length === 0
            }
            onClick={() => {
              if (targetBytes !== null) void onCompress(targetBytes);
            }}
          >
            <Minimize2 data-icon="inline-start" />
            Compress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

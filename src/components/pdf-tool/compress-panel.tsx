"use client";

import { AlertTriangleIcon, ScissorsIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  BuildReport,
  CompressionPreflight,
  PageId,
  PageModel,
} from "@/lib/pdf-engine/types";

import { formatBytes } from "./presets";

interface CompressPanelProps {
  /** Pre-build classification; shown until a build report exists. */
  preflight: CompressionPreflight | null;
  /** Report of the held build, when one exists. */
  report: BuildReport | null;
  model: PageModel | null;
  targetBytes: number | null;
}

/** Map PageIds to their 1-based position in the current model order. */
function pageNumbers(model: PageModel | null, ids: readonly PageId[]): string {
  if (!model) return "";
  const position = new Map(model.pages.map((p, i) => [p.id, i + 1]));
  return ids
    .map((id) => position.get(id))
    .filter((n): n is number => n !== undefined)
    .sort((a, b) => a - b)
    .join(", ");
}

export function CompressPanel({
  preflight,
  report,
  model,
  targetBytes,
}: CompressPanelProps) {
  if (report?.compression) {
    const compression = report.compression;
    const inputBytes = compression.perPage.reduce(
      (sum, p) => sum + p.originalBytes,
      0,
    );
    const position = new Map(
      (model?.pages ?? []).map((p, i) => [p.id, i + 1]),
    );

    return (
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-stone-900">Compression result</span>
          <span className="text-stone-600">
            {formatBytes(inputBytes)} {"->"} {formatBytes(report.outputSize)}
          </span>
          <Badge variant="secondary">
            {compression.pagesRecompressed} recompressed
          </Badge>
          <Badge variant="secondary">
            {compression.pagesPassedThrough} passed through
          </Badge>
          {targetBytes !== null && (
            <Badge variant={compression.reachedTarget ? "default" : "destructive"}>
              {compression.reachedTarget
                ? `Within ${formatBytes(targetBytes)}`
                : `Over ${formatBytes(targetBytes)}`}
            </Badge>
          )}
        </div>

        {compression.suggestSplit && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <ScissorsIcon className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">
                Target not reached - split this package
              </p>
              <p>
                The smallest legible output is{" "}
                {formatBytes(compression.achievableMinimumBytes)}. Split the
                pages into multiple submissions instead of compressing further.
              </p>
            </div>
          </div>
        )}

        {compression.warnings.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {compression.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>DPI</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compression.perPage.map((p) => (
              <TableRow key={p.pageId}>
                <TableCell>{position.get(p.pageId) ?? "-"}</TableCell>
                <TableCell>{p.classification}</TableCell>
                <TableCell>
                  {p.action === "recompressed" ? (
                    <Badge>recompressed</Badge>
                  ) : (
                    <Badge variant="outline">passed through</Badge>
                  )}
                </TableCell>
                <TableCell>{p.appliedDpi ?? "-"}</TableCell>
                <TableCell>{p.appliedQuality ?? "-"}</TableCell>
                <TableCell>
                  {formatBytes(p.originalBytes)} {"->"}{" "}
                  {formatBytes(p.finalBytes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!preflight || targetBytes === null) return null;

  const flattenIds = [
    ...new Set([
      ...preflight.pagesWithSelectableText,
      ...preflight.pagesWithFormFields,
    ]),
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-medium text-stone-900">Compression preview</span>
        <Badge variant="secondary">
          {preflight.pagesToRecompress} to recompress
        </Badge>
        <Badge variant="secondary">
          {preflight.pagesToPassThrough} to pass through
        </Badge>
        <span className="text-stone-600">
          Estimated output {formatBytes(preflight.estimatedOutputBytes)} of a{" "}
          {formatBytes(targetBytes)} limit
        </span>
      </div>

      {flattenIds.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">
              Selectable text or form fields will be flattened
            </p>
            <p className="text-xs">
              {preflight.pagesWithSelectableText.length > 0 && (
                <>
                  Pages with selectable text:{" "}
                  {pageNumbers(model, preflight.pagesWithSelectableText)}.{" "}
                </>
              )}
              {preflight.pagesWithFormFields.length > 0 && (
                <>
                  Pages with form fields:{" "}
                  {pageNumbers(model, preflight.pagesWithFormFields)}.{" "}
                </>
              )}
              Compressing rasterizes these pages, so text and fields stop being
              selectable in the output.
            </p>
          </div>
        </div>
      )}

      {preflight.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {preflight.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

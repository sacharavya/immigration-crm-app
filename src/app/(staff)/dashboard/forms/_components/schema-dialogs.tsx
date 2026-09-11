"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FormFieldSchema, SchemaDiff } from "@/lib/forms/types";

// FORMS-2 read-only views: the extracted field list of a version, and its
// diff against the previous version.

export function FieldSchemaDialog({
  versionLabel,
  fields,
}: {
  versionLabel: string;
  fields: FormFieldSchema[];
}) {
  const [open, setOpen] = useState(false);
  if (fields.length === 0) return null;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Fields ({fields.length})
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Field schema · {versionLabel}</DialogTitle>
            <DialogDescription>
              {fields.length} field{fields.length === 1 ? "" : "s"} extracted
              from the blank PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="py-2 pr-3 font-medium">Path</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Label</th>
                  <th className="py-2 font-medium">Repeating</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f.path} className="border-b border-stone-100 last:border-0">
                    <td className="max-w-72 break-all py-1.5 pr-3 font-mono text-xs text-stone-700">
                      {f.path}
                    </td>
                    <td className="py-1.5 pr-3 text-stone-600">{f.type}</td>
                    <td className="max-w-40 truncate py-1.5 pr-3 text-stone-500">
                      {f.label ?? "-"}
                    </td>
                    <td className="py-1.5 text-stone-500">
                      {f.repeating ? "yes" : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SchemaDiffDialog({
  versionLabel,
  diff,
}: {
  versionLabel: string;
  diff: SchemaDiff;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Diff
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Changes in {versionLabel}</DialogTitle>
            <DialogDescription>
              Compared with the previous uploaded version.{" "}
              {diff.unchanged} field{diff.unchanged === 1 ? "" : "s"} unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <DiffColumn
              title={`Added (${diff.added.length})`}
              tone="text-green-700"
              items={diff.added}
            />
            <DiffColumn
              title={`Removed (${diff.removed.length})`}
              tone="text-red-700"
              items={diff.removed}
            />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Renamed ({diff.renamed.length})
              </h3>
              <ul className="mt-2 space-y-1.5">
                {diff.renamed.length === 0 ? (
                  <li className="text-xs text-stone-400">None</li>
                ) : (
                  diff.renamed.map((r) => (
                    <li key={r.from} className="break-all font-mono text-xs text-stone-600">
                      {r.from}
                      <span className="text-stone-400"> &rarr; </span>
                      {r.to}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DiffColumn({
  title,
  tone,
  items,
}: {
  title: string;
  tone: string;
  items: string[];
}) {
  return (
    <div>
      <h3 className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5">
        {items.length === 0 ? (
          <li className="text-xs text-stone-400">None</li>
        ) : (
          items.map((p) => (
            <li key={p} className="break-all font-mono text-xs text-stone-600">
              {p}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

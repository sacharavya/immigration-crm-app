"use client";

import { useRef, useState } from "react";
import { FileTextIcon, ImageIcon, UploadIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { mimeForFile } from "@/lib/pdf-engine/sources/local";
import type { LoadedDocument } from "@/lib/pdf-engine/types";

import { formatBytes } from "./presets";

interface UploadZoneProps {
  documents: LoadedDocument[];
  inputWarning: string | null;
  disabled: boolean;
  onFiles: (files: File[]) => void;
}

export function UploadZone({
  documents,
  inputWarning,
  disabled,
  onFiles,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  const accept = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const supported: File[] = [];
    const skipped: string[] = [];
    for (const file of Array.from(files)) {
      if (mimeForFile(file)) supported.push(file);
      else skipped.push(file.name);
    }
    setRejected(skipped);
    if (supported.length > 0) onFiles(supported);
  };

  const totalBytes = documents.reduce((sum, d) => sum + d.sizeBytes, 0);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) accept(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors disabled:pointer-events-none disabled:opacity-50 ${
          dragOver
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-stone-300 bg-white hover:border-stone-400"
        }`}
      >
        <UploadIcon className="size-6 text-stone-400" />
        <span className="text-sm font-medium text-stone-900">
          Drop files here or click to browse
        </span>
        <span className="text-xs text-stone-500">
          PDF, JPEG, and PNG. Images become single pages.
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />

      {rejected.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Skipped unsupported files: {rejected.join(", ")}
        </p>
      )}

      {inputWarning && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {inputWarning}
        </p>
      )}

      {documents.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2 text-xs font-medium text-stone-500">
            <span>
              {documents.length}{" "}
              {documents.length === 1 ? "document" : "documents"}
            </span>
            <span>{formatBytes(totalBytes)}</span>
          </div>
          <ul className="divide-y divide-stone-100">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                {doc.kind === "pdf" ? (
                  <FileTextIcon className="size-4 shrink-0 text-stone-400" />
                ) : (
                  <ImageIcon className="size-4 shrink-0 text-stone-400" />
                )}
                <span className="min-w-0 flex-1 truncate text-stone-900">
                  {doc.name}
                </span>
                <Badge variant="secondary">
                  {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
                </Badge>
                <span className="shrink-0 text-xs text-stone-500">
                  {formatBytes(doc.sizeBytes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

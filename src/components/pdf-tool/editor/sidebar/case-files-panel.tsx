"use client";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Loader2,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { CaseDriveItem } from "@/app/(staff)/dashboard/pdf-tool/actions";

// Mimes the engine can ingest; everything else renders greyed out.
const ADDABLE = new Set(["application/pdf", "image/jpeg", "image/png"]);

export interface CaseFilesPanelProps {
  caseId: string;
  listChildren: (
    caseId: string,
    folderItemId?: string,
  ) => Promise<{ items: CaseDriveItem[] } | { error: string }>;
  getFileUrl: (
    caseId: string,
    itemId: string,
  ) => Promise<{ url: string } | { error: string }>;
  /** Receives ready File objects; the shell feeds them to the engine. */
  onAddFiles: (files: File[]) => Promise<void>;
  disabled: boolean;
}

// The case's real OneDrive folder tree. Folders lazy-load on expand; PDF and
// image files can be pulled into the package. Bytes are fetched directly from
// Microsoft with a short-lived URL; our server only lists metadata.
export function CaseFilesPanel({
  caseId,
  listChildren,
  getFileUrl,
  onAddFiles,
  disabled,
}: CaseFilesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [root, setRoot] = useState<CaseDriveItem[] | null>(null);
  const [rootError, setRootError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<ReadonlySet<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listChildren(caseId)
      .then((res) => {
        if (!active) return;
        if ("error" in res) setRootError(res.error);
        else setRoot(res.items);
      })
      .catch(() => active && setRootError("Could not load case files."));
    return () => {
      active = false;
    };
  }, [caseId, listChildren]);

  async function addFile(item: CaseDriveItem) {
    setAddError(null);
    setPendingId(item.id);
    try {
      const res = await getFileUrl(caseId, item.id);
      if ("error" in res) throw new Error(res.error);
      const resp = await fetch(res.url);
      if (!resp.ok) throw new Error("download failed");
      const buf = await resp.arrayBuffer();
      const mime = item.mime === "image/jpg" ? "image/jpeg" : (item.mime ?? "");
      await onAddFiles([new File([buf], item.name, { type: mime })]);
      setAddedIds((s) => new Set(s).add(item.id));
    } catch (err) {
      setAddError(
        `Could not add "${item.name}": ${err instanceof Error ? err.message : "unknown error"}`,
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="border-b border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 hover:bg-stone-50"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        Case files
      </button>
      {!collapsed && (
        <div className="max-h-72 overflow-y-auto px-1 pb-2">
          {rootError ? (
            <p className="px-2 py-1 text-xs text-rose-600">{rootError}</p>
          ) : root === null ? (
            <p className="flex items-center gap-1.5 px-2 py-1 text-xs text-stone-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </p>
          ) : root.length === 0 ? (
            <p className="px-2 py-1 text-xs text-stone-400">Folder is empty.</p>
          ) : (
            <TreeLevel
              caseId={caseId}
              items={root}
              depth={0}
              listChildren={listChildren}
              addedIds={addedIds}
              pendingId={pendingId}
              disabled={disabled}
              onAdd={(item) => void addFile(item)}
            />
          )}
          {addError && (
            <p className="px-2 py-1 text-xs text-rose-600">{addError}</p>
          )}
        </div>
      )}
    </div>
  );
}

function TreeLevel({
  caseId,
  items,
  depth,
  listChildren,
  addedIds,
  pendingId,
  disabled,
  onAdd,
}: {
  caseId: string;
  items: CaseDriveItem[];
  depth: number;
  listChildren: CaseFilesPanelProps["listChildren"];
  addedIds: ReadonlySet<string>;
  pendingId: string | null;
  disabled: boolean;
  onAdd: (item: CaseDriveItem) => void;
}) {
  return (
    <ul>
      {items.map((item) =>
        item.kind === "folder" ? (
          <FolderNode
            key={item.id}
            caseId={caseId}
            item={item}
            depth={depth}
            listChildren={listChildren}
            addedIds={addedIds}
            pendingId={pendingId}
            disabled={disabled}
            onAdd={onAdd}
          />
        ) : (
          <FileNode
            key={item.id}
            item={item}
            depth={depth}
            added={addedIds.has(item.id)}
            pending={pendingId === item.id}
            disabled={disabled || pendingId !== null}
            onAdd={onAdd}
          />
        ),
      )}
    </ul>
  );
}

function FolderNode({
  caseId,
  item,
  depth,
  listChildren,
  addedIds,
  pendingId,
  disabled,
  onAdd,
}: {
  caseId: string;
  item: CaseDriveItem;
  depth: number;
  listChildren: CaseFilesPanelProps["listChildren"];
  addedIds: ReadonlySet<string>;
  pendingId: string | null;
  disabled: boolean;
  onAdd: (item: CaseDriveItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<CaseDriveItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && children === null && !loading) {
      setLoading(true);
      try {
        const res = await listChildren(caseId, item.id);
        if ("error" in res) setError(res.error);
        else setChildren(res.items);
      } catch {
        setError("Could not load folder.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => void toggle()}
        className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm text-stone-700 hover:bg-stone-50"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-stone-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-400" />
        )}
        <Folder className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="min-w-0 flex-1 truncate">{item.name}</span>
        <span className="text-[10px] text-stone-400">{item.childCount}</span>
      </button>
      {open && (
        <>
          {loading && (
            <p
              className="flex items-center gap-1.5 py-0.5 text-xs text-stone-400"
              style={{ paddingLeft: `${28 + depth * 14}px` }}
            >
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </p>
          )}
          {error && (
            <p
              className="py-0.5 text-xs text-rose-600"
              style={{ paddingLeft: `${28 + depth * 14}px` }}
            >
              {error}
            </p>
          )}
          {children && children.length === 0 && (
            <p
              className="py-0.5 text-xs text-stone-400"
              style={{ paddingLeft: `${28 + depth * 14}px` }}
            >
              Empty
            </p>
          )}
          {children && children.length > 0 && (
            <TreeLevel
              caseId={caseId}
              items={children}
              depth={depth + 1}
              listChildren={listChildren}
              addedIds={addedIds}
              pendingId={pendingId}
              disabled={disabled}
              onAdd={onAdd}
            />
          )}
        </>
      )}
    </li>
  );
}

function FileNode({
  item,
  depth,
  added,
  pending,
  disabled,
  onAdd,
}: {
  item: CaseDriveItem;
  depth: number;
  added: boolean;
  pending: boolean;
  disabled: boolean;
  onAdd: (item: CaseDriveItem) => void;
}) {
  const addable = item.mime !== null && ADDABLE.has(item.mime);
  return (
    <li
      className="group flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-stone-50"
      style={{ paddingLeft: `${24 + depth * 14}px` }}
    >
      {item.thumbnailUrl ? (
        // Pre-authenticated Microsoft thumbnail; short-lived URL fetched by
        // the browser directly. next/image cannot optimize these, hence img.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          loading="lazy"
          className={`h-10 w-8 shrink-0 rounded border border-stone-200 bg-white object-cover ${addable ? "" : "opacity-50"}`}
        />
      ) : (
        <span
          className={`flex h-10 w-8 shrink-0 items-center justify-center rounded border border-stone-200 bg-stone-50 ${addable ? "text-stone-400" : "text-stone-300"}`}
        >
          <FileText className="h-4 w-4" />
        </span>
      )}
      <span
        className={`min-w-0 flex-1 truncate ${addable ? "text-stone-700" : "text-stone-400"}`}
        title={item.name}
      >
        {item.name}
      </span>
      {addable && (
        <button
          type="button"
          onClick={() => onAdd(item)}
          disabled={disabled || added || pending}
          className="inline-flex h-6 shrink-0 items-center gap-1 rounded border border-stone-200 bg-white px-1.5 text-[11px] font-medium text-stone-600 opacity-0 hover:bg-stone-100 focus:opacity-100 disabled:opacity-40 group-hover:opacity-100"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : added ? (
            "Added"
          ) : (
            <>
              <Plus className="h-3 w-3" /> Add
            </>
          )}
        </button>
      )}
    </li>
  );
}

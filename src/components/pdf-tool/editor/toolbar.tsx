"use client";

// Centered horizontal tool row, pdf.net style: icon over label. Mode tools
// (Select, Rearrange) stay highlighted; instant tools act on the selection;
// modal tools open their dialog.

import {
  FilePlus2,
  Hash,
  LayoutGrid,
  Minimize2,
  MousePointer2,
  RotateCw,
  Scissors,
  Trash2,
} from "lucide-react";
import type { ComponentType } from "react";

import type { ModeTool } from "./editor-store";

export type ToolId =
  | "select"
  | "merge"
  | "rearrange"
  | "rotate"
  | "delete"
  | "page-numbers"
  | "split"
  | "compress";

export type ToolKind = "instant" | "modal" | "mode";

interface ToolDef {
  id: ToolId;
  icon: ComponentType<{ className?: string }>;
  label: string;
  kind: ToolKind;
}

const TOOLS: readonly ToolDef[] = [
  { id: "select", icon: MousePointer2, label: "Select", kind: "mode" },
  { id: "merge", icon: FilePlus2, label: "Merge", kind: "modal" },
  { id: "rearrange", icon: LayoutGrid, label: "Rearrange", kind: "mode" },
  { id: "rotate", icon: RotateCw, label: "Rotate", kind: "instant" },
  { id: "delete", icon: Trash2, label: "Delete page", kind: "instant" },
  { id: "page-numbers", icon: Hash, label: "Page numbers", kind: "modal" },
  { id: "split", icon: Scissors, label: "Split", kind: "modal" },
  { id: "compress", icon: Minimize2, label: "Compress", kind: "modal" },
];

export function EditorToolbar({
  activeTool,
  pageNumbersSet,
  disabled,
  onTool,
}: {
  activeTool: ModeTool;
  /** Shows a dot badge on the Page numbers tool when options are stored. */
  pageNumbersSet: boolean;
  disabled: boolean;
  onTool: (id: ToolId) => void;
}) {
  return (
    <div className="flex justify-center border-b border-stone-200 bg-white px-4 py-1.5">
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const active = tool.kind === "mode" && tool.id === activeTool;
          return (
            <button
              key={tool.id}
              type="button"
              disabled={disabled}
              onClick={() => onTool(tool.id)}
              className={`relative flex w-[4.5rem] flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                active
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <Icon className="size-4.5" />
              {tool.label}
              {tool.id === "page-numbers" && pageNumbersSet && (
                <span className="absolute top-1 right-3 size-1.5 rounded-full bg-[var(--primary)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

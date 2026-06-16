"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/index";

import {
  removeTemplateDocument,
  updateTemplateDocument,
} from "../actions";

export type ItemDraft = {
  id: string;
  documentLabel: string;
  conditionLabel: string | null;
  allowedFileTypes: string[] | null;
  maxFileSizeMb: number | null;
  expectedQuantity: number;
  instructions: string | null;
};

const FILE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "application/pdf", label: "PDF" },
  { value: "image/jpeg", label: "JPG" },
  { value: "image/png", label: "PNG" },
  { value: "image/heic", label: "HEIC" },
  { value: "application/msword", label: "DOC" },
  {
    value:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "DOCX",
  },
];

export function ItemRow({
  item,
  readonly,
  isFirst,
  isLast,
  onSaved,
  onRemoved,
  onMove,
}: {
  item: ItemDraft;
  readonly: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSaved: () => void;
  onRemoved: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [draft, setDraft] = useState<ItemDraft>(item);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Re-seed when the upstream item changes (e.g., after revalidation).
  useEffect(() => {
    setDraft(item);
  }, [item]);

  // Autosave: 700ms debounce after the last edit.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (readonly) return;
    if (
      draft.documentLabel === item.documentLabel &&
      draft.conditionLabel === item.conditionLabel &&
      arraysEqual(draft.allowedFileTypes, item.allowedFileTypes) &&
      draft.maxFileSizeMb === item.maxFileSizeMb &&
      draft.expectedQuantity === item.expectedQuantity &&
      draft.instructions === item.instructions
    ) {
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await updateTemplateDocument({
          templateDocumentId: draft.id,
          label: draft.documentLabel,
          conditionLabel: draft.conditionLabel,
          allowedFileTypes:
            (draft.allowedFileTypes as
              | (
                  | "application/pdf"
                  | "image/jpeg"
                  | "image/png"
                  | "image/heic"
                  | "application/msword"
                  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                )[]
              | null) ?? null,
          maxFileSizeMb: draft.maxFileSizeMb,
          expectedQuantity: draft.expectedQuantity,
          instructions: draft.instructions,
        });
        if ("error" in result) {
          setError(result.error);
          // Revert to upstream state so the UI doesn't lie about saved values.
          setDraft(item);
          return;
        }
        setError(null);
        onSaved();
      });
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // We intentionally diff against `item` rather than tracking individual
    // fields — fewer dependencies, same correctness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, readonly]);

  function setField<K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleFileType(value: string) {
    const current = draft.allowedFileTypes ?? [];
    const next = current.includes(value)
      ? current.filter((t) => t !== value)
      : [...current, value];
    setField("allowedFileTypes", next.length === 0 ? null : next);
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await removeTemplateDocument(draft.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onRemoved();
    });
  }

  return (
    <li className={cn("space-y-2 px-3 py-3", pending && "opacity-70")}>
      <div className="flex items-start gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={readonly || isFirst}
            aria-label="Move up"
            className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={readonly || isLast}
            aria-label="Move down"
            className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <Input
          value={draft.documentLabel}
          onChange={(e) => setField("documentLabel", e.target.value)}
          disabled={readonly}
          placeholder="Document label"
          className="flex-1"
        />

        <button
          type="button"
          onClick={remove}
          disabled={readonly || pending}
          aria-label="Remove item"
          className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 pl-9 text-xs">
        <Input
          value={draft.conditionLabel ?? ""}
          onChange={(e) =>
            setField(
              "conditionLabel",
              e.target.value === "" ? null : e.target.value,
            )
          }
          disabled={readonly}
          placeholder="Condition (e.g. if applicable)"
          className="h-7 max-w-[16rem] flex-1 text-xs"
        />

        <div className="flex items-center gap-1">
          <span className="text-stone-500">Types:</span>
          {FILE_TYPE_OPTIONS.map((opt) => {
            const active = (draft.allowedFileTypes ?? []).includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleFileType(opt.value)}
                disabled={readonly}
                className={cn(
                  "rounded-full px-2 py-0.5 font-medium",
                  active
                    ? "bg-[var(--navy)] text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200",
                  readonly && "opacity-60",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-1 text-stone-500">
          Max
          <Input
            type="number"
            min={1}
            max={4}
            value={draft.maxFileSizeMb ?? ""}
            onChange={(e) =>
              setField(
                "maxFileSizeMb",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            disabled={readonly}
            placeholder="—"
            className="h-7 w-14 text-xs"
          />
          MB
        </label>

        {/*
          The per-template "expected quantity" field used to gate
          whether a slot could accept multiple files. That gate is
          gone — every slot now accepts unlimited files via the "Add
          another" affordance in the case checklist. The column is
          still on ref.template_documents (default 1, kept for
          backwards compat) but it no longer affects behavior, so
          we don't expose it here.
        */}
      </div>

      <textarea
        rows={1}
        value={draft.instructions ?? ""}
        onChange={(e) =>
          setField(
            "instructions",
            e.target.value === "" ? null : e.target.value,
          )
        }
        disabled={readonly}
        placeholder="Optional notes for staff or client."
        className="ml-9 w-[calc(100%-2.25rem)] rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
      />

      {error && (
        <p role="alert" className="ml-9 text-xs text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

function arraysEqual(a: string[] | null, b: string[] | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

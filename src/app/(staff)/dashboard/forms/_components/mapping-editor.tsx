"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fieldStatus,
  requiredGateBlockers,
  type FieldMappingStatus,
  type FormMapping,
  type MappingEntry,
  type MappingSource,
} from "@/lib/forms/mapping";
import { isArrayPath, PROFILE_PATHS } from "@/lib/forms/profile";
import { TRANSFORM_KEYS } from "@/lib/forms/transforms";
import type { FormFieldSchema } from "@/lib/forms/types";
import { cn } from "@/lib/utils/index";

import { copyMappingFromActive, saveVersionMapping } from "../actions";

const STATUS_CHIP: Record<FieldMappingStatus, string> = {
  mapped: "bg-green-100 text-green-800",
  unmapped: "bg-stone-100 text-stone-600",
  broken: "bg-red-100 text-red-800",
  manual: "bg-blue-100 text-blue-800",
  skip: "bg-stone-100 text-stone-400",
};

// Group fields for the left column: XFA paths group by their second
// segment (the page or section under form1), AcroForm dotted names by
// their first segment, flat names under "Fields".
function groupOf(path: string): string {
  const segs = path.split(".");
  if (segs.length <= 1) return "Fields";
  return segs.length >= 3 ? segs[1] : segs[0];
}

export function MappingEditor({
  versionId,
  editable,
  fields,
  initialMapping,
}: {
  versionId: string;
  editable: boolean;
  fields: FormFieldSchema[];
  initialMapping: FormMapping;
}) {
  const [mapping, setMapping] = useState<FormMapping>(initialMapping);
  const [selected, setSelected] = useState<string | null>(
    fields[0]?.path ?? null,
  );
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  // Broken entries have no matching field row; surface them in a
  // dedicated group so they stay visible and fixable.
  const brokenOnly = useMemo(() => {
    const fieldPaths = new Set(fields.map((f) => f.path));
    return Object.keys(mapping).filter(
      (p) => !fieldPaths.has(p) && mapping[p]?.broken,
    );
  }, [fields, mapping]);

  const groups = useMemo(() => {
    const out = new Map<string, FormFieldSchema[]>();
    for (const f of fields) {
      const g = groupOf(f.path);
      out.set(g, [...(out.get(g) ?? []), f]);
    }
    return out;
  }, [fields]);

  const counts = useMemo(() => {
    const c: Record<FieldMappingStatus, number> = {
      mapped: 0,
      unmapped: 0,
      broken: brokenOnly.length,
      manual: 0,
      skip: 0,
    };
    for (const f of fields) c[fieldStatus(mapping[f.path])]++;
    return c;
  }, [fields, mapping, brokenOnly]);

  const blockers = useMemo(() => requiredGateBlockers(mapping), [mapping]);

  const entry = selected ? mapping[selected] : undefined;
  const selectedField = fields.find((f) => f.path === selected);

  function update(path: string, next: MappingEntry | null) {
    setMapping((m) => {
      const copy = { ...m };
      if (next === null) delete copy[path];
      else copy[path] = next;
      return copy;
    });
    setDirty(true);
    setMessage(null);
  }

  function setSource(source: MappingSource) {
    if (!selected) return;
    const base: MappingEntry = entry ?? { source, required: false };
    update(selected, { ...base, source, broken: undefined });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveVersionMapping({
        version_id: versionId,
        mapping,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDirty(false);
      setMessage(
        result.blockers.length === 0
          ? "Saved. All required fields are resolved."
          : `Saved. ${result.blockers.length} required field${result.blockers.length === 1 ? "" : "s"} still block activation.`,
      );
    });
  }

  function copyFromActive() {
    setError(null);
    startTransition(async () => {
      const result = await copyMappingFromActive(versionId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  const pathMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return PROFILE_PATHS.filter((p) => p.path.toLowerCase().includes(q)).slice(
      0,
      12,
    );
  }, [search]);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(counts) as FieldMappingStatus[]).map((s) => (
          <span
            key={s}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              STATUS_CHIP[s],
            )}
          >
            {s} {counts[s]}
          </span>
        ))}
        <span className="ml-auto" />
        {blockers.length > 0 && (
          <span className="text-xs text-amber-700">
            {blockers.length} required unresolved
          </span>
        )}
        {editable && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={copyFromActive}
              disabled={pending}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy from previous version
            </Button>
            <Button size="sm" onClick={save} disabled={pending || !dirty}>
              {pending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1 h-3.5 w-3.5" />
              )}
              Save mapping
            </Button>
          </>
        )}
      </div>
      {message && <p className="text-xs text-green-700">{message}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,2fr)_3fr]">
        {/* Left: field list grouped by section */}
        <div className="overflow-y-auto rounded-lg border border-stone-300 bg-white">
          {[...groups.entries()].map(([group, groupFields]) => (
            <div key={group}>
              <div className="sticky top-0 border-b border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                {group}
              </div>
              <ul>
                {groupFields.map((f) => {
                  const status = fieldStatus(mapping[f.path]);
                  return (
                    <li key={f.path}>
                      <button
                        type="button"
                        onClick={() => setSelected(f.path)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-stone-50",
                          selected === f.path && "bg-[var(--navy)]/5",
                        )}
                      >
                        <span
                          className="min-w-0 truncate font-mono text-stone-700"
                          title={f.path}
                        >
                          {f.path.split(".").pop()}
                          {f.repeating && (
                            <span className="ml-1 text-stone-400">[]</span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            STATUS_CHIP[status],
                          )}
                        >
                          {status}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {brokenOnly.length > 0 && (
            <div>
              <div className="sticky top-0 border-b border-stone-200 bg-red-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">
                Broken (field no longer exists)
              </div>
              <ul>
                {brokenOnly.map((p) => (
                  <li
                    key={p}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs"
                  >
                    <span className="min-w-0 truncate font-mono text-stone-500" title={p}>
                      {p}
                    </span>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => update(p, null)}
                        className="shrink-0 text-[11px] text-red-600 hover:underline"
                      >
                        remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: the selected field's mapping */}
        <div className="overflow-y-auto rounded-lg border border-stone-300 bg-white p-4">
          {!selectedField ? (
            <p className="text-sm text-stone-400">Select a field.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="break-all font-mono text-sm text-stone-800">
                  {selectedField.path}
                </div>
                <div className="mt-0.5 text-xs text-stone-500">
                  {selectedField.type}
                  {selectedField.repeating ? " · repeating" : ""}
                  {selectedField.label ? ` · ${selectedField.label}` : ""}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(["profile", "constant", "manual", "skip"] as const).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={!editable}
                      onClick={() => setSource(s)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium capitalize",
                        entry?.source === s
                          ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                          : "border-stone-200 bg-white text-stone-600 hover:border-stone-300",
                      )}
                    >
                      {s}
                    </button>
                  ),
                )}
                {entry && editable && (
                  <button
                    type="button"
                    onClick={() => selected && update(selected, null)}
                    className="ml-auto text-xs text-stone-400 hover:text-red-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {entry?.source === "profile" && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Profile path
                  </label>
                  {entry.profile_path && (
                    <div className="mt-1 break-all rounded-md bg-stone-50 px-2 py-1.5 font-mono text-xs text-stone-800">
                      {entry.profile_path}
                    </div>
                  )}
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search profile paths..."
                    disabled={!editable}
                    className="mt-2"
                  />
                  {pathMatches.length > 0 && (
                    <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border border-stone-200">
                      {pathMatches.map((p) => (
                        <li key={p.path}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!selected) return;
                              update(selected, {
                                ...(entry as MappingEntry),
                                profile_path: p.path,
                              });
                              setSearch("");
                            }}
                            className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left font-mono text-xs text-stone-700 hover:bg-stone-50"
                          >
                            <span className="min-w-0 truncate">{p.path}</span>
                            <span className="shrink-0 text-[10px] text-stone-400">
                              {p.type}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(isArrayPath(entry.profile_path ?? "") ||
                    selectedField.repeating) && (
                    <label className="mt-3 block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        Array index (row number, 0-based)
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={entry.array_index ?? 0}
                        onChange={(e) =>
                          selected &&
                          update(selected, {
                            ...(entry as MappingEntry),
                            array_index: Math.max(
                              0,
                              Number.parseInt(e.target.value || "0", 10),
                            ),
                          })
                        }
                        disabled={!editable}
                        className="mt-1 w-28"
                      />
                    </label>
                  )}
                  <label className="mt-3 block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Transform
                    </span>
                    <select
                      value={entry.transform ?? ""}
                      onChange={(e) =>
                        selected &&
                        update(selected, {
                          ...(entry as MappingEntry),
                          transform: e.target.value || undefined,
                        })
                      }
                      disabled={!editable}
                      className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
                    >
                      <option value="">None</option>
                      {TRANSFORM_KEYS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {entry?.source === "constant" && (
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Constant value
                  </span>
                  <Input
                    value={entry.constant_value ?? ""}
                    onChange={(e) =>
                      selected &&
                      update(selected, {
                        ...(entry as MappingEntry),
                        constant_value: e.target.value,
                      })
                    }
                    disabled={!editable}
                    className="mt-1"
                  />
                </label>
              )}

              {entry?.source === "manual" && (
                <p className="text-xs text-stone-500">
                  Left blank at generation; the staff member fills it by hand
                  in the PDF.
                </p>
              )}
              {entry?.source === "skip" && (
                <p className="text-xs text-stone-500">
                  Deliberately left blank; never counts against activation.
                </p>
              )}

              {entry && (
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={entry.required}
                    onChange={(e) =>
                      selected &&
                      update(selected, {
                        ...(entry as MappingEntry),
                        required: e.target.checked,
                      })
                    }
                    disabled={!editable}
                    className="h-4 w-4"
                  />
                  Required: must be resolved before activation
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

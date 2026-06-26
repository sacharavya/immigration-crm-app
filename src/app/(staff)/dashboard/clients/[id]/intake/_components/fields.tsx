"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

import { SavingIndicator } from "./saving-indicator";
import { useDebouncedAutosave } from "./use-autosave";

// Lightweight controlled inputs that autosave on debounce. They keep the
// "dirty" state local; `save` runs once the debounce settles. The caller
// supplies the row-context (clientId / id) inside `save`.

type SaveFn<T> = (
  value: T,
) => Promise<{ ok: true } | { error: string }>;

// Sync incoming `initial` to local state only when the user hasn't typed
// past it since the last sync. Prevents the autosave → revalidatePath →
// re-render → reset cycle from clobbering in-flight keystrokes (see
// FLOW-bug: typing "Khairahani 32 Chitwan Parsa Nepal" became
// "Khairahani 32 Chitarsaepal" because mid-typing pauses triggered an
// autosave whose server-rendered `initial` overwrote later characters).
function useSyncedInitial<T>(
  initial: T,
  value: T,
  setValue: (v: T) => void,
) {
  const lastSeen = useRef<T>(initial);
  useEffect(() => {
    if (Object.is(lastSeen.current, initial)) return;
    // Only adopt if local value still matches the previous initial — i.e.
    // the user hasn't touched the field. Otherwise let the in-flight
    // edits win; autosave will reconcile on the next debounce.
    if (Object.is(value, lastSeen.current)) {
      setValue(initial);
    }
    lastSeen.current = initial;
  }, [initial, value, setValue]);
}

export function TextField({
  label,
  initial,
  save,
  type = "text",
  disabled,
  placeholder,
  helper,
}: {
  label: string;
  initial: string | null;
  save: SaveFn<string | null>;
  type?: "text" | "email" | "tel" | "date";
  disabled?: boolean;
  placeholder?: string;
  helper?: string;
}) {
  const [value, setValue] = useState<string>(initial ?? "");
  useSyncedInitial(initial ?? "", value, setValue);

  // For date fields the masked input emits a value on every keystroke, so an
  // incomplete date would autosave and bounce back "Use YYYY-MM-DD". Hold the
  // last saved value (`initial`) until the date is complete or cleared, so the
  // save fires once, on a valid YYYY-MM-DD or an empty field.
  const isDate = type === "date";
  const autosaveValue: string | null = isDate
    ? value === ""
      ? null
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? value
        : (initial ?? null)
    : value.trim() === ""
      ? null
      : value;

  const { state, error } = useDebouncedAutosave<string | null>(
    autosaveValue,
    save,
    { enabled: !disabled },
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {label}
        </label>
        <SavingIndicator state={state} error={error} />
      </div>
      <Input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {helper && (
        <p className="text-xs text-stone-500">{helper}</p>
      )}
    </div>
  );
}

export function SelectField<V extends string>({
  label,
  initial,
  options,
  save,
  disabled,
  allowEmpty = true,
}: {
  label: string;
  initial: V | null;
  options: { value: V; label: string }[];
  save: SaveFn<V | null>;
  disabled?: boolean;
  allowEmpty?: boolean;
}) {
  const [value, setValue] = useState<string>(initial ?? "");
  useSyncedInitial(initial ?? "", value, setValue);

  const next = value === "" ? null : (value as V);
  const { state, error } = useDebouncedAutosave<V | null>(next, save, {
    delayMs: 300,
    enabled: !disabled,
  });

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {label}
        </label>
        <SavingIndicator state={state} error={error} />
      </div>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className="h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-50"
      >
        {allowEmpty && <option value="">—</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function YesNoField({
  initial,
  onChange,
  disabled,
  name,
}: {
  initial: boolean | null;
  onChange: (v: boolean) => Promise<void> | void;
  disabled?: boolean;
  name: string;
}) {
  const [pending, setPending] = useState<boolean | null>(null);

  async function pick(v: boolean) {
    if (disabled) return;
    setPending(v);
    try {
      await onChange(v);
    } finally {
      setPending(null);
    }
  }

  const current = pending ?? initial;

  return (
    <div className="inline-flex items-center gap-2">
      {[
        { v: true, label: "Yes" },
        { v: false, label: "No" },
      ].map((opt) => {
        const selected = current === opt.v;
        return (
          <label
            key={opt.label}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
              selected
                ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <input
              type="radio"
              name={name}
              checked={selected}
              onChange={() => pick(opt.v)}
              disabled={disabled}
              className="sr-only"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

export function TextareaField({
  label,
  initial,
  save,
  disabled,
  rows = 3,
}: {
  label?: string;
  initial: string | null;
  save: SaveFn<string | null>;
  disabled?: boolean;
  rows?: number;
}) {
  const [value, setValue] = useState<string>(initial ?? "");
  useSyncedInitial(initial ?? "", value, setValue);

  const { state, error } = useDebouncedAutosave<string | null>(
    value.trim() === "" ? null : value,
    save,
    { enabled: !disabled },
  );

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            {label}
          </label>
          <SavingIndicator state={state} error={error} />
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        disabled={disabled}
        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-50"
      />
      {!label && <SavingIndicator state={state} error={error} />}
    </div>
  );
}

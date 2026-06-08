"use client";

import { startTransition, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

// Debounced field-level autosave. Calls `save(value)` 800ms after the
// caller stops changing the value. Tracks save state so the UI can
// surface a "Saving…" indicator and surface error messages.
//
// `enabled` lets the caller suppress autosave when the field is in an
// invalid intermediate state (e.g. partial date input).
//
// Next.js 16: server-action invocations + their dependent setState
// calls must run inside startTransition. Without it the dev console
// floods with "Router action dispatched before initialization."
// every time revalidatePath fires from inside the action (which the
// staff intake actions do on every write to keep the dashboard
// view fresh). The transition wrap also marks autosave as a non-
// urgent update so a fast typist's keystrokes still render
// immediately while the previous save is in flight.
export function useDebouncedAutosave<T>(
  value: T,
  save: (value: T) => Promise<{ ok: true } | { error: string }>,
  options: { delayMs?: number; enabled?: boolean } = {},
) {
  const { delayMs = 800, enabled = true } = options;

  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef<T>(value);
  const initialRef = useRef<T>(value);

  useEffect(() => {
    if (!enabled) return;
    // Skip the first effect run when value matches what was loaded.
    if (Object.is(value, lastSavedRef.current)) return;
    if (Object.is(value, initialRef.current) && state === "idle") return;

    setState("saving");
    setError(null);

    const t = setTimeout(() => {
      startTransition(async () => {
        const result = await save(value);
        if ("error" in result) {
          setError(result.error);
          setState("error");
          return;
        }
        lastSavedRef.current = value;
        setState("saved");
        const fade = setTimeout(() => setState("idle"), 1200);
        return () => clearTimeout(fade);
      });
    }, delayMs);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled]);

  return { state, error } as const;
}

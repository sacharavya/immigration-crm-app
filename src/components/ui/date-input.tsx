"use client";

import { CalendarDays } from "lucide-react";
import * as React from "react";

import { maskDateValue } from "@/lib/utils/date-mask";
import { cn } from "@/lib/utils/index";

import { INPUT_BASE_CLASS } from "./input-class";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export { maskDateValue };

// A date field that accepts typed input (masked to YYYY-MM-DD) and keeps a
// calendar affordance via the browser date picker. Drop-in for the native
// `type="date"` input: same `value` (a YYYY-MM-DD string), same change event
// (the masked string is on `event.target.value`), and `min` / `max` flow to
// the picker. The shared Input component routes `type="date"` here.
export function DateInput({
  className,
  value,
  onChange,
  disabled,
  min,
  max,
  placeholder,
  ...props
}: React.ComponentProps<"input">) {
  const pickerRef = React.useRef<HTMLInputElement>(null);
  const current = typeof value === "string" ? value : "";

  function handleText(event: React.ChangeEvent<HTMLInputElement>) {
    // Rewrite the live value to the masked form before the caller reads it,
    // so the caller's controlled state and this input stay in lock-step.
    event.target.value = maskDateValue(event.target.value);
    onChange?.(event);
  }

  function openPicker() {
    if (disabled) return;
    const el = pickerRef.current;
    try {
      el?.showPicker?.();
    } catch {
      // showPicker throws if not from a user gesture or unsupported; the typed
      // field still works, so fail quietly.
    }
  }

  return (
    <div className="relative w-full">
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder ?? "YYYY-MM-DD"}
        value={current}
        onChange={handleText}
        disabled={disabled}
        className={cn(INPUT_BASE_CLASS, "pr-9", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Open calendar"
        onClick={openPicker}
        disabled={disabled}
        className="absolute right-1 top-1/2 flex h-6 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      {/* Hidden native picker, opened by the calendar button. Mirrors the value
          only when complete so it opens on the right month. */}
      <input
        ref={pickerRef}
        type="date"
        value={ISO_DATE.test(current) ? current : ""}
        min={typeof min === "string" ? min : undefined}
        max={typeof max === "string" ? max : undefined}
        onChange={(e) => onChange?.(e)}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-2 h-0 w-0 opacity-0"
      />
    </div>
  );
}

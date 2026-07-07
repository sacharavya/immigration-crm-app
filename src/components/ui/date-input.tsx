"use client";

import { CalendarDays } from "lucide-react";
import * as React from "react";

import { maskDateValue } from "@/lib/utils/date-mask";
import { cn } from "@/lib/utils/index";

import { INPUT_BASE_CLASS } from "./input-class";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export { maskDateValue };

// A date field that accepts typed input (masked to YYYY-MM-DD) and keeps a
// calendar affordance via the browser date picker. A true drop-in for the
// native `type="date"` input: works both CONTROLLED (`value` + `onChange`) and
// UNCONTROLLED (`defaultValue` + `name`, read via FormData). The shared Input
// component routes `type="date"` here, so many forms rely on the uncontrolled
// path — without it the field silently ignores typing and calendar picks.
export function DateInput({
  className,
  value,
  defaultValue,
  onChange,
  disabled,
  min,
  max,
  placeholder,
  ...props
}: React.ComponentProps<"input">) {
  const pickerRef = React.useRef<HTMLInputElement>(null);

  // Controlled when `value` is supplied; otherwise hold internal state seeded
  // from `defaultValue`, exactly like a native input.
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(
    typeof defaultValue === "string" ? defaultValue : "",
  );
  const current = isControlled
    ? typeof value === "string"
      ? value
      : ""
    : internal;

  function emit(event: React.ChangeEvent<HTMLInputElement>, next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(event);
  }

  function handleText(event: React.ChangeEvent<HTMLInputElement>) {
    // Rewrite the live value to the masked form before the caller reads it,
    // so controlled state and this input stay in lock-step.
    const masked = maskDateValue(event.target.value);
    event.target.value = masked;
    emit(event, masked);
  }

  function handlePicker(event: React.ChangeEvent<HTMLInputElement>) {
    // Native date picker already yields a valid YYYY-MM-DD (or "").
    emit(event, event.target.value);
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
        onChange={handlePicker}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-2 h-0 w-0 opacity-0"
      />
    </div>
  );
}

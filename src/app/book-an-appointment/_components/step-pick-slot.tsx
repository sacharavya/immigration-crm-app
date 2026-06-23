"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { PublicBookingType, PublicSlot } from "./types";

function todayInTz(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function plusDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatTimeLabel(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function hourOfDay(iso: string, tz: string): number {
  const hourStr = new Date(iso).toLocaleTimeString("en-CA", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  });
  return parseInt(hourStr.split(":")[0], 10);
}

export function StepPickSlot({
  type,
  firmTimezone,
  canGoBack,
  onBack,
  onSelect,
}: {
  type: PublicBookingType;
  firmTimezone: string;
  canGoBack: boolean;
  onBack: () => void;
  onSelect: (slot: PublicSlot) => void;
}) {
  const [date, setDate] = useState<string>(() => todayInTz(firmTimezone));
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/public/slots?type_id=${encodeURIComponent(type.id)}&date=${encodeURIComponent(date)}`,
      { cache: "no-store" },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("slot_load_failed");
        return res.json() as Promise<{ slots: PublicSlot[] }>;
      })
      .then((body) => {
        if (!cancelled) setSlots(body.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load times. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type.id, date]);

  const groups = useMemo(() => {
    const morning: PublicSlot[] = [];
    const afternoon: PublicSlot[] = [];
    const evening: PublicSlot[] = [];
    for (const s of slots) {
      const h = hourOfDay(s.start_utc, firmTimezone);
      if (h < 12) morning.push(s);
      else if (h < 17) afternoon.push(s);
      else evening.push(s);
    }
    return { morning, afternoon, evening };
  }, [slots, firmTimezone]);

  const minDate = todayInTz(firmTimezone);
  const maxDate = plusDays(minDate, 60);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        {canGoBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-stone-900">{type.name}</h1>
          <p className="text-sm text-stone-600">
            Pick a date and time. All times shown in {firmTimezone.replace("_", " ")}.
          </p>
        </div>
      </header>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
          Date
        </label>
        <input
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm sm:w-56"
        />
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-stone-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Finding available times…
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-rose-700">{error}</p>
        ) : slots.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-500">
            No available times on this date. Try another day.
          </p>
        ) : (
          <div className="space-y-4">
            <SlotGroup
              label="Morning"
              slots={groups.morning}
              firmTimezone={firmTimezone}
              onSelect={onSelect}
            />
            <SlotGroup
              label="Afternoon"
              slots={groups.afternoon}
              firmTimezone={firmTimezone}
              onSelect={onSelect}
            />
            <SlotGroup
              label="Evening"
              slots={groups.evening}
              firmTimezone={firmTimezone}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SlotGroup({
  label,
  slots,
  firmTimezone,
  onSelect,
}: {
  label: string;
  slots: PublicSlot[];
  firmTimezone: string;
  onSelect: (slot: PublicSlot) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => (
          <button
            key={s.start_utc}
            type="button"
            onClick={() => onSelect(s)}
            className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-[var(--navy)] hover:bg-[var(--navy)] hover:text-white"
          >
            {formatTimeLabel(s.start_utc, firmTimezone)}
          </button>
        ))}
      </div>
    </div>
  );
}

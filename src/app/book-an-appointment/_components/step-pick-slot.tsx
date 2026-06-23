"use client";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MeetingSidebar } from "./meeting-sidebar";
import type { PublicBookingType, PublicSlot } from "./types";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function todayStr(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = d.getUTCDay();
  const diff = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWeekdayShort(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-CA", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function formatDayNum(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-CA", {
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMonthShort(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-CA", {
    month: "short",
    timeZone: "UTC",
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepPickSlot({
  type,
  firmTimezone,
  clientTimezone,
  canGoBack,
  onBack,
  onSelect,
}: {
  type: PublicBookingType;
  firmTimezone: string;
  clientTimezone: string;
  canGoBack: boolean;
  onBack: () => void;
  onSelect: (slot: PublicSlot) => void;
}) {
  // Display times in the visitor's timezone. Slot generation and
  // availability dots still use firmTimezone (slots are defined in firm
  // business hours), but the rendered labels show the visitor's local time.
  const displayTz = clientTimezone;
  const today = todayStr(firmTimezone);
  const [allSlots, setAllSlots] = useState<PublicSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [weekMon, setWeekMon] = useState<string>(() => weekStart(today));
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [calYear, setCalYear] = useState(() => parseInt(today.slice(0, 4), 10));
  const [calMonth, setCalMonth] = useState(
    () => parseInt(today.slice(5, 7), 10) - 1,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/public/slots?type_id=${encodeURIComponent(type.id)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("slot_load_failed");
        return res.json() as Promise<{ slots: PublicSlot[] }>;
      })
      .then((body) => {
        if (!cancelled) setAllSlots(body.slots ?? []);
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
  }, [type.id]);

  const datesWithSlots = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSlots) {
      set.add(
        new Date(s.start_utc).toLocaleDateString("en-CA", {
          timeZone: firmTimezone,
        }),
      );
    }
    return set;
  }, [allSlots, firmTimezone]);

  const weekDays = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < 5; i++) days.push(addDays(weekMon, i));
    return days;
  }, [weekMon]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, PublicSlot[]>();
    for (const d of weekDays) map.set(d, []);
    for (const s of allSlots) {
      const day = new Date(s.start_utc).toLocaleDateString("en-CA", {
        timeZone: firmTimezone,
      });
      if (map.has(day)) map.get(day)!.push(s);
    }
    return map;
  }, [allSlots, weekDays, firmTimezone]);

  const prevWeek = useCallback(() => {
    const newMon = addDays(weekMon, -7);
    if (newMon < today) return;
    setWeekMon(newMon);
  }, [weekMon, today]);

  const nextWeek = useCallback(
    () => setWeekMon(addDays(weekMon, 7)),
    [weekMon],
  );

  function selectDate(d: string) {
    if (d < today) return;
    setSelectedDate(d);
    setWeekMon(weekStart(d));
  }

  function prevMonth() {
    if (calMonth === 0) {
      setCalYear(calYear - 1);
      setCalMonth(11);
    } else {
      setCalMonth(calMonth - 1);
    }
  }
  function nextMonth() {
    if (calMonth === 11) {
      setCalYear(calYear + 1);
      setCalMonth(0);
    } else {
      setCalMonth(calMonth + 1);
    }
  }

  const canGoPrevWeek = addDays(weekMon, -7) >= today;

  return (
    <div className="space-y-4">
      {/* ── Back link ──────────────────────────────────────────── */}
      {canGoBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      )}

      {/* ── Two-column layout ──────────────────────────────────── */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* ── LEFT: Meeting details sidebar ─────────────────────── */}
        <MeetingSidebar type={type} />

        {/* ── RIGHT: Calendar picker ───────────────────────────── */}
        <div className="min-w-0 flex-1">
          <div className="border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-5 py-3">
              <h2 className="text-sm font-medium text-stone-700">
                Select an appointment time
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                {displayTz.replace(/_/g, " ")}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-stone-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding available times…
              </div>
            ) : error ? (
              <div className="px-5 py-8 text-sm text-rose-700">{error}</div>
            ) : (
              <div className="flex flex-col md:flex-row">
                {/* Mini calendar */}
                <div className="border-b border-stone-100 px-5 py-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r">
                  <MiniCalendar
                    year={calYear}
                    month={calMonth}
                    today={today}
                    selectedDate={selectedDate}
                    datesWithSlots={datesWithSlots}
                    onSelect={selectDate}
                    onPrevMonth={prevMonth}
                    onNextMonth={nextMonth}
                  />
                </div>

                {/* Week columns */}
                <div className="min-w-0 flex-1 px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={prevWeek}
                      disabled={!canGoPrevWeek}
                      className="rounded-md p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-medium text-stone-500">
                      {formatMonthShort(weekDays[0])} {formatDayNum(weekDays[0])}{" "}
                      – {formatMonthShort(weekDays[4])}{" "}
                      {formatDayNum(weekDays[4])}
                    </span>
                    <button
                      type="button"
                      onClick={nextWeek}
                      className="rounded-md p-1 text-stone-500 hover:bg-stone-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {weekDays.map((day) => {
                      const daySlots = slotsByDay.get(day) ?? [];
                      const isToday = day === today;
                      const isPast = day < today;
                      const isSelected = day === selectedDate;
                      return (
                        <div key={day} className="text-center">
                          <div
                            className={`mb-2 cursor-pointer px-1 py-1.5 transition-colors ${
                              isSelected
                                ? "bg-[var(--navy)] text-white"
                                : isToday
                                  ? "bg-[var(--navy)]/10 text-[var(--navy)]"
                                  : "text-stone-600 hover:bg-stone-50"
                            } ${isPast ? "opacity-40" : ""}`}
                            onClick={() => !isPast && selectDate(day)}
                          >
                            <div className="text-[10px] font-medium uppercase tracking-wider">
                              {formatWeekdayShort(day)}
                            </div>
                            <div className="text-lg font-semibold leading-tight">
                              {formatDayNum(day)}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {isPast || daySlots.length === 0 ? (
                              <span className="text-xs text-stone-300">—</span>
                            ) : (
                              daySlots.map((s) => (
                                <button
                                  key={s.start_utc}
                                  type="button"
                                  onClick={() => onSelect(s)}
                                  className="w-full rounded-md border border-stone-200 py-1.5 text-xs font-medium text-[var(--navy)] transition-colors hover:border-[var(--navy)] hover:bg-[var(--navy)] hover:text-white"
                                >
                                  {formatTime(s.start_utc, displayTz)}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini Calendar
// ---------------------------------------------------------------------------

function MiniCalendar({
  year,
  month,
  today,
  selectedDate,
  datesWithSlots,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number;
  today: string;
  selectedDate: string;
  datesWithSlots: Set<string>;
  onSelect: (d: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const totalDays = daysInMonth(year, month);
  const firstDow = (() => {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const monthLabel = new Date(year, month).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-stone-800">
          {monthLabel}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="rounded p-0.5 text-stone-400 hover:text-stone-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded p-0.5 text-stone-400 hover:text-stone-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-wider text-stone-400">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 text-center text-sm">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`e-${i}`} className="py-1" />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPast = dateStr < today;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasSlots = datesWithSlots.has(dateStr);

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(dateStr)}
              className={`relative mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors ${
                isSelected
                  ? "bg-[var(--navy)] font-semibold text-white"
                  : isToday
                    ? "font-semibold text-[var(--navy)] ring-1 ring-[var(--navy)]/30"
                    : isPast
                      ? "text-stone-300"
                      : hasSlots
                        ? "font-medium text-stone-800 hover:bg-[var(--navy)]/10"
                        : "text-stone-400"
              }`}
            >
              {day}
              {hasSlots && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--gold)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

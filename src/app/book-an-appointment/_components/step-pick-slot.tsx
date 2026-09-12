"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  MapPin,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { PublicBookingType, PublicSlot } from "./types";

// Step 2 per the design reference: a 380px details card (type summary with
// gold icons plus parsed what-to-expect bullets) beside the calendar card
// (month grid with gold availability dots, selected day solid blue, times
// as selectable rows, Continue button). Slot data flow is unchanged: slots
// come from /api/public/slots in firm-timezone business hours, and time
// labels render in the visitor's timezone.

// ---------------------------------------------------------------------------
// Date helpers (firm-timezone date strings, YYYY-MM-DD)
// ---------------------------------------------------------------------------

function todayStr(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-first column index (0..6) for a YYYY-MM-DD.
function mondayIndex(iso: string): number {
  const dow = new Date(iso + "T12:00:00Z").getUTCDay();
  return (dow + 6) % 7;
}

function fmtDayLong(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Parse the admin-authored "what to expect" text into labeled bullet
// sections. Lines ending with ":" start a section; "-" or bullet lines are
// items; anything else becomes a paragraph in the open section.
function parseExpectations(
  raw: string | null,
): Array<{ heading: string; items: string[] }> {
  if (!raw?.trim()) return [];
  const sections: Array<{ heading: string; items: string[] }> = [];
  let current: { heading: string; items: string[] } | null = null;
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (t.endsWith(":")) {
      current = { heading: t.slice(0, -1), items: [] };
      sections.push(current);
    } else {
      const item = t.replace(/^[-•*]\s*/, "");
      if (!current) {
        current = { heading: "What to expect", items: [] };
        sections.push(current);
      }
      current.items.push(item);
    }
  }
  return sections.filter((s) => s.items.length > 0);
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepPickSlot({
  type,
  firmTimezone,
  clientTimezone,
  onSelect,
}: {
  type: PublicBookingType;
  firmTimezone: string;
  clientTimezone: string;
  onSelect: (slot: PublicSlot) => void;
}) {
  const displayTz = clientTimezone;
  const today = todayStr(firmTimezone);

  const [allSlots, setAllSlots] = useState<PublicSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedSlot, setSelectedSlot] = useState<PublicSlot | null>(null);
  const [calYear, setCalYear] = useState(() => parseInt(today.slice(0, 4), 10));
  const [calMonth, setCalMonth] = useState(
    () => parseInt(today.slice(5, 7), 10) - 1,
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });
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

  const daySlots = useMemo(
    () =>
      allSlots
        .filter(
          (s) =>
            new Date(s.start_utc).toLocaleDateString("en-CA", {
              timeZone: firmTimezone,
            }) === selectedDate,
        )
        .sort((a, b) => a.start_utc.localeCompare(b.start_utc)),
    [allSlots, selectedDate, firmTimezone],
  );

  const PERIODS = [
    { key: "morning", label: "Morning", from: 0, to: 12 },
    { key: "noon", label: "Noon", from: 12, to: 17 },
    { key: "evening", label: "Evening", from: 17, to: 24 },
  ] as const;
  type PeriodKey = (typeof PERIODS)[number]["key"];
  const [period, setPeriod] = useState<PeriodKey>("morning");

  const slotsByPeriod = useMemo(() => {
    const map: Record<PeriodKey, PublicSlot[]> = {
      morning: [],
      noon: [],
      evening: [],
    };
    for (const s of daySlots) {
      const h = hourOf(s);
      const p = PERIODS.find((x) => h >= x.from && h < x.to)!;
      map[p.key].push(s);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySlots]);

  // Keep the active period useful: if it has no times for the selected
  // day, jump to the first period that does.
  useEffect(() => {
    if (slotsByPeriod[period].length > 0) return;
    const first = PERIODS.find((p) => slotsByPeriod[p.key].length > 0);
    if (first) {
      queueMicrotask(() => setPeriod(first.key));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsByPeriod]);

  const periodSlots = slotsByPeriod[period];

  function selectDate(d: string) {
    if (d < today) return;
    setSelectedDate(d);
    setSelectedSlot(null);
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

  function hourOf(s: PublicSlot): number {
    return Number(
      new Date(s.start_utc).toLocaleTimeString("en-CA", {
        timeZone: displayTz,
        hour: "2-digit",
        hour12: false,
      }).slice(0, 2),
    );
  }

  function timeLabel(s: PublicSlot): string {
    return new Date(s.start_utc).toLocaleTimeString("en-CA", {
      timeZone: displayTz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  const paid = (type.fee_cad ?? 0) > 0;
  const expectations = parseExpectations(type.preparation_notes);
  const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
  const leadBlanks = mondayIndex(monthStart);
  const totalDays = daysInMonth(calYear, calMonth);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
      {/* ── Details card ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)] sm:p-7">
        <span className="rounded-full bg-[#E9F0FC] px-2.5 py-1.5 font-[family-name:var(--font-dm-mono)] text-[10.5px] font-medium uppercase tracking-[.16em] text-[#3D6FD8]">
          {paid ? "Paid consultation" : "Free consultation"}
        </span>
        <h2 className="mt-4 text-[26px] font-extrabold tracking-[-.02em]">
          {type.name}
        </h2>
        <div className="mt-4 space-y-2.5 text-[15px] text-[#1B365D]">
          <div className="flex items-center gap-3">
            <Clock className="h-4.5 w-4.5 text-[#C9A227]" strokeWidth={1.75} />
            {type.duration_minutes} minutes
          </div>
          <div className="flex items-center gap-3">
            {type.default_location_type === "online" ? (
              <Video className="h-4.5 w-4.5 text-[#C9A227]" strokeWidth={1.75} />
            ) : (
              <MapPin className="h-4.5 w-4.5 text-[#C9A227]" strokeWidth={1.75} />
            )}
            {type.default_location_type === "online"
              ? "Online meeting"
              : "Online or in person"}
          </div>
          {paid && (
            <div className="flex items-center gap-3">
              <DollarSign className="h-4.5 w-4.5 text-[#C9A227]" strokeWidth={1.75} />
              ${type.fee_cad} CAD
            </div>
          )}
        </div>

        {type.description && (
          <>
            <div className="my-5 border-t border-[#EDF1F7]" />
            <p className="text-[15px] leading-relaxed text-[#1B365D]/90">
              {type.description}
            </p>
          </>
        )}

        {expectations.map((section) => (
          <div key={section.heading} className="mt-6">
            <div className="font-[family-name:var(--font-dm-mono)] text-[11px] font-medium uppercase tracking-[.14em] text-[#5A6A85]">
              {section.heading}
            </div>
            <ul className="mt-3 space-y-2.5">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-[15px] leading-snug text-[#1B365D]/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A227]" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Calendar card ────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-[-.01em]">
              Select an appointment time
            </h2>
            <p className="mt-0.5 text-sm text-[#5A6A85]">{displayTz}</p>
          </div>
          <span className="rounded-full bg-[#E9F0FC] px-3.5 py-1.5 text-sm font-semibold text-[#1B365D]">
            {fmtDayLong(selectedDate)}
            {selectedSlot ? ` · ${timeLabel(selectedSlot)}` : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-[#5A6A85]">
            Loading available times...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-sm text-rose-600">
            {error}
          </div>
        ) : (
          <div className="mt-6 grid gap-8 border-t border-[#EDF1F7] pt-6 md:grid-cols-[minmax(0,1fr)_260px]">
            {/* Month grid */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold tracking-[-.01em]">
                  {MONTH_LABELS[calMonth]} {calYear}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={prevMonth}
                    aria-label="Previous month"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D9E2EC] text-[#5A6A85] hover:border-[#3D6FD8] hover:text-[#3D6FD8]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Next month"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D9E2EC] text-[#5A6A85] hover:border-[#3D6FD8] hover:text-[#3D6FD8]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-[#5A6A85]">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={`${d}${i}`} className="py-1">
                    {d}
                  </span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
                {Array.from({ length: leadBlanks }).map((_, i) => (
                  <span key={`b${i}`} />
                ))}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const iso = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                  const isPast = iso < today;
                  const has = datesWithSlots.has(iso);
                  const isSelected = iso === selectedDate;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={isPast}
                      onClick={() => selectDate(iso)}
                      className={`relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-[#3D6FD8] text-white"
                          : isPast
                            ? "cursor-default text-[#B9C9F5]"
                            : has
                              ? "text-[#1B365D] hover:bg-[#E9F0FC]"
                              : "text-[#8CA0B8] hover:bg-[#F4F6F9]"
                      }`}
                    >
                      {i + 1}
                      {has && !isPast && (
                        <span
                          className={`absolute bottom-1 h-1 w-1 rounded-full ${
                            isSelected ? "bg-white" : "bg-[#C9A227]"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            <div className="flex flex-col">
              <div className="text-sm font-bold text-[#1B365D]">
                Available times · {fmtDayLong(selectedDate)}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {PERIODS.map((p) => {
                  const n = slotsByPeriod[p.key].length;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      disabled={n === 0}
                      onClick={() => {
                        setPeriod(p.key);
                        setSelectedSlot(null);
                      }}
                      className={`rounded-lg border px-2 py-2 text-center text-[13px] font-semibold transition-colors ${
                        period === p.key && n > 0
                          ? "border-[#3D6FD8] bg-[#3D6FD8] text-white"
                          : n === 0
                            ? "cursor-default border-[#EDF1F7] bg-[#F4F6F9] text-[#B9C9F5]"
                            : "border-[#D9E2EC] bg-white text-[#1B365D] hover:border-[#3D6FD8]/60"
                      }`}
                    >
                      {p.label}
                      <span
                        className={`ml-1.5 text-[11px] font-medium ${
                          period === p.key && n > 0
                            ? "text-white/75"
                            : "text-[#5A6A85]"
                        }`}
                      >
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
                {daySlots.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#5A6A85]">
                    No times available this day. Pick a day with a gold dot.
                  </p>
                ) : periodSlots.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#5A6A85]">
                    No {period} times this day. Try another period above.
                  </p>
                ) : (
                  periodSlots.map((s) => {
                    const isSel = selectedSlot?.start_utc === s.start_utc;
                    return (
                      <button
                        key={s.start_utc}
                        type="button"
                        onClick={() => setSelectedSlot(s)}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-[15px] font-semibold transition-colors ${
                          isSel
                            ? "border-[#3D6FD8] bg-[#E9F0FC] text-[#1B365D] ring-1 ring-[#3D6FD8]/40"
                            : "border-[#D9E2EC] bg-white text-[#1B365D] hover:border-[#3D6FD8]/60"
                        }`}
                      >
                        {timeLabel(s)}
                        <span className="text-xs font-medium text-[#5A6A85]">
                          {type.duration_minutes} min
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                disabled={!selectedSlot}
                onClick={() => selectedSlot && onSelect(selectedSlot)}
                className="mt-4 rounded-[10px] bg-[#3D6FD8] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(61,111,216,.7)] transition-colors hover:bg-[#2F5BC0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

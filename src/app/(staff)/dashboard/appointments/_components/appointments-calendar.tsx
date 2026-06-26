"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { AppointmentDetailDialog } from "./appointment-detail-dialog";
import type { AppointmentRow, StaffOption } from "./types";

// ---------------------------------------------------------------------------
// Type-based color palette for calendar blocks.
// Each appointment type gets a distinct color so you can tell them apart
// at a glance. Falls back to a neutral tone for unknown types.
// ---------------------------------------------------------------------------

const TYPE_COLORS: string[] = [
  "bg-[var(--navy-100)] text-[var(--navy-700)] border-[var(--navy-200)]",
  "bg-emerald-50 text-emerald-800 border-emerald-200",
  "bg-violet-50 text-violet-800 border-violet-200",
  "bg-amber-50 text-amber-800 border-amber-200",
  "bg-sky-50 text-sky-800 border-sky-200",
  "bg-rose-50 text-rose-800 border-rose-200",
  "bg-teal-50 text-teal-800 border-teal-200",
  "bg-orange-50 text-orange-800 border-orange-200",
];

function typeColor(typeId: string | undefined): string {
  if (!typeId) return "bg-stone-50 text-stone-700 border-stone-200";
  // Stable hash from the type ID so the same type always gets the same color
  let hash = 0;
  for (let i = 0; i < typeId.length; i++) {
    hash = ((hash << 5) - hash + typeId.charCodeAt(i)) | 0;
  }
  return TYPE_COLORS[Math.abs(hash) % TYPE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIRM_TZ = "America/Toronto";
const START_HOUR = 8; // 8 AM
const END_HOUR = 19; // 7 PM (last row label)
const HOUR_HEIGHT_PX = 64; // pixels per hour row
const TOTAL_HOURS = END_HOUR - START_HOUR;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: FIRM_TZ });
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun
  const diff = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** "22 Jun, 2026 Monday" */
function formatDateHeader(date: string): { dayNum: string; rest: string } {
  const d = new Date(`${date}T12:00:00Z`);
  const dayNum = d.toLocaleDateString("en-CA", {
    day: "numeric",
    timeZone: "UTC",
  });
  const rest = d.toLocaleDateString("en-CA", {
    month: "short",
    year: "numeric",
    weekday: "long",
    timeZone: "UTC",
  });
  return { dayNum, rest };
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

/** Fractional hour of day in firm tz (e.g. 9.5 = 9:30 AM) */
function hourOfDay(iso: string): number {
  const parts = new Date(iso).toLocaleTimeString("en-CA", {
    timeZone: FIRM_TZ,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [h, m] = parts.split(":").map(Number);
  return h + m / 60;
}

function dateInTz(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: FIRM_TZ });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppointmentsCalendar({
  appointments,
  staffList = [],
  nowIso,
}: {
  appointments: AppointmentRow[];
  staffList?: StaffOption[];
  nowIso?: string;
}) {
  const today = todayStr();
  const [weekMon, setWeekMon] = useState(() => weekStart(today));
  // A fixed "now" from the server keeps past/upcoming styling stable between
  // SSR and hydration.
  const nowMs = useMemo(
    () => (nowIso ? new Date(nowIso).getTime() : new Date().getTime()),
    [nowIso],
  );

  const weekDays = useMemo(() => {
    const days: string[] = [];
    // Monday to Friday only; the firm does not run weekend appointments.
    for (let i = 0; i < 5; i++) days.push(addDays(weekMon, i));
    return days;
  }, [weekMon]);

  // Bucket appointments by date
  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const d of weekDays) map.set(d, []);
    for (const appt of appointments) {
      const day = dateInTz(appt.starts_at);
      if (map.has(day)) map.get(day)!.push(appt);
    }
    return map;
  }, [appointments, weekDays]);

  const prevWeek = () => setWeekMon(addDays(weekMon, -7));
  const nextWeek = () => setWeekMon(addDays(weekMon, 7));
  const goToday = () => setWeekMon(weekStart(today));

  const weekLabel = (() => {
    const s = new Date(`${weekDays[0]}T12:00:00Z`).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const e = new Date(`${weekDays[4]}T12:00:00Z`).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    return `${s} – ${e}`;
  })();

  return (
    <div className="space-y-3">
      {/* ── Week navigation ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevWeek}
            className="rounded-md border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextWeek}
            className="rounded-md border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-md border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100"
          >
            Today
          </button>
        </div>
        <span className="text-sm font-medium text-stone-700">{weekLabel}</span>
      </div>

      {/* ── Grid ───────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-md border border-stone-200 bg-white">
        <div className="min-w-[700px]">
          {/* ── Column headers ─────────────────────────────────── */}
          <div className="grid border-b border-stone-200" style={{ gridTemplateColumns: "64px repeat(5, 1fr)" }}>
            {/* Time gutter header */}
            <div className="border-r border-stone-100 px-2 py-3" />
            {weekDays.map((day) => {
              const { dayNum, rest } = formatDateHeader(day);
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`border-r border-stone-100 px-2 py-3 text-center last:border-r-0 ${
                    isToday ? "bg-[var(--navy)]/[0.04]" : ""
                  }`}
                >
                  <div
                    className={`text-xl font-bold leading-tight ${
                      isToday ? "text-[var(--navy)]" : "text-stone-800"
                    }`}
                  >
                    {dayNum}
                  </div>
                  <div className="mt-0.5 text-[11px] text-stone-500">{rest}</div>
                </div>
              );
            })}
          </div>

          {/* ── Time grid body ─────────────────────────────────── */}
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: "64px repeat(5, 1fr)",
              height: `${TOTAL_HOURS * HOUR_HEIGHT_PX}px`,
            }}
          >
            {/* Time labels gutter */}
            <div className="relative border-r border-stone-100">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute right-2 -translate-y-1/2 text-[11px] text-stone-400"
                  style={{ top: `${i * HOUR_HEIGHT_PX}px` }}
                >
                  {formatHourLabel(START_HOUR + i)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => {
              const dayAppts = byDay.get(day) ?? [];
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`relative border-r border-stone-100 last:border-r-0 ${
                    isToday ? "bg-[var(--navy)]/[0.02]" : ""
                  }`}
                >
                  {/* Hour grid lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div
                      key={i}
                      className="absolute inset-x-0 border-t border-stone-100"
                      style={{ top: `${i * HOUR_HEIGHT_PX}px` }}
                    />
                  ))}

                  {/* Appointment blocks */}
                  {dayAppts.map((appt) => {
                    const startH = hourOfDay(appt.starts_at);
                    const endH = hourOfDay(appt.ends_at);
                    const top = (startH - START_HOUR) * HOUR_HEIGHT_PX;
                    const height = Math.max(
                      (endH - startH) * HOUR_HEIGHT_PX,
                      24,
                    );

                    // Clamp to grid bounds
                    if (startH >= END_HOUR || endH <= START_HOUR) return null;

                    // Past and cancelled events are de-emphasised so the
                    // calendar reads as a record without competing with what is
                    // still upcoming.
                    const isPast = new Date(appt.ends_at).getTime() < nowMs;
                    const isVoid =
                      appt.status === "cancelled" || appt.status === "no_show";
                    const toneClass = isVoid
                      ? "bg-muted text-muted-foreground border-border line-through opacity-70"
                      : isPast
                        ? "bg-muted text-muted-foreground border-border opacity-75"
                        : typeColor(appt.appointment_type?.id);
                    const typeName =
                      appt.appointment_type?.name ?? "Appointment";
                    const clientName = appt.snapshot_client_name;
                    const timeLabel = new Date(
                      appt.starts_at,
                    ).toLocaleTimeString("en-CA", {
                      timeZone: FIRM_TZ,
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    });

                    return (
                      <div
                        key={appt.id}
                        className="absolute inset-x-1 z-10"
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <AppointmentDetailDialog appointment={appt} staffList={staffList}>
                          <div
                            className={`h-full w-full cursor-pointer overflow-hidden rounded border px-1.5 py-1 text-left text-[11px] leading-tight transition-opacity hover:opacity-80 ${toneClass}`}
                          >
                            <div className="truncate font-semibold">
                              {clientName}
                            </div>
                            <div className="truncate">
                              {timeLabel} · {typeName}
                            </div>
                          </div>
                        </AppointmentDetailDialog>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend: what the muted treatment means. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-[var(--navy-200)] bg-[var(--navy-100)]" />
          Upcoming
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-border bg-muted opacity-75" />
          Past
        </span>
      </div>
    </div>
  );
}

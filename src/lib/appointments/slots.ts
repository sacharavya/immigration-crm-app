import { addDays, addMinutes, isAfter, isBefore, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

// Pure, deterministic open-slot generation. No I/O — takes settings + busy
// intervals, returns open slots in UTC. Heavily unit-tested (slots.test.ts).
// Timezone math goes through date-fns-tz so a slot at "09:00" means 09:00 in
// the firm's timezone, regardless of the server's local timezone.

export type HoursRange = { start: string; end: string }; // "09:00", "17:00"
export type HoursByWeekday = {
  sun?: HoursRange[];
  mon?: HoursRange[];
  tue?: HoursRange[];
  wed?: HoursRange[];
  thu?: HoursRange[];
  fri?: HoursRange[];
  sat?: HoursRange[];
};

export type SlotsInput = {
  settings: {
    hours_by_weekday: HoursByWeekday;
    slot_increment_minutes: number;
    buffer_between_appointments_minutes: number;
    minimum_lead_time_hours: number;
    maximum_horizon_days: number;
    timezone: string;
  };
  duration_minutes: number;
  busy_intervals: Array<{ start: string; end: string }>; // ISO
  now: Date; // injected for testability
};

export type Slot = {
  start_utc: string; // ISO
  end_utc: string; // ISO
};

const WEEKDAY_KEYS: Array<keyof HoursByWeekday> = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export function generateOpenSlots(input: SlotsInput): Slot[] {
  const { settings, duration_minutes, busy_intervals, now } = input;

  const earliestBookable = addMinutes(
    now,
    settings.minimum_lead_time_hours * 60,
  );
  const latestBookable = addDays(now, settings.maximum_horizon_days);

  const slots: Slot[] = [];

  // Walk day by day from today in the firm's timezone
  const nowInTz = toZonedTime(now, settings.timezone);
  let dayCursor = startOfDay(nowInTz);
  const latestInTz = toZonedTime(latestBookable, settings.timezone);

  while (!isAfter(dayCursor, latestInTz)) {
    const weekdayIdx = dayCursor.getDay();
    const weekdayKey = WEEKDAY_KEYS[weekdayIdx];
    const ranges = settings.hours_by_weekday[weekdayKey] ?? [];

    for (const range of ranges) {
      const [startH, startM] = range.start.split(":").map(Number);
      const [endH, endM] = range.end.split(":").map(Number);

      // Build start-of-range and end-of-range in the firm's timezone,
      // then convert to absolute UTC
      const rangeStartLocal = new Date(dayCursor);
      rangeStartLocal.setHours(startH, startM, 0, 0);
      const rangeEndLocal = new Date(dayCursor);
      rangeEndLocal.setHours(endH, endM, 0, 0);

      const rangeStartUtc = fromZonedTime(rangeStartLocal, settings.timezone);
      const rangeEndUtc = fromZonedTime(rangeEndLocal, settings.timezone);

      let candidateStart = rangeStartUtc;

      while (true) {
        const candidateEnd = addMinutes(candidateStart, duration_minutes);
        if (isAfter(candidateEnd, rangeEndUtc)) break;

        // Must be at or after earliest bookable time
        if (isBefore(candidateStart, earliestBookable)) {
          candidateStart = addMinutes(
            candidateStart,
            settings.slot_increment_minutes,
          );
          continue;
        }

        // Apply buffer when checking overlap with busy intervals
        const bufferedStart = addMinutes(
          candidateStart,
          -settings.buffer_between_appointments_minutes,
        );
        const bufferedEnd = addMinutes(
          candidateEnd,
          settings.buffer_between_appointments_minutes,
        );

        const overlapsBusy = busy_intervals.some((busy) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return (
            isBefore(bufferedStart, busyEnd) && isAfter(bufferedEnd, busyStart)
          );
        });

        if (!overlapsBusy) {
          slots.push({
            start_utc: candidateStart.toISOString(),
            end_utc: candidateEnd.toISOString(),
          });
        }

        candidateStart = addMinutes(
          candidateStart,
          settings.slot_increment_minutes,
        );
      }
    }

    dayCursor = addDays(dayCursor, 1);
  }

  return slots;
}

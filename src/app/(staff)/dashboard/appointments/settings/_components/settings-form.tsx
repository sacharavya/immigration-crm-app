"use client";

import { Copy, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  updateAppointmentSettings,
  type AppointmentSettingsInput,
} from "../actions";

type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const WEEKDAYS: { key: WeekdayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

// Single-range-per-day model for the UI (per the prompt's explicit escape
// hatch for v1). The DB schema still supports multi-range; a follow-up can
// expand the editor without touching the action.
type DayState = { open: boolean; start: string; end: string };

export type SettingsFormProps = {
  publicBookingUrl: string;
  initial: {
    public_booking_enabled: boolean;
    teams_auto_create: boolean;
    hours_by_weekday: Partial<Record<WeekdayKey, { start: string; end: string }[]>>;
    slot_increment_minutes: 15 | 30 | 60;
    buffer_between_appointments_minutes: number;
    minimum_lead_time_hours: number;
    maximum_horizon_days: number;
    office_address: string;
    office_arrival_instructions: string | null;
    default_online_link: string | null;
    timezone: string;
  };
};

function asDayState(
  ranges: { start: string; end: string }[] | undefined,
): DayState {
  if (!ranges || ranges.length === 0) {
    return { open: false, start: "09:00", end: "17:00" };
  }
  // Multi-range collapses to first range; a follow-up will expose ranges 2+.
  return { open: true, start: ranges[0].start, end: ranges[0].end };
}

export function SettingsForm({
  publicBookingUrl,
  initial,
}: SettingsFormProps) {
  const [enabled, setEnabled] = useState(initial.public_booking_enabled);
  const [days, setDays] = useState<Record<WeekdayKey, DayState>>(() => ({
    mon: asDayState(initial.hours_by_weekday.mon),
    tue: asDayState(initial.hours_by_weekday.tue),
    wed: asDayState(initial.hours_by_weekday.wed),
    thu: asDayState(initial.hours_by_weekday.thu),
    fri: asDayState(initial.hours_by_weekday.fri),
    sat: asDayState(initial.hours_by_weekday.sat),
    sun: asDayState(initial.hours_by_weekday.sun),
  }));
  const [increment, setIncrement] = useState<15 | 30 | 60>(
    initial.slot_increment_minutes,
  );
  const [buffer, setBuffer] = useState(
    initial.buffer_between_appointments_minutes,
  );
  const [leadHours, setLeadHours] = useState(initial.minimum_lead_time_hours);
  const [horizonDays, setHorizonDays] = useState(initial.maximum_horizon_days);
  const [officeAddress, setOfficeAddress] = useState(initial.office_address);
  const [arrivalInstructions, setArrivalInstructions] = useState(
    initial.office_arrival_instructions ?? "",
  );
  const [defaultOnlineLink, setDefaultOnlineLink] = useState(
    initial.default_online_link ?? "",
  );
  const [teamsAutoCreate, setTeamsAutoCreate] = useState(
    initial.teams_auto_create,
  );

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  function updateDay(key: WeekdayKey, patch: Partial<DayState>) {
    setDays((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  function submit() {
    setError(null);
    setSuccess(false);

    // Per-day validation: open days need start < end.
    for (const wd of WEEKDAYS) {
      const d = days[wd.key];
      if (d.open && !(d.start < d.end)) {
        setError(`${wd.label}: start time must be before end time.`);
        return;
      }
    }

    const hours_by_weekday: AppointmentSettingsInput["hours_by_weekday"] = {};
    for (const wd of WEEKDAYS) {
      const d = days[wd.key];
      if (d.open) hours_by_weekday[wd.key] = [{ start: d.start, end: d.end }];
    }

    const payload: AppointmentSettingsInput = {
      public_booking_enabled: enabled,
      teams_auto_create: teamsAutoCreate,
      hours_by_weekday,
      slot_increment_minutes: increment,
      buffer_between_appointments_minutes: buffer,
      minimum_lead_time_hours: leadHours,
      maximum_horizon_days: horizonDays,
      office_address: officeAddress.trim(),
      office_arrival_instructions: arrivalInstructions.trim() || null,
      default_online_link: defaultOnlineLink.trim() || null,
    };

    startTransition(async () => {
      const result = await updateAppointmentSettings(payload);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicBookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard permission — fall through silently; the URL is already
      // shown so users can copy manually.
    }
  }

  return (
    <div className="space-y-5">
      {/* Public booking */}
      <Section
        title="Public booking"
        description="When enabled, anyone with the link can see your public appointment types and book a time."
      >
        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-stone-300"
          />
          <span className="font-medium">Enable public booking page</span>
        </label>
        <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Public booking URL
          </div>
          <div className="mt-1 flex items-center gap-2">
            <code className="break-all text-[13px] text-stone-700">
              {publicBookingUrl}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyLink}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-amber-700">
          ⚠ Make sure you have at least one public appointment type and
          business hours configured before turning this on.
        </p>

        <div className="border-t border-stone-200 pt-3">
          <label className="flex items-start gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={teamsAutoCreate}
              onChange={(e) => setTeamsAutoCreate(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-300"
            />
            <span>
              <span className="font-medium">Auto-create Microsoft Teams meetings</span>
              <span className="block text-xs text-stone-500">
                When checked, new <strong>online</strong> appointments get a
                Teams meeting attached automatically. Staff can still override
                with a manual Zoom/Meet link per appointment. Requires the
                Azure <code className="font-mono text-[11px]">OnlineMeetings.ReadWrite.All</code> Application
                permission to be granted; if missing, appointments still get
                created — just without Teams.
              </span>
            </span>
          </label>
        </div>
      </Section>

      {/* Business hours */}
      <Section
        title="Business hours"
        description={`Slots only appear within these hours. Time zone: ${initial.timezone}.`}
      >
        <ul className="space-y-2">
          {WEEKDAYS.map(({ key, label }) => {
            const d = days[key];
            return (
              <li
                key={key}
                className="flex flex-wrap items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-2"
              >
                <label className="flex w-28 items-center gap-2 text-sm font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={d.open}
                    onChange={(e) => updateDay(key, { open: e.target.checked })}
                    className="h-4 w-4 rounded border-stone-300"
                  />
                  {label}
                </label>
                {d.open ? (
                  <>
                    <Input
                      type="time"
                      value={d.start}
                      onChange={(e) => updateDay(key, { start: e.target.value })}
                      className="w-32"
                    />
                    <span className="text-stone-400">to</span>
                    <Input
                      type="time"
                      value={d.end}
                      onChange={(e) => updateDay(key, { end: e.target.value })}
                      className="w-32"
                    />
                  </>
                ) : (
                  <span className="text-sm text-stone-500">Closed</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-stone-500">
          Single range per day for now. Multi-range support (e.g. lunch
          breaks) ships in a follow-up.
        </p>
      </Section>

      {/* Booking rules */}
      <Section
        title="Booking rules"
        description="Fine-grained controls over how slots are generated and offered."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slot length (minutes)">
            <select
              value={increment}
              onChange={(e) =>
                setIncrement(parseInt(e.target.value, 10) as 15 | 30 | 60)
              }
              className="h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </Field>
          <Field label="Buffer between appointments (minutes)">
            <Input
              type="number"
              min={0}
              max={120}
              value={buffer}
              onChange={(e) => setBuffer(parseInt(e.target.value || "0", 10))}
            />
          </Field>
          <Field label="Minimum notice (hours)">
            <Input
              type="number"
              min={0}
              max={168}
              value={leadHours}
              onChange={(e) =>
                setLeadHours(parseInt(e.target.value || "0", 10))
              }
            />
          </Field>
          <Field label="Booking horizon (days)">
            <Input
              type="number"
              min={1}
              max={365}
              value={horizonDays}
              onChange={(e) =>
                setHorizonDays(parseInt(e.target.value || "0", 10))
              }
            />
          </Field>
        </div>
      </Section>

      {/* Locations */}
      <Section
        title="Locations"
        description="The defaults staff and prospects see for online vs. onsite appointments."
      >
        <Field label="Office address">
          <Input
            value={officeAddress}
            onChange={(e) => setOfficeAddress(e.target.value)}
          />
        </Field>
        <Field
          label="Arrival instructions (optional)"
          helper="Shown to onsite attendees in confirmation emails."
        >
          <textarea
            value={arrivalInstructions}
            onChange={(e) => setArrivalInstructions(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field
          label="Default online meeting link (optional)"
          helper="Used when no per-appointment link is set. Staff can override per appointment."
        >
          <Input
            type="url"
            value={defaultOnlineLink}
            onChange={(e) => setDefaultOnlineLink(e.target.value)}
            placeholder="https://teams.microsoft.com/l/..."
          />
        </Field>
      </Section>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Settings saved.
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-stone-500">{description}</p>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </Label>
      {helper && (
        <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
          {helper}
        </p>
      )}
      <div className="mt-1">{children}</div>
    </div>
  );
}

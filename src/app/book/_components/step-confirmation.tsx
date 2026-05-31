"use client";

import { CalendarCheck, MapPin, Video } from "lucide-react";

import type {
  BookingResult,
  PublicBookingType,
  PublicSlot,
} from "./types";

function formatSlot(iso: string, tz: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function StepConfirmation({
  result,
  type,
  slot,
  firmTimezone,
  officeAddress,
  onPickAnotherSlot,
  onEditDetails,
}: {
  result: BookingResult;
  type: PublicBookingType;
  slot: PublicSlot;
  firmTimezone: string;
  officeAddress: string;
  onPickAnotherSlot: () => void;
  onEditDetails: () => void;
}) {
  if (result.ok === false) {
    return (
      <ErrorView
        result={result}
        onPickAnotherSlot={onPickAnotherSlot}
        onEditDetails={onEditDetails}
        firmTimezone={firmTimezone}
      />
    );
  }

  const manageHref = `/book/manage/${result.management_token}`;

  return (
    <div className="space-y-5 rounded-md border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <CalendarCheck className="mt-1 h-6 w-6 text-emerald-600" />
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            You&apos;re booked!
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            A confirmation email is on its way to the address you provided.
          </p>
        </div>
      </div>

      <div className="space-y-1 rounded-md border border-stone-200 bg-stone-50 p-4">
        <div className="text-base font-semibold text-stone-900">
          {type.name}
        </div>
        <div className="text-sm text-stone-700">
          {formatSlot(slot.start_utc, firmTimezone)}
        </div>
        <div className="text-xs text-stone-500">
          {result.duration_minutes} minutes
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-stone-700">
          {result.location_type === "online" ? (
            <>
              <Video className="h-4 w-4 text-stone-500" />
              <span>
                Online — meeting link will be sent in your confirmation email.
              </span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-stone-500" />
              <span>{result.onsite_address ?? officeAddress}</span>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-stone-100 pt-4 text-sm">
        <p className="text-stone-600">Need to make changes?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={manageHref}
            className="inline-flex items-center rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            Manage appointment
          </a>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Bookmark this link or wait for the confirmation email — it lets you
          reschedule or cancel without signing in.
        </p>
      </div>
    </div>
  );
}

function ErrorView({
  result,
  onPickAnotherSlot,
  onEditDetails,
  firmTimezone,
}: {
  result: Extract<BookingResult, { ok: false }>;
  onPickAnotherSlot: () => void;
  onEditDetails: () => void;
  firmTimezone: string;
}) {
  const { error } = result;

  let title = "Something went wrong";
  let body: React.ReactNode = null;
  let action: React.ReactNode = (
    <button
      type="button"
      onClick={onEditDetails}
      className="inline-flex items-center rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
    >
      Try again
    </button>
  );

  if (error === "slot_taken") {
    title = "Sorry, that time was just taken";
    body = (
      <p>
        Please pick another available slot. Times update in real time as other
        appointments come in.
      </p>
    );
    action = (
      <button
        type="button"
        onClick={onPickAnotherSlot}
        className="inline-flex items-center rounded-md bg-[var(--navy)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--navy)]/90"
      >
        Back to slot picker
      </button>
    );
  } else if (error === "rate_limited") {
    title = "Too many booking attempts";
    body = (
      <p>
        You&apos;ve reached the maximum booking attempts for this hour. Please
        try again later or contact us directly.
      </p>
    );
  } else if (error === "existing_appointment") {
    title = "You already have an upcoming appointment";
    const when = result.existing_date
      ? new Date(result.existing_date).toLocaleString("en-CA", {
          timeZone: firmTimezone,
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : null;
    body = (
      <p>
        We have you down for {when ?? "an upcoming meeting"}. Use the link in
        your confirmation email to reschedule or cancel.
      </p>
    );
  } else if (error === "too_soon" || error === "too_far") {
    title = "That time isn’t bookable";
    body = (
      <p>
        Please pick a time within our normal booking window.
      </p>
    );
    action = (
      <button
        type="button"
        onClick={onPickAnotherSlot}
        className="inline-flex items-center rounded-md bg-[var(--navy)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--navy)]/90"
      >
        Pick another time
      </button>
    );
  } else if (error === "booking_disabled") {
    title = "Online booking is currently unavailable";
    body = (
      <p>
        Please contact us directly at{" "}
        <a
          className="text-[var(--navy)] underline-offset-2 hover:underline"
          href="mailto:info@bigbangimmigration.com"
        >
          info@bigbangimmigration.com
        </a>{" "}
        to schedule.
      </p>
    );
    action = null;
  } else {
    body = <p>Please try again. If this keeps happening, contact us.</p>;
  }

  return (
    <div className="space-y-4 rounded-md border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
      <div className="text-sm text-stone-700">{body}</div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

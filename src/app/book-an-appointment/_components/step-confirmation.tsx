"use client";

import { CalendarCheck, MapPin, Video } from "lucide-react";

import { MeetingSidebar } from "./meeting-sidebar";
import { PaymentUploadCard } from "./payment-upload-card";
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
  clientTimezone,
  officeAddress,
  onPickAnotherSlot,
  onEditDetails,
}: {
  result: BookingResult;
  type: PublicBookingType;
  slot: PublicSlot;
  clientTimezone: string;
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
        clientTimezone={clientTimezone}
      />
    );
  }

  // APPT-8: paid bookings land here in pending_payment with payment_required
  // = true. The shared PaymentUploadCard renders the e-transfer instructions +
  // upload form.
  if (result.payment_required && result.fee_cad !== null) {
    return (
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <MeetingSidebar
          type={type}
          slot={slot}
          clientTimezone={clientTimezone}
        />
        <div className="min-w-0 flex-1">
          <PaymentUploadCard
            token={result.management_token}
            typeName={type.name}
            dateDisplay={new Date(slot.start_utc).toLocaleDateString("en-CA", {
              timeZone: clientTimezone,
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            timeDisplay={new Date(slot.start_utc).toLocaleTimeString("en-CA", {
              timeZone: clientTimezone,
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
            durationMinutes={result.duration_minutes}
            feeCad={result.fee_cad}
            referenceCode={result.appointment_short_id}
            signUrl={result.consultation_sign_url}
          />
        </div>
      </div>
    );
  }

  const manageHref = `/book-an-appointment/manage/${result.management_token}`;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <MeetingSidebar
        type={type}
        slot={slot}
        clientTimezone={clientTimezone}
      />
      <div className="min-w-0 flex-1">
        {result.consultation_sign_url && (
          <div className="mb-4 border border-[#0D4231]/30 bg-[#0D4231]/5 p-4">
            <p className="text-sm font-semibold text-stone-900">
              One more step — sign your consultation agreement
            </p>
            <p className="mt-0.5 text-xs text-stone-600">
              We&apos;ve also emailed you this link in case you&apos;d like to
              sign later.
            </p>
            <a
              href={result.consultation_sign_url}
              className="mt-2 inline-flex h-9 items-center bg-[#0D4231] px-4 text-sm font-medium text-white hover:bg-[var(--navy-light)]"
            >
              Sign now
            </a>
          </div>
        )}
        <div className="border border-[#D9E2EC] bg-white p-6">
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

          <div className="mt-5 space-y-1 border border-[#D9E2EC] bg-[#F4F6F9] p-4">
            <div className="text-base font-semibold text-stone-900">
              {type.name}
            </div>
            <div className="text-sm text-stone-700">
              {formatSlot(slot.start_utc, clientTimezone)}
            </div>
            <div className="text-xs text-stone-500">
              {result.duration_minutes} minutes
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-stone-700">
              {result.location_type === "online" ? (
                <>
                  <Video className="h-4 w-4 text-stone-500" />
                  <span>
                    Online — meeting link will be sent in your confirmation
                    email.
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

          <div className="mt-5 border-t border-[#EDF1F7] pt-4 text-sm">
            <p className="text-stone-600">Need to make changes?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={manageHref}
                className="inline-flex items-center border border-[#D9E2EC] bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                Manage appointment
              </a>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Bookmark this link or wait for the confirmation email — it lets
              you reschedule or cancel without signing in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorView({
  result,
  onPickAnotherSlot,
  onEditDetails,
  clientTimezone,
}: {
  result: Extract<BookingResult, { ok: false }>;
  onPickAnotherSlot: () => void;
  onEditDetails: () => void;
  clientTimezone: string;
}) {
  const { error } = result;

  let title = "Something went wrong";
  let body: React.ReactNode = null;
  let action: React.ReactNode = (
    <button
      type="button"
      onClick={onEditDetails}
      className="inline-flex items-center border border-[#D9E2EC] bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
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
        className="inline-flex items-center bg-[#0D4231] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--navy-light)]"
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
          timeZone: clientTimezone,
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
    title = "That time isn't bookable";
    body = <p>Please pick a time within our normal booking window.</p>;
    action = (
      <button
        type="button"
        onClick={onPickAnotherSlot}
        className="inline-flex items-center bg-[#0D4231] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--navy-light)]"
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
          className="text-[#0D4231] underline-offset-2 hover:underline"
          href="mailto:info@genzdatalabs.com"
        >
          info@genzdatalabs.com
        </a>{" "}
        to schedule.
      </p>
    );
    action = null;
  } else {
    body = <p>Please try again. If this keeps happening, contact us.</p>;
  }

  return (
    <div className="border border-[#D9E2EC] bg-white p-6">
      <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
      <div className="mt-3 text-sm text-stone-700">{body}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Rendered when `appointment_settings.public_booking_enabled` is false OR
// no `is_public` types exist. Returned by the page server component; the
// page itself stays 200 (better UX than a blanket 404, and lets the firm
// drop the URL in marketing copy without breaking it during the off state).

const DEFAULT_MESSAGE =
  "Online booking is temporarily unavailable. Please contact us directly to schedule an appointment.";

export function BookingDisabled({ message }: { message?: string } = {}) {
  return (
    <div className="border border-[#D9E2EC] bg-white px-6 py-12 text-center">
      <h1 className="text-xl font-semibold text-stone-900">
        Booking is currently unavailable
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-stone-600">
        {message ?? DEFAULT_MESSAGE}
      </p>
      <div className="mx-auto mt-6 inline-flex flex-col items-center gap-1 text-sm">
        <a
          href="mailto:info@genzdatalabs.com"
          className="text-[#0D4231] underline-offset-2 hover:underline"
        >
          info@genzdatalabs.com
        </a>
        <a
          href="tel:+14163865351"
          className="text-[#0D4231] underline-offset-2 hover:underline"
        >
          +1 416-386-5351
        </a>
      </div>
    </div>
  );
}

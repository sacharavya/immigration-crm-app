import { getBaseUrl } from "@/lib/email/url";
import { adminClient } from "@/lib/supabase/admin";


import { PaymentUploadCard } from "../../_components/payment-upload-card";

import { ManageAppointment } from "./_components/manage-appointment";

export const dynamic = "force-dynamic";


const TOKEN_RE = /^[0-9a-f]{64}$/i;

export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return <TokenInvalid />;

  const supabase = adminClient();

  const { data: appt } = await supabase
    .schema("crm")
    .from("appointments")
    .select(
      `
        id, starts_at, ends_at, timezone, location_type, online_link,
        onsite_address, status, reason, management_token_expires_at,
        appointment_type_id, fee_cad_at_booking,
        consultation_agreement_token, consultation_agreement_signed_at,
        appointment_type:appointment_types!appointments_appointment_type_id_fkey(
          name, duration_minutes
        )
      `,
    )
    .eq("management_token", token)
    .is("deleted_at", null)
    .maybeSingle();

  if (!appt) return <TokenInvalid />;

  // If this booking still needs the consultation agreement signed, the sign
  // link surfaces after payment and on the awaiting-review screen so it is
  // never missed.
  const consultationSignUrl =
    appt.consultation_agreement_token && !appt.consultation_agreement_signed_at
      ? `${await getBaseUrl()}/sign/consultation/${appt.consultation_agreement_token}`
      : null;

  const now = new Date();
  if (
    appt.management_token_expires_at &&
    new Date(appt.management_token_expires_at) < now
  ) {
    return <TokenExpired />;
  }

  // APPT-8: pending_payment routes to the upload UI (same component as the
  // booking-confirmation step). awaiting_review shows a "we're verifying"
  // holding screen. confirmed is the usual reschedule/cancel flow.
  if (appt.status === "pending_payment") {
    const fee = Number(appt.fee_cad_at_booking ?? 0);
    if (fee <= 0) {
      // Defensive: pending_payment with no fee snapshot is a bug; fall back
      // to the "not active" rendering rather than a busted upload UI.
      return <AppointmentNotActive status={appt.status} />;
    }
    const dateDisplay = new Date(appt.starts_at).toLocaleDateString("en-CA", {
      timeZone: appt.timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timeDisplay = new Date(appt.starts_at).toLocaleTimeString("en-CA", {
      timeZone: appt.timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return (
      <PaymentUploadCard
        token={token}
        typeName={appt.appointment_type?.name ?? "Consultation"}
        dateDisplay={dateDisplay}
        timeDisplay={timeDisplay}
        durationMinutes={appt.appointment_type?.duration_minutes ?? 30}
        feeCad={fee}
        referenceCode={appt.id.slice(0, 8)}
        signUrl={consultationSignUrl}
      />
    );
  }

  if (appt.status === "awaiting_review") {
    return <AwaitingReview signUrl={consultationSignUrl} />;
  }

  if (appt.status !== "confirmed") {
    return <AppointmentNotActive status={appt.status} />;
  }

  return (
    <ManageAppointment
      token={token}
      appointment={{
        id: appt.id,
        starts_at: appt.starts_at,
        ends_at: appt.ends_at,
        timezone: appt.timezone,
        location_type: appt.location_type as "online" | "onsite",
        online_link: appt.online_link,
        onsite_address: appt.onsite_address,
        appointment_type_id: appt.appointment_type_id,
        type_name: appt.appointment_type?.name ?? "Appointment",
        duration_minutes: appt.appointment_type?.duration_minutes ?? 30,
      }}
    />
  );
}

function AwaitingReview({ signUrl }: { signUrl: string | null }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white px-6 py-12 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-stone-900">
        We have your payment proof
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-stone-600">
        Our team is reviewing it now and will confirm your appointment by email
        as soon as it&apos;s verified.
      </p>
      {signUrl && (
        <div className="mx-auto mt-5 max-w-md border-t border-stone-100 pt-5">
          <p className="text-sm font-semibold text-stone-900">
            One more step — sign your consultation agreement
          </p>
          <a
            href={signUrl}
            className="mt-2 inline-flex h-9 items-center bg-[var(--navy)] px-4 text-sm font-medium text-white hover:bg-[var(--navy)]/90"
          >
            Sign now
          </a>
        </div>
      )}
    </div>
  );
}

function TokenInvalid() {
  return (
    <div className="rounded-md border border-stone-200 bg-white px-6 py-12 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-stone-900">
        Link not found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-stone-600">
        This management link is invalid or no longer active. Check the link in
        your most recent confirmation email, or contact us directly.
      </p>
      <a
        href="mailto:info@genzdatalabs.com"
        className="mt-4 inline-block text-sm text-[var(--navy)] underline-offset-2 hover:underline"
      >
        info@genzdatalabs.com
      </a>
    </div>
  );
}

function TokenExpired() {
  return (
    <div className="rounded-md border border-stone-200 bg-white px-6 py-12 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-stone-900">Link expired</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-stone-600">
        Self-service rescheduling is available up to 24 hours after the
        appointment time. Please email us to make changes.
      </p>
      <a
        href="mailto:info@genzdatalabs.com"
        className="mt-4 inline-block text-sm text-[var(--navy)] underline-offset-2 hover:underline"
      >
        info@genzdatalabs.com
      </a>
    </div>
  );
}

function AppointmentNotActive({ status }: { status: string }) {
  const isCancelled = status === "cancelled";
  return (
    <div className="rounded-md border border-stone-200 bg-white px-6 py-12 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-stone-900">
        {isCancelled
          ? "This appointment was cancelled"
          : "This appointment is no longer active"}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-stone-600">
        {isCancelled
          ? "If you need to book again, head back to our booking page."
          : "No further changes can be made online. Please contact us if you have questions."}
      </p>
      <a
        href="/book-an-appointment"
        className="mt-4 inline-block text-sm text-[var(--navy)] underline-offset-2 hover:underline"
      >
        Back to booking
      </a>
    </div>
  );
}

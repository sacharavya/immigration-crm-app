import { CalendarDays, MapPin, Video } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

import { AppointmentDetailDialog } from "./appointment-detail-dialog";
import type { AppointmentRow } from "./types";

function formatShort(iso: string, timezone: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Shared card used in the case sidebar, client sidebar, and dashboard
// widget. Scope-bounded: the caller passes the already-filtered
// appointments (e.g., next 3 for a case, next 5 for the dashboard).
export function UpcomingAppointmentsCard({
  title,
  appointments,
  viewAllHref,
}: {
  title: string;
  appointments: AppointmentRow[];
  viewAllHref?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700">
            <CalendarDays className="h-4 w-4 text-stone-500" />
            {title}
          </h3>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs text-[var(--navy)] underline-offset-2 hover:underline"
            >
              View all
            </Link>
          )}
        </div>

        {appointments.length === 0 ? (
          <p className="text-xs text-stone-500">No upcoming appointments.</p>
        ) : (
          <ul className="space-y-2">
            {appointments.map((a) => (
              <li
                key={a.id}
                className="rounded-md border border-stone-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900">
                      {formatShort(a.starts_at, a.timezone)}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-600">
                      {a.appointment_type?.name ?? "Appointment"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500">
                      {a.location_type === "online" ? (
                        <Video className="h-3 w-3" />
                      ) : (
                        <MapPin className="h-3 w-3" />
                      )}
                      <span className="truncate">
                        {a.location_type === "online"
                          ? "Online"
                          : (a.onsite_address ?? "Onsite")}
                      </span>
                    </div>
                  </div>
                  <AppointmentDetailDialog appointment={a} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

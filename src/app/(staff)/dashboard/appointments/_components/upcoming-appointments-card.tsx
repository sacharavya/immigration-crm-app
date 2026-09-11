import { CalendarDays, MapPin, Video } from "lucide-react";
import Link from "next/link";

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
// Anatomy mirrors MyTasks so the dashboard widgets read as one family:
// bordered header with count, centered empty state, divided rows, footer.
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
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays
            aria-hidden
            className="h-4 w-4 text-muted-foreground"
          />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {appointments.length}
        </span>
      </header>

      {appointments.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">
            No upcoming appointments
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Booked appointments will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {appointments.map((a) => (
            <li key={a.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {formatShort(a.starts_at, a.timezone)}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {a.appointment_type?.name ?? "Appointment"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
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

      {viewAllHref && (
        <footer className="border-t border-border px-4 py-2.5 text-right">
          <Link
            href={viewAllHref}
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </footer>
      )}
    </div>
  );
}

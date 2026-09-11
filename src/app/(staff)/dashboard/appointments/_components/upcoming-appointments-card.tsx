import { CalendarDays, MapPin, Video } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/index";

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

// "Today" / "Tomorrow" relative to the appointment's own timezone.
function dayChip(iso: string, timezone: string): "Today" | "Tomorrow" | null {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone: timezone });
  const target = fmt(new Date(iso));
  const now = new Date();
  if (target === fmt(now)) return "Today";
  if (target === fmt(new Date(now.getTime() + 86_400_000))) return "Tomorrow";
  return null;
}

// Shared card used in the case sidebar, client sidebar, and dashboard.
// Anatomy mirrors MyTasks so the widgets read as one family. `prominent`
// is the dashboard treatment: navy header band, bigger rows, and loud
// Today / Tomorrow chips, because staff kept missing appointments in the
// quiet sidebar version.
export function UpcomingAppointmentsCard({
  title,
  appointments,
  viewAllHref,
  prominent = false,
}: {
  title: string;
  appointments: AppointmentRow[];
  viewAllHref?: string;
  prominent?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-card",
        prominent
          ? "border-2 border-[var(--navy)]/40 shadow-sm"
          : "border border-border",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between px-4 py-3",
          prominent ? "bg-[var(--navy)] text-white" : "border-b border-border",
        )}
      >
        <div className="flex items-center gap-2">
          <CalendarDays
            aria-hidden
            className={cn(
              "h-4 w-4",
              prominent ? "text-white/80" : "text-muted-foreground",
            )}
          />
          <h2
            className={cn(
              "text-sm font-semibold tracking-tight",
              prominent ? "text-white" : "text-foreground",
            )}
          >
            {title}
          </h2>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
            prominent
              ? "bg-white/15 text-white"
              : "bg-muted text-muted-foreground",
          )}
        >
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
          {appointments.map((a) => {
            const chip = dayChip(a.starts_at, a.timezone);
            return (
              <li
                key={a.id}
                className={cn("px-4", prominent ? "py-3.5" : "py-3")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-2 font-medium text-foreground",
                        prominent ? "text-base" : "text-sm",
                      )}
                    >
                      {formatShort(a.starts_at, a.timezone)}
                      {prominent && chip && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                            chip === "Today"
                              ? "bg-[color:var(--destructive)] text-[color:var(--destructive-foreground)]"
                              : "bg-amber-100 text-amber-800",
                          )}
                        >
                          {chip}
                        </span>
                      )}
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
            );
          })}
        </ul>
      )}

      {viewAllHref && (
        <footer
          className={cn(
            "border-t border-border px-4 py-2.5 text-right",
            prominent && "bg-[var(--navy)]/5",
          )}
        >
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

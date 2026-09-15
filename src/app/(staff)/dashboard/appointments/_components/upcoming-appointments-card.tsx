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

function datePart(
  iso: string,
  timezone: string,
  opts: Intl.DateTimeFormatOptions,
): string {
  return new Date(iso).toLocaleString("en-CA", { timeZone: timezone, ...opts });
}

// Shared card used in the case sidebar, client sidebar, and dashboard.
// Anatomy mirrors MyTasks so the widgets read as one family. `prominent`
// is the dashboard treatment. It used to be a solid navy band; that single
// block dominated the page and fought every other surface. Prominence now
// comes from a pale accent wash, a mint edge, and heavier type — the card
// still leads, without a saturated slab doing the work.
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
        "overflow-hidden rounded-[var(--radius)] bg-card shadow-sm",
        prominent
          ? "border border-[var(--border-secondary)] border-l-2 border-l-[var(--gold)]"
          : "border border-border",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between px-5 py-3.5",
          prominent
            ? "border-b border-border bg-[var(--accent)]"
            : "border-b border-border",
        )}
      >
        <div className="flex items-center gap-2">
          <CalendarDays
            aria-hidden
            className={cn(
              "h-4 w-4",
              prominent ? "text-[var(--primary)]" : "text-muted-foreground",
            )}
          />
          <h2
            className={cn(
              "text-sm font-semibold tracking-tight",
              prominent ? "text-foreground" : "text-foreground",
            )}
          >
            {title}
          </h2>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
            prominent
              ? "bg-[var(--primary)]/10 text-[var(--primary)]"
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
            if (!prominent) {
              return (
                <li key={a.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {formatShort(a.starts_at, a.timezone)}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-foreground">
                        {a.snapshot_client_name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {a.appointment_type?.name ?? "Appointment"}
                        {" · "}
                        {a.location_type === "online"
                          ? "Online"
                          : (a.onsite_address ?? "Onsite")}
                      </div>
                    </div>
                    <AppointmentDetailDialog appointment={a} />
                  </div>
                </li>
              );
            }
            return (
              <li key={a.id} className="px-4 py-3.5">
                <div className="flex items-start gap-3.5">
                  {/* Date tile, tinted by urgency. */}
                  <div
                    className={cn(
                      "flex w-14 shrink-0 flex-col items-center rounded-lg border py-1.5",
                      chip === "Today"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : chip === "Tomorrow"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-stone-200 bg-[var(--navy)]/5 text-[var(--navy)]",
                    )}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      {datePart(a.starts_at, a.timezone, { month: "short" })}
                    </span>
                    <span className="text-xl font-bold leading-6 tabular-nums">
                      {datePart(a.starts_at, a.timezone, { day: "numeric" })}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                      {datePart(a.starts_at, a.timezone, { weekday: "short" })}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {datePart(a.starts_at, a.timezone, {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                      {chip && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            chip === "Today"
                              ? "bg-[color:var(--destructive)] text-[color:var(--destructive-foreground)]"
                              : "bg-amber-100 text-amber-800",
                          )}
                        >
                          {chip}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium text-foreground">
                      {a.snapshot_client_name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      {a.location_type === "online" ? (
                        <Video className="h-3 w-3 shrink-0" />
                      ) : (
                        <MapPin className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">
                        {a.appointment_type?.name ?? "Appointment"}
                        {" · "}
                        {a.location_type === "online"
                          ? "Online"
                          : (a.onsite_address ?? "Onsite")}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                      <a
                        href={`mailto:${a.snapshot_client_email}`}
                        className="truncate hover:text-[var(--navy)] hover:underline"
                      >
                        {a.snapshot_client_email}
                      </a>
                      {a.snapshot_client_phone && (
                        <a
                          href={`tel:${a.snapshot_client_phone}`}
                          className="hover:text-[var(--navy)] hover:underline"
                        >
                          {a.snapshot_client_phone}
                        </a>
                      )}
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

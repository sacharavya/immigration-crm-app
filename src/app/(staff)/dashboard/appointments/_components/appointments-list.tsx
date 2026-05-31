"use client";

import { CalendarCheck2, MapPin, Video, AlertTriangle } from "lucide-react";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { AppointmentDetailDialog } from "./appointment-detail-dialog";
import { STATUS_LABEL, STATUS_TONE, type AppointmentRow } from "./types";

function formatStarts(iso: string, timezone: string): string {
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

function durationMinutes(starts: string, ends: string): number {
  return Math.round(
    (new Date(ends).getTime() - new Date(starts).getTime()) / 60000,
  );
}

function clientLabel(row: AppointmentRow): string {
  if (row.client) {
    const given = row.client.given_names ?? "";
    const family = row.client.family_name ?? "";
    return `${given} ${family}`.trim() || row.snapshot_client_name;
  }
  return row.snapshot_client_name;
}

function staffLabel(row: AppointmentRow): string {
  if (!row.assigned_staff) return "Unassigned";
  return `${row.assigned_staff.first_name} ${row.assigned_staff.last_name}`.trim();
}

export function AppointmentsList({
  appointments,
}: {
  appointments: AppointmentRow[];
}) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-stone-200 bg-stone-50 px-6 py-12 text-center text-sm text-stone-500">
        No appointments in this range. Adjust the filters above or create a new
        appointment.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Case</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap">
                <div className="text-sm text-stone-900">
                  {formatStarts(row.starts_at, row.timezone)}
                </div>
                <div className="text-xs text-stone-500">
                  {durationMinutes(row.starts_at, row.ends_at)} min
                </div>
              </TableCell>
              <TableCell className="text-sm text-stone-700">
                {row.appointment_type?.name ?? "—"}
              </TableCell>
              <TableCell className="text-sm">
                {row.client ? (
                  <Link
                    href={`/dashboard/clients/${row.client.id}`}
                    className="text-[var(--navy)] underline-offset-2 hover:underline"
                  >
                    {clientLabel(row)}
                  </Link>
                ) : (
                  <span className="text-stone-700">{clientLabel(row)}</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {row.case ? (
                  <Link
                    href={`/dashboard/cases/${row.case.id}`}
                    className="font-mono text-xs text-[var(--navy)] underline-offset-2 hover:underline"
                  >
                    {row.case.case_number}
                  </Link>
                ) : (
                  <span className="text-xs text-stone-400">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-stone-700">
                <span className="inline-flex items-center gap-1">
                  {row.location_type === "online" ? (
                    <Video className="h-3.5 w-3.5 text-stone-500" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 text-stone-500" />
                  )}
                  <span className="max-w-[12rem] truncate text-xs">
                    {row.location_type === "online"
                      ? (row.online_link ?? "Online")
                      : (row.onsite_address ?? "Onsite")}
                  </span>
                </span>
              </TableCell>
              <TableCell className="text-sm text-stone-700">
                {staffLabel(row)}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[row.status]}`}
                >
                  {STATUS_LABEL[row.status]}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  {row.graph_sync_status === "synced" && (
                    <CalendarCheck2
                      className="h-4 w-4 text-emerald-500"
                      aria-label="Synced to Outlook"
                    />
                  )}
                  {row.graph_sync_status === "failed" && (
                    <AlertTriangle
                      className="h-4 w-4 text-amber-500"
                      aria-label={
                        row.graph_sync_error ?? "Calendar sync failed"
                      }
                    />
                  )}
                  <AppointmentDetailDialog appointment={row} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

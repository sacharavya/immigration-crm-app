"use client";

import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CalendarX,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  UserX,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  assignAppointment,
  cancelAppointment,
  markCompleted,
  markNoShow,
  markAppointmentProBono,
  rescheduleAppointment,
  retryCalendarSync,
  updateAppointmentNotes,
} from "../actions";

import { STATUS_LABEL, STATUS_TONE, type AppointmentRow, type StaffOption } from "./types";

type Mode = "view" | "reschedule" | "cancel" | "notes";

const TORONTO_TZ = "America/Toronto";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: TORONTO_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  const fmt = d.toLocaleString("en-CA", {
    timeZone: TORONTO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.replace(", ", "T").slice(0, 16);
}

function localInputToIso(local: string): string {
  return new Date(local).toISOString();
}

function formatPhone(raw: string | null): string | null {
  if (!raw) return null;
  // Strip everything except digits
  const digits = raw.replace(/\D/g, "");
  // 11 digits starting with 1 (North American)
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  // 10 digits (North American without country code)
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // Anything else: return as-is
  return raw;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function durationLabel(appt: AppointmentRow): string | null {
  const dur = appt.appointment_type?.duration_minutes;
  if (!dur) return null;
  return `${dur} min`;
}

// Parse prep notes into structured sections
type PrepSection =
  | { type: "heading"; text: string }
  | { type: "checklist"; items: string[] }
  | { type: "bullets"; items: string[] }
  | { type: "quote"; text: string };

function parsePrepNotes(raw: string): PrepSection[] {
  const lines = raw.split("\n");
  const sections: PrepSection[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // Quoted line
    if (
      (line.startsWith('"') && line.endsWith('"')) ||
      (line.startsWith("\u201C") && line.includes("\u201D"))
    ) {
      sections.push({
        type: "quote",
        // Replace em dashes with commas
        text: line.replace(/^["'\u201C]+|["'\u201D]+$/g, "").replace(/\u2014/g, ",").trim(),
      });
      i++;
      continue;
    }

    // Heading: ends with ":"
    if (line.endsWith(":") && !line.startsWith("- ")) {
      const headingText = line.slice(0, -1).trim();
      sections.push({ type: "heading", text: headingText });
      i++;
      const items: string[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        if (next.startsWith("- ")) {
          items.push(next.slice(2).trim());
          i++;
        } else if (next === "") {
          i++;
          if (i < lines.length && lines[i].trim().startsWith("- ")) continue;
          break;
        } else break;
      }
      if (items.length > 0) {
        const isChecklist = /cover|discuss|expect|review|include/i.test(headingText);
        sections.push({ type: isChecklist ? "checklist" : "bullets", items });
      }
      continue;
    }

    // Standalone list items
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        if (next.startsWith("- ")) { items.push(next.slice(2).trim()); i++; }
        else if (next === "") { i++; break; }
        else break;
      }
      sections.push({ type: "bullets", items });
      continue;
    }

    i++;
  }
  return sections;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AppointmentDetailDialog({
  appointment,
  children,
  staffList = [],
}: {
  appointment: AppointmentRow;
  children?: React.ReactNode;
  staffList?: StaffOption[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function close() {
    setOpen(false);
    setTimeout(() => { setMode("view"); setError(null); }, 200);
  }

  function handleResult(promise: Promise<{ ok: true } | { error: string }>) {
    startTransition(async () => {
      const r = await promise;
      if ("error" in r) { setError(r.error); return; }
      close();
    });
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard denied */ }
  }

  const editable = appointment.status === "confirmed" && mode === "view";
  const isResolved = ["completed", "no_show", "cancelled"].includes(appointment.status);
  const apptType = appointment.appointment_type?.name ?? "Appointment";
  const dateStr = formatDateTime(appointment.starts_at);
  const dur = durationLabel(appointment);
  const joinUrl = appointment.teams_join_url ?? appointment.online_link;
  const prepNotes = appointment.appointment_type?.preparation_notes;
  const hasPrepContent = !!prepNotes?.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger
        className={
          children
            ? "block h-full w-full"
            : "inline-flex h-8 items-center rounded-md border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-100"
        }
      >
        {children ?? "View"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-start justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-medium text-stone-900">{apptType}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>{dateStr}{dur ? ` · ${dur}` : ""}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[appointment.status]}`}>
                {STATUS_LABEL[appointment.status]}
              </span>
              {appointment.graph_sync_status === "synced" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <RefreshCw className="h-3 w-3" /> Synced to Outlook
                </span>
              )}
              {appointment.fee_cad_at_booking !== null &&
                Number(appointment.fee_cad_at_booking) > 0 &&
                !appointment.is_pro_bono &&
                appointment.status !== "cancelled" &&
                mode === "view" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResult(markAppointmentProBono(appointment.id))}
                    disabled={pending}
                  >
                    Make pro bono
                  </Button>
                )}
              {appointment.graph_sync_status === "failed" && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600" title={appointment.graph_sync_error ?? "Calendar sync failed"}>
                  <AlertTriangle className="h-3 w-3" /> Sync failed
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Payment info (review step removed: proof auto-confirms) */}
        {mode === "view" && appointment.status === "pending_payment" && (
          <div className="border-b border-stone-200 px-6 py-4">
            <PendingPaymentSection appointment={appointment} />
          </div>
        )}
        {mode === "view" && appointment.payment_screenshot_url && (
          <div className="border-b border-stone-200 px-6 py-3 text-sm">
            <a
              href={appointment.payment_screenshot_url}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--navy)] hover:underline"
            >
              View payment proof
            </a>
          </div>
        )}

        {/* ── Body ──────────────────────────────────────────── */}
        {mode === "view" && (
          <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] min-h-[200px]">
            {/* Left rail */}
            <div className="border-b sm:border-b-0 sm:border-r border-stone-200 px-6 py-5 space-y-0">
              {/* Client */}
              <RailBlock label="Client">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-xs font-medium text-white">
                    {initials(appointment.snapshot_client_name)}
                  </div>
                  <div className="min-w-0">
                    {appointment.client ? (
                      <Link href={`/dashboard/clients/${appointment.client.id}`} className="text-sm font-medium text-[var(--navy)] hover:underline">
                        {appointment.snapshot_client_name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-stone-800">{appointment.snapshot_client_name}</span>
                    )}
                  </div>
                </div>
                {appointment.snapshot_client_email && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
                    <Mail className="h-3 w-3 shrink-0" />
                    <a href={`mailto:${appointment.snapshot_client_email}`} className="hover:text-stone-800 hover:underline truncate">
                      {appointment.snapshot_client_email}
                    </a>
                  </div>
                )}
                {appointment.snapshot_client_phone && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{formatPhone(appointment.snapshot_client_phone)}</span>
                  </div>
                )}
              </RailBlock>

              {/* Case */}
              {appointment.case && (
                <RailBlock label="Case">
                  <Link href={`/dashboard/cases/${appointment.case.id}`} className="font-mono text-xs text-[var(--navy)] hover:underline">
                    {appointment.case.case_number}
                  </Link>
                </RailBlock>
              )}


              {/* Location */}
              <RailBlock label="Location">
                {appointment.location_type === "online" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-sm text-stone-700">
                      <Video className="h-3.5 w-3.5 text-stone-400" />
                      {appointment.teams_join_url ? "Teams meeting" : "Online meeting"}
                    </div>
                    {joinUrl && (
                      <>
                        <a
                          href={joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-1.5 bg-[var(--navy)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--navy-light)]"
                        >
                          <Video className="h-3.5 w-3.5" /> Join meeting
                        </a>
                        <button
                          type="button"
                          onClick={() => copyLink(joinUrl)}
                          className="flex w-full items-center justify-center gap-1.5 border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
                        >
                          <Copy className="h-3 w-3" />
                          {copied ? "Copied!" : "Copy meeting link"}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 text-sm text-stone-700">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                    <span>{appointment.onsite_address ?? "In person"}</span>
                  </div>
                )}
              </RailBlock>

              {/* Assigned */}
              <RailBlock label="Assigned">
                {appointment.assigned_staff ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-medium text-stone-600">
                      {initials(`${appointment.assigned_staff.first_name} ${appointment.assigned_staff.last_name}`)}
                    </div>
                    <span className="text-sm text-stone-700">
                      {appointment.assigned_staff.first_name} {appointment.assigned_staff.last_name}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-stone-400">Unassigned</span>
                )}
                {staffList.length > 0 && (
                  <select
                    value={appointment.assigned_staff?.id ?? ""}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      // Fire-and-forget: don't close dialog on assign
                      startTransition(async () => {
                        const r = await assignAppointment(appointment.id, val);
                        if ("error" in r) setError(r.error);
                      });
                    }}
                    disabled={pending}
                    className="mt-2 h-8 w-full border border-stone-200 bg-white px-2 text-xs text-stone-700"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                      </option>
                    ))}
                  </select>
                )}
              </RailBlock>

              {/* Cancellation reason (stays on left, only when cancelled) */}
              {appointment.cancellation_reason && (
                <RailBlock label="Cancellation reason" last>
                  <p className="text-sm text-stone-600">{appointment.cancellation_reason}</p>
                </RailBlock>
              )}
            </div>

            {/* Right column: profile + reason + staff notes + prepare panel.
                Scrolls independently when the content runs long. */}
            <div className="bg-stone-50/60 px-6 py-5 space-y-5 sm:max-h-[65vh] sm:overflow-y-auto">
              {/* Booking intake profile */}
              {appointment.client && (
                <ClientProfilePanel client={appointment.client} />
              )}

              {/* Reason */}
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                  Reason for appointment
                </div>
                <p className="mt-1.5 text-sm text-stone-700 whitespace-pre-wrap">
                  {appointment.reason || <span className="text-stone-400">Not provided</span>}
                </p>
              </div>

              {/* Staff notes */}
              {appointment.staff_notes && (
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                    Staff notes
                  </div>
                  <p className="mt-1.5 text-sm text-stone-600 whitespace-pre-wrap">
                    {appointment.staff_notes}
                  </p>
                </div>
              )}

              {/* What to prepare */}
              {hasPrepContent && (
                <div className="border-t border-stone-200 pt-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                    <ClipboardList className="h-4 w-4 text-stone-400" />
                    What to prepare
                  </div>
                  <div className="mt-4 space-y-4">
                    <PrepNotesDisplay notes={prepNotes!} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Sub-modes (reschedule, cancel, notes, reject) ── */}
        {mode === "reschedule" && (
          <div className="px-6 py-5">
            <RescheduleMode
              appointment={appointment}
              pending={pending}
              onCancel={() => setMode("view")}
              onSubmit={(starts, ends, reason) =>
                handleResult(rescheduleAppointment({ id: appointment.id, starts_at: starts, ends_at: ends, reason }))
              }
            />
          </div>
        )}
        {mode === "cancel" && (
          <div className="px-6 py-5">
            <CancelMode
              pending={pending}
              onBack={() => setMode("view")}
              onSubmit={(reason) => handleResult(cancelAppointment({ id: appointment.id, reason }))}
            />
          </div>
        )}
        {mode === "notes" && (
          <div className="px-6 py-5">
            <NotesMode
              appointment={appointment}
              pending={pending}
              onCancel={() => setMode("view")}
              onSubmit={(staff_notes) =>
                handleResult(updateAppointmentNotes({ id: appointment.id, staff_notes }))
              }
            />
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────── */}
        {error && (
          <div className="px-6 pb-2">
            <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
          </div>
        )}

        {/* ── Footer actions ────────────────────────────────── */}
        {mode === "view" && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 px-6 py-3">
            {/* Left zone: lower emphasis */}
            <div className="flex flex-wrap items-center gap-2">
              {appointment.status !== "cancelled" && mode === "view" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("cancel")}
                  disabled={pending}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  <CalendarX className="mr-1 h-3.5 w-3.5" /> Cancel
                </Button>
              )}
              {(editable || isResolved) && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMode("reschedule")} disabled={pending || isResolved}>
                    <CalendarClock className="mr-1 h-3.5 w-3.5" /> Reschedule
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMode("notes")} disabled={pending}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit staff notes
                  </Button>
                </>
              )}
              {appointment.graph_sync_status === "failed" && (
                <Button variant="outline" size="sm" onClick={() => handleResult(retryCalendarSync(appointment.id))} disabled={pending}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry sync
                </Button>
              )}
            </div>

            {/* Right zone: outcomes or resolved indicator */}
            <div className="flex items-center gap-2">
              {isResolved ? (
                <span className="text-xs text-stone-400">
                  {appointment.status === "completed" ? "Marked completed" :
                   appointment.status === "no_show" ? "Marked no-show" :
                   "Cancelled"}
                </span>
              ) : editable ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleResult(markNoShow(appointment.id))} disabled={pending}>
                    <UserX className="mr-1 h-3.5 w-3.5" /> Mark no-show
                  </Button>
                  <Button size="sm" onClick={() => handleResult(markCompleted(appointment.id))} disabled={pending}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark completed
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Rail block
// ---------------------------------------------------------------------------

function RailBlock({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`py-3 ${last ? "" : "border-b border-stone-100"}`}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{label}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// Booking-form intake captured on the client (address, DOB, marital status,
// education, language test/score, occupation) so staff can size up the profile.
function clientIntakeRows(
  client: NonNullable<AppointmentRow["client"]>,
): [string, string][] {
  const address = [
    client.address_line1,
    [client.city, client.province_state].filter(Boolean).join(", "),
    client.postal_code,
  ]
    .filter((x) => x && x.trim() !== "")
    .join(", ");
  const intake = (client.background_responses?.consultation_intake ?? {}) as {
    highest_education?: string | null;
    occupation?: string | null;
    language_test?: string | null;
    language_score?: string | null;
  };
  const age = client.date_of_birth ? ageFrom(client.date_of_birth) : null;
  const rows: [string, string | null][] = [
    ["Address", address || null],
    [
      "Date of birth",
      client.date_of_birth
        ? `${client.date_of_birth}${age != null ? ` · ${age} yrs` : ""}`
        : null,
    ],
    ["Marital status", client.marital_status ? titleCase(client.marital_status) : null],
    ["Education", intake.highest_education ?? null],
    ["Language test", intake.language_test ?? null],
    ["Test scores", intake.language_score ?? null],
    ["Occupation", intake.occupation ?? null],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

function ClientProfilePanel({
  client,
}: {
  client: NonNullable<AppointmentRow["client"]>;
}) {
  const rows = clientIntakeRows(client);
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
        Profile
      </div>
      <dl className="mt-1.5 space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3">
            <dt className="w-32 shrink-0 text-stone-400">{label}</dt>
            <dd className="text-stone-700">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ageFrom(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Prep notes display
// ---------------------------------------------------------------------------

function PrepNotesDisplay({ notes }: { notes: string }) {
  const sections = parsePrepNotes(notes);
  return (
    <>
      {sections.map((section, idx) => {
        switch (section.type) {
          case "heading":
            return <h3 key={idx} className="text-sm font-medium text-stone-800">{section.text}</h3>;
          case "checklist":
            return (
              <ul key={idx} className="space-y-2">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
                    <span className="text-sm text-stone-600">{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "bullets":
            return (
              <ul key={idx} className="space-y-2">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <Circle className="mt-1.5 h-2 w-2 shrink-0 fill-stone-400 text-stone-400" />
                    <span className="text-sm text-stone-600">{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={idx} className="border-l-2 border-stone-300 pl-3 text-sm italic text-stone-500">
                {section.text}
              </blockquote>
            );
        }
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-mode forms (preserved from original)
// ---------------------------------------------------------------------------

function RescheduleMode({
  appointment, pending, onCancel, onSubmit,
}: {
  appointment: AppointmentRow;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (startsIso: string, endsIso: string, reason: string | null) => void;
}) {
  const durMs = new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime();
  const [startsLocal, setStartsLocal] = useState(toLocalDateTimeInput(appointment.starts_at));
  const [reason, setReason] = useState("");

  function submit() {
    const startsIso = localInputToIso(startsLocal);
    const endsIso = new Date(new Date(startsIso).getTime() + durMs).toISOString();
    onSubmit(startsIso, endsIso, reason.trim() || null);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-stone-800">Reschedule appointment</h3>
      <div>
        <Label className="text-xs font-medium text-stone-600">New start time</Label>
        <Input type="datetime-local" value={startsLocal} onChange={(e) => setStartsLocal(e.target.value)} />
        <p className="mt-1 text-[11px] text-stone-500">Duration stays {Math.round(durMs / 60000)} min.</p>
      </div>
      <div>
        <Label className="text-xs font-medium text-stone-600">Reason for reschedule (optional)</Label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="mt-1 w-full border border-stone-200 bg-white px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={pending}>Back</Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Rescheduling...</> : "Confirm reschedule"}
        </Button>
      </div>
    </div>
  );
}

function CancelMode({ pending, onBack, onSubmit }: { pending: boolean; onBack: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-stone-800">Cancel appointment</h3>
      <div>
        <Label className="text-xs font-medium text-stone-600">Cancellation reason</Label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Required. Visible to staff; not emailed to the client." className="mt-1 w-full border border-stone-200 bg-white px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack} disabled={pending}>Back</Button>
        <Button variant="destructive" onClick={() => onSubmit(reason.trim())} disabled={pending || !reason.trim()}>
          {pending ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Cancelling...</> : "Confirm cancel"}
        </Button>
      </div>
    </div>
  );
}

function NotesMode({
  appointment, pending, onCancel, onSubmit,
}: {
  appointment: AppointmentRow;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (staffNotes: string | null) => void;
}) {
  const [staffNotes, setStaffNotes] = useState(appointment.staff_notes ?? "");
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-stone-800">Edit staff notes</h3>
      <div>
        <Label className="text-xs font-medium text-stone-600">
          Client&apos;s reason (read-only)
        </Label>
        <p className="mt-1 w-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
          {appointment.reason || "Not provided"}
        </p>
      </div>
      <div>
        <Label className="text-xs font-medium text-stone-600">Staff notes</Label>
        <textarea value={staffNotes} onChange={(e) => setStaffNotes(e.target.value)} rows={3} placeholder="Internal only. Not emailed to the client." className="mt-1 w-full border border-stone-200 bg-white px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={pending}>Back</Button>
        <Button onClick={() => onSubmit(staffNotes.trim() || null)} disabled={pending}>
          {pending ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving...</> : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// APPT-8 payment review
// ---------------------------------------------------------------------------

function formatFeeCad(value: string | number | null): string {
  if (value === null) return "N/A";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "N/A";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

function formatUploadedAgo(iso: string | null): string {
  if (!iso) return "N/A";
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return "just now";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}


function PendingPaymentSection({ appointment }: { appointment: AppointmentRow }) {
  return (
    <div className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <strong>Awaiting payment proof from client.</strong>
      <p className="mt-1 text-xs text-amber-800">
        Fee: {formatFeeCad(appointment.fee_cad_at_booking)} · Reference{" "}
        <code className="font-mono">{appointment.id.slice(0, 8)}</code>. The
        slot will be released automatically if not received by end of day.
      </p>
    </div>
  );
}


import { format } from "date-fns";
import { AlertTriangle, Check, Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  chipInputFromViewRow,
  computeActionChip,
  type ChipOutput,
} from "@/lib/cases/action-chip";
import {
  cleanAddress,
  countryName,
  formatPhoneDisplay,
  formatUci,
  languageName,
  telHref,
  whatsAppHref,
} from "@/lib/clients/humanize";
import { getIntakeProgress } from "@/lib/intake/completeness";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { STATUS_LABEL, type CaseStatus } from "@/lib/utils/phase";
import { cn } from "@/lib/utils/index";
import type { ImmigrationStatusType } from "@/lib/validators/client-immigration";

import { NewAppointmentDialog } from "../../appointments/_components/new-appointment-dialog";
import type {
  AppointmentRow,
  AppointmentTypeOption,
  LocationType,
} from "../../appointments/_components/types";

import { ClientOverflowMenu } from "./_components/client-overflow-menu";
import { ImmigrationStatusFact } from "../../cases/[id]/_components/immigration-status-fact";
import { IntakeShareDialog } from "./_components/intake-share-dialog";
import {
  RelatedPeopleCard,
  type RelatedPerson,
} from "./_components/related-people-card";

// Immigration edits and new cases must be reflected immediately; never serve a
// cached copy of the client operations view.
export const dynamic = "force-dynamic";

type ClientStatus = Database["crm"]["Enums"]["client_status"];
type ParticipantRole = Database["crm"]["Enums"]["participant_role"];

// Derived client status pill. Active is a confirmed client, Lead is a prospect,
// and dormant / closed both read as a past or inactive client.
const CLIENT_STATUS_PILL: Record<
  ClientStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-[var(--success-subtle)] text-[var(--success-text)]",
  },
  lead: {
    label: "Lead",
    className: "bg-[var(--navy-100)] text-[var(--navy-700)]",
  },
  dormant: {
    label: "Past",
    className: "bg-muted text-muted-foreground",
  },
  closed: {
    label: "Past",
    className: "bg-muted text-muted-foreground",
  },
};

// Case status chip tones, mirroring the sub-status row's meaning-not-party
// model: overdue -> safe-stop destructive, approved -> success, awaiting IRCC /
// in progress -> navy accent wash, anything time-sensitive -> warning.
const CASE_TONE = {
  destructive: "bg-[var(--maple-100)] text-[var(--destructive-text)]",
  warning: "bg-[var(--warning-subtle)] text-[var(--warning-text)]",
  navy: "bg-[var(--navy-100)] text-[var(--navy-700)]",
  success: "bg-[var(--success-subtle)] text-[var(--success-text)]",
  muted: "bg-muted text-muted-foreground",
} as const;

function caseTone(
  status: CaseStatus,
  chip: ChipOutput | null,
): keyof typeof CASE_TONE {
  if (chip?.urgency === "overdue") return "destructive";
  if (status === "passport_requested") return "success";
  if (status === "refused") return "destructive";
  if (status === "closed") return "muted";
  if (chip?.urgency === "sensitive") return "warning";
  if (status === "submitted_to_ircc") return "navy";
  return "navy";
}

// Light prettifier for snake_case enum-ish values (gender, marital status).
function pretty(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const spaced = trimmed.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// One cell of a hairline strip: a small subtle label over its value. The strip
// is a gap-px grid on a border-coloured background, so each fact is divided by
// a hairline that fills the width.
function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle-foreground)]">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// A contact fact: an actionable, formatted value with a leading icon, or an Add
// affordance when nothing is on file (never a bare dash).
function ContactFact({
  label,
  icon,
  href,
  display,
}: {
  label: string;
  icon: React.ReactNode;
  href: string | null;
  display: string | null;
}) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle-foreground)]">
        {label}
      </div>
      <div className="mt-1">
        {href && display ? (
          <a
            href={href}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--navy-700)] hover:underline"
          >
            <span aria-hidden className="text-muted-foreground">
              {icon}
            </span>
            <span className="truncate">{display}</span>
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-[var(--subtle-foreground)]">
            <span aria-hidden>{icon}</span>
            Add
          </span>
        )}
      </div>
    </div>
  );
}

type Props = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;

  const me = await getStaff();
  if (!me) notFound();
  if (!staffCan(me, "view_clients")) notFound();

  const supabase = await createClient();

  // The client row and its cases both key off the URL id, so fetch them
  // together. Everything below (services, chips, participants) keys off the
  // resulting case ids and runs as a second parallel wave.
  const [{ data: clientRow }, { data: caseRows }] = await Promise.all([
    supabase
      .schema("crm")
      .from("clients")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .schema("crm")
      .from("cases")
      .select("id, case_number, status, opened_at, service_type_id")
      .eq("client_id", id)
      .is("deleted_at", null)
      .order("opened_at", { ascending: false }),
  ]);

  if (!clientRow) notFound();

  // Immigration columns and UCI ride along with select("*") but aren't in the
  // generated Row type yet (added by the 2026-06-25 migrations), so read them
  // through a widened view that degrades to null when a column is absent.
  const ext = clientRow as typeof clientRow & {
    immigration_status?: ImmigrationStatusType | null;
    immigration_status_expiry?: string | null;
    immigration_status_note?: string | null;
    immigration_in_canada?: boolean | null;
    uci?: string | null;
  };
  const immigrationStatus = ext.immigration_status ?? null;
  const immigrationExpiry = ext.immigration_status_expiry ?? null;
  const immigrationNote = ext.immigration_status_note ?? null;
  const immigrationInCanada = ext.immigration_in_canada ?? null;
  const uci = ext.uci ?? null;

  const caseRowsList = caseRows ?? [];
  const caseNumberById = new Map(
    caseRowsList.map((c) => [c.id, c.case_number]),
  );
  const serviceIds = Array.from(
    new Set(caseRowsList.map((c) => c.service_type_id)),
  );
  const caseIds = caseRowsList.map((c) => c.id);

  // Services, chip inputs, and case participants all key off the case ids, so
  // fetch them in one parallel wave rather than three sequential round-trips.
  const [{ data: serviceRows }, { data: chipRows }, { data: participantRows }] =
    await Promise.all([
      serviceIds.length
        ? supabase
            .schema("ref")
            .from("service_types")
            .select("id, name")
            .in("id", serviceIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      caseIds.length
        ? supabase
            .schema("crm")
            .from("v_case_chip_inputs")
            .select("*")
            .in("case_id", caseIds)
        : Promise.resolve({ data: [] }),
      caseIds.length
        ? (supabase
            .schema("crm")
            .from("case_participants")
            .select(
              "id, role, client_id, case_id, client:clients(legal_name_full, given_names, family_name)",
            )
            .in("case_id", caseIds)
            .order("added_at", { ascending: true }) as unknown as Promise<{
            data:
              | Array<{
                  id: string;
                  role: ParticipantRole;
                  client_id: string;
                  case_id: string;
                  client: {
                    legal_name_full: string | null;
                    given_names: string | null;
                    family_name: string | null;
                  } | null;
                }>
              | null;
          }>)
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const serviceNameById = new Map(
    (serviceRows ?? []).map((s) => [s.id, s.name]),
  );

  const chipNow = new Date();
  const chipById = new Map<string, ChipOutput>();
  for (const row of chipRows ?? []) {
    if (!row.case_id) continue;
    const input = chipInputFromViewRow(row, chipNow);
    if (input) chipById.set(row.case_id, computeActionChip(input));
  }

  const cases = caseRowsList.map((c) => ({
    ...c,
    serviceName: serviceNameById.get(c.service_type_id) ?? null,
    chip: chipById.get(c.id) ?? null,
  }));
  const activeCount = caseRowsList.filter(
    (c) => c.status !== "closed" && c.status !== "refused",
  ).length;

  // Related people: everyone linked to this client through their cases, minus
  // the client themself. Fetched in the parallel wave above; rendered only when
  // present.
  const relatedPeople: RelatedPerson[] = (participantRows ?? [])
    .filter((p) => p.client_id !== id)
    .map((p) => {
      const joined = [p.client?.given_names, p.client?.family_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      return {
        id: p.id,
        clientId: p.client_id,
        role: p.role,
        name: p.client?.legal_name_full || joined || "Unnamed person",
        caseId: p.case_id,
        caseNumber: caseNumberById.get(p.case_id) ?? "case",
      };
    });

  // Intake completeness: fetch all support rows in parallel and compute.
  const [
    familyRes,
    educationRes,
    employmentRes,
    travelRes,
    addressRes,
    orgsRes,
    govRes,
    milRes,
    bioRes,
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("client_family_members")
      .select("*")
      .eq("client_id", id),
    supabase
      .schema("crm")
      .from("client_education_history")
      .select("*")
      .eq("client_id", id),
    supabase
      .schema("crm")
      .from("client_employment_history")
      .select("*")
      .eq("client_id", id),
    supabase
      .schema("crm")
      .from("client_travel_history")
      .select("*")
      .eq("client_id", id),
    supabase
      .schema("crm")
      .from("client_address_history")
      .select("*")
      .eq("client_id", id),
    supabase
      .schema("crm")
      .from("client_organisations")
      .select("*")
      .eq("client_id", id),
    supabase
      .schema("crm")
      .from("client_government_positions")
      .select("*")
      .eq("client_id", id),
    supabase
      .schema("crm")
      .from("client_military_services")
      .select("*")
      .eq("client_id", id),
    supabase
      .schema("crm")
      .from("client_biometric_records")
      .select("*")
      .eq("client_id", id)
      .is("deleted_at", null),
  ]);

  const intakeProgress = getIntakeProgress(clientRow, {
    family: familyRes.data ?? [],
    education: educationRes.data ?? [],
    employment: employmentRes.data ?? [],
    travel: travelRes.data ?? [],
    addresses: addressRes.data ?? [],
    organisations: orgsRes.data ?? [],
    government: govRes.data ?? [],
    military: milRes.data ?? [],
    biometrics: bioRes.data ?? [],
  });
  const intakeComplete = intakeProgress.complete === intakeProgress.total;

  // Appointment infrastructure for the header's Schedule meeting action and the
  // Next appointment summary fact.
  const [appointmentTypesRes, appointmentSettingsRes, clientAppointmentsRes] =
    await Promise.all([
      supabase
        .schema("crm")
        .from("appointment_types")
        .select(
          "id, name, code, duration_minutes, requires_case, default_location_type, fee_cad",
        )
        .eq("active", true)
        .is("deleted_at", null)
        .order("display_order"),
      supabase
        .schema("crm")
        .from("appointment_settings")
        .select("office_address")
        .maybeSingle(),
      supabase
        .schema("crm")
        .from("appointments")
        .select(
          `
          id, starts_at, ends_at, timezone, location_type, online_link,
          onsite_address, teams_join_url, status, reason, staff_notes, graph_sync_status,
          fee_cad_at_booking, payment_uploaded_at, payment_screenshot_id,
          payment_reviewed_at, payment_rejection_reason, linked_payment_id,
          graph_sync_error, cancellation_reason, snapshot_client_name,
          snapshot_client_email, snapshot_client_phone,
          appointment_type:appointment_types!appointments_appointment_type_id_fkey(
            id, name, duration_minutes, default_location_type, preparation_notes
          ),
          client:clients!appointments_client_id_fkey(
            id, given_names, family_name, email
          ),
          case:cases!appointments_case_id_fkey(id, case_number),
          assigned_staff:staff!appointments_assigned_staff_id_fkey(
            id, first_name, last_name
          )
        `,
        )
        .eq("client_id", id)
        .eq("status", "confirmed")
        .is("deleted_at", null)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(1),
    ]);

  const appointmentTypes: AppointmentTypeOption[] = (
    appointmentTypesRes.data ?? []
  ).map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    duration_minutes: t.duration_minutes,
    requires_case: t.requires_case,
    default_location_type: t.default_location_type as LocationType,
    fee_cad: t.fee_cad,
  }));
  const officeAddress =
    appointmentSettingsRes.data?.office_address ??
    "211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5";
  const nextAppointment = (clientAppointmentsRes.data ??
    [])[0] as unknown as AppointmentRow | undefined;
  const availableCases = caseRowsList
    .filter((c) => c.status !== "closed" && c.status !== "refused")
    .map((c) => ({ id: c.id, case_number: c.case_number }));

  const pill = CLIENT_STATUS_PILL[clientRow.status];
  const citizenship = countryName(clientRow.country_of_citizenship);

  const canDelete = staffCan(me, "delete_clients");
  const canCreateCases = staffCan(me, "create_cases");
  const canSchedule = staffCan(me, "manage_appointments");
  const canEdit = staffCan(me, "edit_clients");

  // Profile fields. Each is either filled (shown, humanized) or pending (named
  // in the Pending from intake line), never a grid of dashes.
  const profileFields: Array<{ label: string; value: string | null }> = [
    {
      label: "Date of birth",
      value: clientRow.date_of_birth
        ? format(new Date(clientRow.date_of_birth), "MMM d, yyyy")
        : null,
    },
    { label: "Gender", value: pretty(clientRow.gender) },
    { label: "Marital status", value: pretty(clientRow.marital_status) },
    { label: "Country of birth", value: countryName(clientRow.country_of_birth) },
    { label: "Residence", value: countryName(clientRow.country_of_residence) },
    {
      label: "Preferred language",
      value: languageName(clientRow.preferred_language),
    },
    {
      label: "Preferred contact",
      value: pretty(clientRow.preferred_contact),
    },
    {
      label: "Address",
      value: cleanAddress({
        line1: clientRow.address_line1,
        line2: clientRow.address_line2,
        city: clientRow.city,
        provinceState: clientRow.province_state,
        postalCode: clientRow.postal_code,
        countryCode: clientRow.country_code,
      }),
    },
  ];
  // Consultation-booking intake (JSONB). Shown only when present — never listed
  // as "pending", since clients who didn't book a consultation won't have it.
  const consultIntake = ((clientRow.background_responses as Record<
    string,
    unknown
  > | null)?.consultation_intake ?? {}) as {
    highest_education?: string | null;
    occupation?: string | null;
    language_test?: string | null;
    language_score?: string | null;
  };
  const intakeFields: Array<{ label: string; value: string | null }> = [
    { label: "Highest education", value: consultIntake.highest_education ?? null },
    { label: "Language test", value: consultIntake.language_test ?? null },
    { label: "Test scores", value: consultIntake.language_score ?? null },
    { label: "Occupation", value: consultIntake.occupation ?? null },
  ];
  // NOC-finder inquiry (public lead form). Shown only when present.
  const nocInquiry = ((clientRow.background_responses as Record<
    string,
    unknown
  > | null)?.noc_inquiry ?? null) as {
    intent?: string;
    noc_code?: string;
    noc_title?: string;
    teer?: number;
    sowp_status?: string;
    note?: string | null;
    submitted_at?: string;
  } | null;
  const nocIntentLabel =
    nocInquiry?.intent === "sowp"
      ? "Spousal open work permit"
      : nocInquiry?.intent === "express_entry"
        ? "Express Entry"
        : "Not sure - wants advice";
  const nocInquiryFields: Array<{ label: string; value: string | null }> =
    nocInquiry
      ? [
          { label: "NOC inquiry", value: nocIntentLabel },
          {
            label: "NOC occupation",
            value: nocInquiry.noc_code
              ? `${nocInquiry.noc_code} ${nocInquiry.noc_title ?? ""} (TEER ${nocInquiry.teer ?? "?"}, SOWP ${nocInquiry.sowp_status ?? "unknown"})`
              : null,
          },
          { label: "Inquiry note", value: nocInquiry.note ?? null },
        ]
      : [];
  const filledFields = [
    ...profileFields,
    ...intakeFields,
    ...nocInquiryFields,
  ].filter((f) => f.value);
  const pendingLabels = profileFields
    .filter((f) => !f.value)
    .map((f) => f.label.toLowerCase());

  return (
    <div className="min-h-dvh bg-[var(--surface-sunken)]">
      <header className="border-b border-border bg-card">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground"
        >
          <Link href="/dashboard/clients" className="hover:text-foreground">
            Clients
          </Link>
          <span aria-hidden className="text-[var(--subtle-foreground)]">
            /
          </span>
          <span className="font-medium text-foreground">
            {clientRow.client_number}
          </span>
        </nav>
      </header>

      <main className="space-y-4 px-6 py-6">
        {/* Header card */}
        <div className="rounded-lg border border-border bg-card p-5">
          {/* Top row: name + meta, status pill, primary action, overflow */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-foreground">
                {clientRow.legal_name_full}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {clientRow.client_number}, created{" "}
                {format(new Date(clientRow.created_at), "MMM d, yyyy")}
              </p>
              {/* Identifiers: UCI in a monospace face. */}
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                UCI {formatUci(uci) ?? "not recorded"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  pill.className,
                )}
              >
                {pill.label}
              </span>
              {canSchedule && (
                <NewAppointmentDialog
                  types={appointmentTypes}
                  officeAddress={officeAddress}
                  prefilledClient={{
                    id: clientRow.id,
                    name: clientRow.legal_name_full,
                    email: clientRow.email ?? "",
                    phone: clientRow.phone_primary,
                  }}
                  availableCases={availableCases}
                  triggerLabel="Schedule meeting"
                  triggerVariant="primary"
                />
              )}
              <ClientOverflowMenu
                clientId={clientRow.id}
                clientName={clientRow.legal_name_full}
                clientNumber={clientRow.client_number}
                canDelete={canDelete}
              />
            </div>
          </div>

          {/* Summary band: the four facts staff open a client to check. */}
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
            <Fact label="Immigration status">
              <ImmigrationStatusFact
                clientId={clientRow.id}
                canEdit={canEdit}
                inCanada={immigrationInCanada}
                status={immigrationStatus}
                expiry={immigrationExpiry}
                note={immigrationNote}
                uci={uci}
              />
            </Fact>
            <Fact label="Citizenship">
              <div className="text-sm text-foreground">
                {citizenship ?? (
                  <span className="text-[var(--subtle-foreground)]">
                    Not recorded
                  </span>
                )}
              </div>
            </Fact>
            <Fact label="Open cases">
              <div className="text-sm text-foreground">
                {activeCount > 0 ? `${activeCount} active` : "None"}
              </div>
            </Fact>
            <Fact label="Next appointment">
              <div className="text-sm text-foreground">
                {nextAppointment ? (
                  format(new Date(nextAppointment.starts_at), "MMM d, yyyy")
                ) : (
                  <span className="text-muted-foreground">None scheduled</span>
                )}
              </div>
            </Fact>
          </div>

          {/* Contact row: actionable, formatted; empty fields show Add. */}
          <div className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            <ContactFact
              label="Email"
              icon={<Mail className="h-3.5 w-3.5" />}
              href={clientRow.email ? `mailto:${clientRow.email}` : null}
              display={clientRow.email}
            />
            <ContactFact
              label="Phone"
              icon={<Phone className="h-3.5 w-3.5" />}
              href={
                clientRow.phone_primary ? telHref(clientRow.phone_primary) : null
              }
              display={formatPhoneDisplay(clientRow.phone_primary)}
            />
            <ContactFact
              label="WhatsApp"
              icon={<MessageCircle className="h-3.5 w-3.5" />}
              href={
                clientRow.phone_whatsapp
                  ? whatsAppHref(clientRow.phone_whatsapp)
                  : null
              }
              display={formatPhoneDisplay(clientRow.phone_whatsapp)}
            />
          </div>
        </div>

        {/* Profile and intake card */}
        <div className="rounded-lg border border-border bg-card p-5">
          {/* Intake banner: a task while incomplete, a quiet confirmation once
              done. */}
          {intakeComplete ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--success-text)]">
                <Check className="h-4 w-4" aria-hidden />
                Intake complete
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <IntakeShareDialog
                    clientId={clientRow.id}
                    initialToken={clientRow.intake_portal_token ?? null}
                    submittedAt={clientRow.intake_submitted_at ?? null}
                    clientEmail={clientRow.email ?? null}
                  />
                )}
                <Link
                  href={`/dashboard/clients/${clientRow.id}/intake`}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                >
                  Open intake form
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-l-4 border-[var(--warning-subtle)] border-l-[var(--warning)] bg-[var(--warning-subtle)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2 text-sm text-[var(--warning-text)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <div className="font-semibold">
                    Intake {intakeProgress.complete} of {intakeProgress.total}{" "}
                    sections complete
                  </div>
                  <p className="mt-0.5 text-[var(--warning-text)]/90">
                    Profile details fill in once intake is done.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <IntakeShareDialog
                    clientId={clientRow.id}
                    initialToken={clientRow.intake_portal_token ?? null}
                    submittedAt={clientRow.intake_submitted_at ?? null}
                    clientEmail={clientRow.email ?? null}
                  />
                )}
                <Link
                  href={`/dashboard/clients/${clientRow.id}/intake`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Open intake form
                </Link>
              </div>
            </div>
          )}

          {/* Filled fields, humanized. */}
          {filledFields.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filledFields.map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle-foreground)]">
                    {f.label}
                  </div>
                  <div className="mt-0.5 text-sm text-foreground">{f.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Still-empty fields named as pending, with a manual fill path. */}
          {pendingLabels.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm text-[var(--subtle-foreground)]">
                Pending from intake: {pendingLabels.join(", ")}
              </p>
              {canEdit && (
                <Link
                  href={`/dashboard/clients/${clientRow.id}/intake`}
                  className="mt-1 inline-block text-sm font-medium text-[var(--navy-700)] hover:underline"
                >
                  Fill in now
                </Link>
              )}
            </div>
          )}

          {clientRow.notes && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle-foreground)]">
                Notes
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {clientRow.notes}
              </p>
            </div>
          )}
        </div>

        {/* Cases card */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Cases ({cases.length})
            </h2>
            {canCreateCases && (
              <Link
                href={`/dashboard/cases/new?client_id=${clientRow.id}`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                New case
              </Link>
            )}
          </div>
          {cases.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No cases for this client yet.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {cases.map((c) => {
                const tone = caseTone(c.status, c.chip);
                const nextAction =
                  c.chip && c.status !== "closed"
                    ? c.chip.text.replace(" · ", ", ")
                    : null;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="flex items-start justify-between gap-4 rounded-md py-3 transition-colors hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-sm text-muted-foreground">
                          {c.case_number}
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {c.serviceName ?? "Service not set"}
                        </div>
                        {nextAction && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Next: {nextAction}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                            CASE_TONE[tone],
                          )}
                        >
                          {STATUS_LABEL[c.status]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(c.opened_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Related people: only when the client has linked people. */}
        <RelatedPeopleCard people={relatedPeople} />
      </main>
    </div>
  );
}

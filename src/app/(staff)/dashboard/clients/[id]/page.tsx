import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { getIntakeProgress } from "@/lib/intake/completeness";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/index";

import { DeleteClientTrigger } from "./_components/delete-client-trigger";

type ClientStatus = Database["crm"]["Enums"]["client_status"];
type CaseStatus = Database["crm"]["Enums"]["case_status"];

const clientStatusPill: Record<
  ClientStatus,
  { label: string; className: string }
> = {
  lead: { label: "Lead", className: "bg-amber-100 text-amber-800" },
  active: { label: "Active", className: "bg-green-100 text-green-800" },
  dormant: { label: "Dormant", className: "bg-stone-200 text-stone-700" },
  closed: { label: "Closed", className: "bg-gray-200 text-gray-700" },
};

const caseStatusLabel: Record<CaseStatus, string> = {
  retainer_pending: "Retainer Pending",
  documentation_in_progress: "Documentation",
  documentation_review: "In Review",
  submitted_to_ircc: "Submitted",
  biometrics_pending: "Biometrics",
  biometrics_completed: "Biometrics",
  awaiting_decision: "Awaiting Decision",
  passport_requested: "Passport Request",
  refused: "Refused",
  additional_info_requested: "More Info",
  closed: "Closed",
};

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-stone-900">
        {value && value.trim() !== "" ? value : "—"}
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

  const { data: clientRow } = await supabase
    .schema("crm")
    .from("clients")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!clientRow) notFound();

  const { data: caseRows } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, case_number, status, opened_at, service_type_id")
    .eq("client_id", id)
    .is("deleted_at", null)
    .order("opened_at", { ascending: false });

  const caseRowsList = caseRows ?? [];
  const serviceIds = Array.from(
    new Set(caseRowsList.map((c) => c.service_type_id)),
  );
  const { data: serviceRows } = serviceIds.length
    ? await supabase
        .schema("ref")
        .from("service_types")
        .select("id, name")
        .in("id", serviceIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const serviceNameById = new Map(
    (serviceRows ?? []).map((s) => [s.id, s.name]),
  );
  const cases = caseRowsList.map((c) => ({
    ...c,
    serviceName: serviceNameById.get(c.service_type_id) ?? null,
  }));
  const pill = clientStatusPill[clientRow.status];

  // Intake completeness — fetch all support rows in parallel and compute.
  const [
    familyRes,
    educationRes,
    employmentRes,
    travelRes,
    addressRes,
    orgsRes,
    govRes,
    milRes,
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
  });
  const intakeFullyComplete =
    intakeProgress.complete === intakeProgress.total;
  const intakePct = Math.round(
    (intakeProgress.complete / intakeProgress.total) * 100,
  );

  const addressLine = [
    clientRow.address_line1,
    clientRow.address_line2,
    [clientRow.city, clientRow.province_state].filter(Boolean).join(", "),
    [clientRow.postal_code, clientRow.country_code].filter(Boolean).join(" "),
  ]
    .filter((s) => s && s.trim() !== "")
    .join(" · ");

  const canDelete = staffCan(me, "delete_clients");
  const canCreateCases = staffCan(me, "create_cases");

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4 text-sm">
          <Link
            href="/dashboard/clients"
            className="text-stone-500 hover:text-stone-800"
          >
            Clients
          </Link>
          <span className="mx-2 text-stone-400">›</span>
          <span className="font-medium text-stone-800">
            {clientRow.client_number}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-6">
        <Card>
          <CardContent className="flex items-start justify-between gap-6 p-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--navy)]">
                {clientRow.legal_name_full}
              </h1>
              <p className="mt-1 text-sm text-stone-600">
                {clientRow.client_number} · created{" "}
                {format(new Date(clientRow.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge
                className={`${pill.className} shrink-0 rounded-full px-3 py-1 font-medium`}
              >
                {pill.label}
              </Badge>
              {canDelete && (
                <DeleteClientTrigger
                  clientId={clientRow.id}
                  clientName={clientRow.legal_name_full}
                  clientNumber={clientRow.client_number}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
              Profile
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Email" value={clientRow.email} />
              <Field label="Phone" value={clientRow.phone_primary} />
              <Field label="WhatsApp" value={clientRow.phone_whatsapp} />
              <Field
                label="Date of birth"
                value={
                  clientRow.date_of_birth
                    ? format(
                        new Date(clientRow.date_of_birth),
                        "MMM d, yyyy",
                      )
                    : null
                }
              />
              <Field label="Gender" value={clientRow.gender} />
              <Field label="Marital status" value={clientRow.marital_status} />
              <Field
                label="Citizenship"
                value={clientRow.country_of_citizenship}
              />
              <Field
                label="Country of birth"
                value={clientRow.country_of_birth}
              />
              <Field label="Residence" value={clientRow.country_of_residence} />
              <Field
                label="Preferred language"
                value={clientRow.preferred_language}
              />
              <Field
                label="Preferred contact"
                value={clientRow.preferred_contact}
              />
              <Field label="Address" value={addressLine} />
            </div>
            {clientRow.notes && (
              <div className="border-t border-stone-100 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Notes
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">
                  {clientRow.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                  Intake form
                </h2>
                {intakeFullyComplete ? (
                  <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                    <Check className="h-4 w-4" />
                    Complete
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-sm text-stone-700">
                      {intakeProgress.complete} of {intakeProgress.total}{" "}
                      sections complete
                    </span>
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full bg-[var(--gold)] transition-all"
                        style={{ width: `${intakePct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <Link
                href={`/dashboard/clients/${clientRow.id}/intake`}
                className={cn(
                  buttonVariants({
                    size: "sm",
                    variant: intakeFullyComplete ? "outline" : "default",
                  }),
                )}
              >
                Open intake form
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                Cases ({cases.length})
              </h2>
              {canCreateCases && (
                <Link
                  href={`/dashboard/cases/new?client_id=${clientRow.id}`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  + New case
                </Link>
              )}
            </div>
            {cases.length === 0 ? (
              <p className="text-sm text-stone-500">
                No cases for this client yet.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {cases.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="flex items-center justify-between gap-4 py-3 hover:bg-stone-50"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-sm text-stone-700">
                          {c.case_number}
                        </div>
                        <div className="text-sm text-stone-900">
                          {c.serviceName ?? "—"}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-stone-500">
                        <span>
                          {format(new Date(c.opened_at), "MMM d, yyyy")}
                        </span>
                        <Badge className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                          {caseStatusLabel[c.status]}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

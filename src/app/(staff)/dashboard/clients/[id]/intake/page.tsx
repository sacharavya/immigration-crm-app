import Link from "next/link";
import { notFound } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { getIntakeProgress } from "@/lib/intake/completeness";
import { createClient } from "@/lib/supabase/server";

import { IntakeShell } from "./_components/intake-shell";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function IntakePage({ params }: Props) {
  const { id } = await params;

  const me = await getStaff();
  if (!me) notFound();
  if (!staffCan(me, "view_intake_form")) notFound();

  const supabase = await createClient();

  const { data: client } = await supabase
    .schema("crm")
    .from("clients")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!client) notFound();

  const [
    familyRes,
    educationRes,
    employmentRes,
    travelRes,
    addressRes,
    orgsRes,
    govRes,
    milRes,
    biometricsRes,
    countriesRes,
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("client_family_members")
      .select("*")
      .eq("client_id", id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .schema("crm")
      .from("client_education_history")
      .select("*")
      .eq("client_id", id)
      .order("date_from", { ascending: false, nullsFirst: false }),
    supabase
      .schema("crm")
      .from("client_employment_history")
      .select("*")
      .eq("client_id", id)
      .order("date_from", { ascending: false, nullsFirst: false }),
    supabase
      .schema("crm")
      .from("client_travel_history")
      .select("*")
      .eq("client_id", id)
      .order("date_from", { ascending: false }),
    supabase
      .schema("crm")
      .from("client_address_history")
      .select("*")
      .eq("client_id", id)
      .order("date_from", { ascending: false, nullsFirst: false }),
    supabase
      .schema("crm")
      .from("client_organisations")
      .select("*")
      .eq("client_id", id)
      .order("date_from", { ascending: false, nullsFirst: false }),
    supabase
      .schema("crm")
      .from("client_government_positions")
      .select("*")
      .eq("client_id", id)
      .order("date_from", { ascending: false, nullsFirst: false }),
    supabase
      .schema("crm")
      .from("client_military_services")
      .select("*")
      .eq("client_id", id)
      .order("date_from", { ascending: false, nullsFirst: false }),
    supabase
      .schema("crm")
      .from("client_biometric_records")
      .select("*")
      .eq("client_id", id)
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("date_given", { ascending: false }),
    supabase
      .schema("ref")
      .from("countries")
      .select("code, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  const related = {
    family: familyRes.data ?? [],
    education: educationRes.data ?? [],
    employment: employmentRes.data ?? [],
    travel: travelRes.data ?? [],
    addresses: addressRes.data ?? [],
    organisations: orgsRes.data ?? [],
    government: govRes.data ?? [],
    military: milRes.data ?? [],
    biometrics: biometricsRes.data ?? [],
  };

  const progress = getIntakeProgress(client, related);
  const canEdit = staffCan(me, "edit_clients");

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
          <Link
            href={`/dashboard/clients/${id}`}
            className="text-stone-500 hover:text-stone-800"
          >
            {client.client_number}
          </Link>
          <span className="mx-2 text-stone-400">›</span>
          <span className="font-medium text-stone-800">Intake</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
              {client.legal_name_full}
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Intake form ·{" "}
              <span className="font-medium text-stone-700">
                {progress.complete} of {progress.total} sections complete
              </span>
            </p>
          </div>
        </div>

        <IntakeShell
          client={client}
          related={related}
          countries={countriesRes.data ?? []}
          sections={progress.sections}
          canEdit={canEdit}
        />
      </main>
    </div>
  );
}

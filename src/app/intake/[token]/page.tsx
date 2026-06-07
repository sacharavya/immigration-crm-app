import { format } from "date-fns";

import { IntakeShell } from "@/app/(staff)/dashboard/clients/[id]/intake/_components/intake-shell";
import {
  adminClient,
  verifyIntakeToken,
} from "@/lib/auth/intake-portal";
import { getIntakeProgress } from "@/lib/intake/completeness";

import { IntakeSubmitBar } from "./_components/intake-submit-bar";
import { InvalidLinkCard } from "./_components/invalid-link-card";
import { SubmittedCard } from "./_components/submitted-card";

// Public intake form. Token comes from the URL; middleware sets the
// httpOnly cookie so the staff intake actions (called by the section
// components) dispatch to portal mode automatically.
//
// The page itself re-verifies the token server-side — middleware's
// validity check is only authoritative enough to set a cookie; we
// never trust it for content decisions.

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function PublicIntakePage({ params }: Props) {
  const { token } = await params;
  const verified = await verifyIntakeToken(token);

  // verifyIntakeToken returns the "already submitted" error specifically
  // when the row exists but intake_submitted_at is set. We surface that
  // as a "thank you" card rather than an "invalid link" card so the
  // client knows their submission landed.
  if (!verified.ok) {
    if (verified.error.includes("already been submitted")) {
      return <SubmittedCard />;
    }
    return <InvalidLinkCard />;
  }

  const clientId = verified.clientId;
  const admin = adminClient();

  const [
    clientRes,
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
    admin
      .schema("crm")
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .schema("crm")
      .from("client_family_members")
      .select("*")
      .eq("client_id", clientId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    admin
      .schema("crm")
      .from("client_education_history")
      .select("*")
      .eq("client_id", clientId)
      .order("date_from", { ascending: false, nullsFirst: false }),
    admin
      .schema("crm")
      .from("client_employment_history")
      .select("*")
      .eq("client_id", clientId)
      .order("date_from", { ascending: false, nullsFirst: false }),
    admin
      .schema("crm")
      .from("client_travel_history")
      .select("*")
      .eq("client_id", clientId)
      .order("date_from", { ascending: false }),
    admin
      .schema("crm")
      .from("client_address_history")
      .select("*")
      .eq("client_id", clientId)
      .order("date_from", { ascending: false, nullsFirst: false }),
    admin
      .schema("crm")
      .from("client_organisations")
      .select("*")
      .eq("client_id", clientId)
      .order("date_from", { ascending: false, nullsFirst: false }),
    admin
      .schema("crm")
      .from("client_government_positions")
      .select("*")
      .eq("client_id", clientId)
      .order("date_from", { ascending: false, nullsFirst: false }),
    admin
      .schema("crm")
      .from("client_military_services")
      .select("*")
      .eq("client_id", clientId)
      .order("date_from", { ascending: false, nullsFirst: false }),
    admin
      .schema("crm")
      .from("client_biometric_records")
      .select("*")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("date_given", { ascending: false }),
    admin
      .schema("ref")
      .from("countries")
      .select("code, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  const client = clientRes.data;
  if (!client) return <InvalidLinkCard />;

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
  const greetingName =
    client.preferred_name?.trim() ||
    client.given_names?.trim() ||
    client.legal_name_full ||
    "there";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
          Hi {greetingName}, please complete your intake form
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Fill in as much as you can — your answers save automatically as
          you type. You can close this page and come back any time before
          submitting.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          <span className="font-medium text-stone-700">
            {progress.complete} of {progress.total}
          </span>{" "}
          sections complete · started {" "}
          {format(new Date(client.created_at), "MMM d, yyyy")}
        </p>
      </div>

      <IntakeShell
        client={client}
        related={related}
        countries={countriesRes.data ?? []}
        sections={progress.sections}
        canEdit={true}
      />

      <IntakeSubmitBar
        sectionsComplete={progress.complete}
        sectionsTotal={progress.total}
      />
    </div>
  );
}

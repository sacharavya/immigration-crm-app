import { notFound } from "next/navigation";

import { ConsultationAgreementDocument } from "@/components/consultation/consultation-agreement-document";
import { loadConsultationAgreementData } from "@/lib/consultation/agreement";
import { adminClient } from "@/lib/supabase/admin";

import { SigningForm } from "./_components/signing-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_RE = /^[0-9a-f]{64}$/i;

export default async function ConsultationSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) notFound();

  const supabase = adminClient();
  const { data: appt } = await supabase
    .schema("crm")
    .from("appointments")
    .select(
      "id, consultation_agreement_signed_at, consultation_agreement_token_expires_at",
    )
    .eq("consultation_agreement_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!appt) notFound();

  const alreadySigned = appt.consultation_agreement_signed_at !== null;
  const expired =
    !alreadySigned &&
    appt.consultation_agreement_token_expires_at != null &&
    new Date(appt.consultation_agreement_token_expires_at) < new Date();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {alreadySigned ? (
        <StateCard
          title="Already signed"
          body="This agreement has already been signed. Thank you."
        />
      ) : expired ? (
        <StateCard
          title="This link has expired"
          body="Please contact us at info@genzdatalabs.com for a new signing link."
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-stone-200 bg-white">
            <ConsultationAgreementDocument
              data={await loadConsultationAgreementData(appt.id, new Date())}
              mode="signing"
            />
          </div>
          <SigningForm token={token} />
        </div>
      )}
    </main>
  );
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
      <p className="mt-2 text-sm text-stone-600">{body}</p>
    </div>
  );
}

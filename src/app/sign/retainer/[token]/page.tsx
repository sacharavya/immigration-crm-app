import { GenzLogo } from "@/components/brand/genz-logo";

import {
  RETAINER_STYLES,
  RetainerDocument,
} from "@/components/retainer/retainer-document";
import {
  loadRetainerData,
  RetainerRenderError,
} from "@/lib/pdf/render-retainer";
import { adminClient } from "@/lib/supabase/admin";

import { SigningForm } from "./_components/signing-form";

// Public route — no auth, no (staff) layout. Token validation gates
// every action; the page itself only loads + renders when the token
// is valid + status is pending_signature.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ token: string }> };

const FIRM_CONTACT = {
  email: "info@genzdatalabs.com",
  phone: "+1 416-386-5351",
};

export default async function PublicSigningPage({ params }: Props) {
  const { token } = await params;

  const validated = await validateToken(token);

  if (!validated) {
    return <ExpiredOrInvalid />;
  }

  // Load the full RetainerData. The retainer is in pending_signature
  // status with a valid token + RCIC signature must be present (the
  // case detail Send action enforces this). If it's missing for any
  // reason we show a soft "contact us" message rather than 500.
  let data;
  try {
    data = await loadRetainerData(validated.retainerId, {
      requireSignature: true,
    });
  } catch (err) {
    if (err instanceof RetainerRenderError) {
      console.error(`[signing] data unavailable for ${validated.retainerId}:`, err.code);
      return <ExpiredOrInvalid />;
    }
    throw err;
  }

  return (
    <main className="min-h-dvh bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <GenzLogo className="h-10 w-auto text-[#1E2136]" />
          <div>
            <div className="text-sm font-semibold text-[var(--navy)]">
              genzdatalabs Immigration Consulting Inc.
            </div>
            <div className="text-xs text-stone-500">
              Retainer Agreement · Case {data.case_number}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-32 pt-6 sm:pb-6">
        <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-5">
          <h1 className="text-lg font-semibold text-stone-900">
            Review and sign your retainer agreement
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Please read the agreement below. When you&apos;re ready, scroll
            to the bottom to sign or upload a signed copy.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <style
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: RETAINER_STYLES }}
          />
          <RetainerDocument data={data} mode="signing" />
        </div>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5 sm:sticky sm:bottom-4">
          <h2 className="text-base font-semibold text-stone-900">
            Sign your agreement
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Choose how you&apos;d like to sign. By submitting you agree to be
            bound by the terms above.
          </p>
          <div className="mt-4">
            <SigningForm
              token={token}
              clientName={data.client_legal_name_full}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function ExpiredOrInvalid() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 p-6">
      <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-stone-900">
          Signing link unavailable
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          This link is invalid or has expired. Contact your immigration
          consultant for a new link.
        </p>
        <dl className="mt-4 space-y-1 text-sm text-stone-700">
          <div>
            <dt className="inline text-stone-500">Email:</dt>{" "}
            <a
              href={`mailto:${FIRM_CONTACT.email}`}
              className="text-[var(--navy)] underline"
            >
              {FIRM_CONTACT.email}
            </a>
          </div>
          <div>
            <dt className="inline text-stone-500">Phone:</dt>{" "}
            {FIRM_CONTACT.phone}
          </div>
        </dl>
      </div>
    </main>
  );
}

// Service-role token check (mirrors the actions). Returns the retainer
// id when the token is valid + status is pending_signature.
async function validateToken(
  token: string,
): Promise<{ retainerId: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[signing] service-role env missing");
    return null;
  }

  const supabase = adminClient();

  const { data } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select("id, status, token_expires_at")
    .eq("signing_token", token)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;
  if (data.status !== "pending_signature") return null;
  if (
    data.token_expires_at &&
    new Date(data.token_expires_at).getTime() < Date.now()
  ) {
    return null;
  }
  return { retainerId: data.id };
}

import { format } from "date-fns";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { ReplaceTrigger } from "./_components/replace-trigger";
import { SignatureForm } from "./_components/signature-form";

export default async function MySignaturePage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "manage_own_signature")) {
    redirect("/dashboard?error=forbidden_manage_own_signature");
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .schema("crm")
    .from("staff")
    .select(
      "signature_image_url, signature_image_set_at, printed_name_for_signature, signature_capture_method",
    )
    .eq("id", me.id)
    .maybeSingle();

  const hasSignature = Boolean(row?.signature_image_url);
  const defaultPrintedName =
    row?.printed_name_for_signature ?? `${me.first_name} ${me.last_name}`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
          My signature
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Used on retainer agreements you sign as the assigned RCIC.
        </p>
      </div>

      {hasSignature && row ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
              Current signature
            </h2>
            <div className="rounded-md border border-stone-200 bg-white p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.signature_image_url ?? ""}
                alt="Your signature"
                style={{ width: 200, height: "auto", margin: "0 auto" }}
              />
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Set on
                </dt>
                <dd className="mt-0.5 text-stone-900">
                  {row.signature_image_set_at
                    ? format(
                        new Date(row.signature_image_set_at),
                        "MMM d, yyyy",
                      )
                    : "—"}
                  {row.signature_capture_method ? (
                    <span className="ml-1 text-stone-500">
                      ({row.signature_capture_method})
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Printed name
                </dt>
                <dd className="mt-0.5 text-stone-900">
                  {row.printed_name_for_signature ?? "—"}
                </dd>
              </div>
            </dl>

            <ReplaceTrigger defaultPrintedName={defaultPrintedName} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-stone-700">
              No signature on file yet. Draw or upload one to start using it on
              retainers.
            </p>
            <SignatureForm defaultPrintedName={defaultPrintedName} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}

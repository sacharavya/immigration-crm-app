import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAgent } from "@/lib/auth/agent";
import { createClient } from "@/lib/supabase/server";

import { NewClientForm } from "./_components/new-client-form";

export const dynamic = "force-dynamic";

export default async function NewPortalClientPage() {
  const agent = await getAgent();
  if (!agent) redirect("/login?error=unauthorized");

  const supabase = await createClient();
  const { data: countries } = await supabase
    .schema("ref")
    .from("countries")
    .select("code, name")
    .order("name");

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div>
        <Link
          href="/portal"
          className="text-sm text-stone-500 hover:text-[var(--primary)] hover:underline"
        >
          ← My clients
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register a client</CardTitle>
        </CardHeader>
        <CardContent>
          <NewClientForm countries={countries ?? []} />
        </CardContent>
      </Card>
    </main>
  );
}

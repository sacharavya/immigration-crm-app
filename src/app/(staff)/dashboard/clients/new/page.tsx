import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { NewClientForm } from "./_components/new-client-form";

export default async function NewClientPage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "create_clients")) {
    redirect("/dashboard?error=forbidden_create_clients");
  }

  const supabase = await createClient();
  const { data: countries } = await supabase
    .schema("ref")
    .from("countries")
    .select("code, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-50">
        <div className="flex items-center px-6 py-4 text-sm">
          <Link
            href="/dashboard/clients"
            className="text-stone-500 hover:text-stone-800"
          >
            Clients
          </Link>
          <span className="mx-2 text-stone-400">›</span>
          <span className="font-medium text-stone-800">New client</span>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
            New client
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Capture the client&rsquo;s personal details now so the retainer
            and intake forms don&rsquo;t open with blank fields later. Only
            the legal name is required — everything else can be filled in
            on the intake page if you don&rsquo;t have it yet.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <NewClientForm countries={countries ?? []} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

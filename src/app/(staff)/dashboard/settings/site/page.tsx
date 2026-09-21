import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { requireStaffTenantId } from "@/lib/tenant/context";

import { SiteSettingsForm } from "./_components/site-settings-form";

export const dynamic = "force-dynamic";

export default async function SiteSettingsPage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "manage_settings")) redirect("/dashboard");

  const tenantId = await requireStaffTenantId();
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .schema("crm")
    .from("tenants")
    .select("name, logo_url")
    .eq("id", tenantId)
    .maybeSingle();


  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Site settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How your firm appears to your team and to your clients: logo now, name and colours next.
        </p>
      </header>

      <SiteSettingsForm
        firmName={tenant?.name ?? "Your firm"}
        logoUrl={tenant?.logo_url ?? null}
      />
    </div>
  );
}

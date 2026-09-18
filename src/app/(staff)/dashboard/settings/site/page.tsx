import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { requireStaffTenantId } from "@/lib/tenant/context";

import { providerCredentials } from "@/lib/connections/providers";

import {
  ConnectedAccount,
  type ConnectionView,
} from "./_components/connected-account";
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

  // Metadata only: who is connected and what the grant covers. The tokens
  // themselves are unreachable from any session, including this one.
  const { data: statusRows } = await supabase
    .schema("crm")
    .rpc("connection_status");
  const connection = ((statusRows as ConnectionView[] | null) ?? [])[0] ?? null;

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Site settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How your firm appears to your team and to your clients.
        </p>
      </header>

      <ConnectedAccount
        connection={connection}
        providersConfigured={{
          microsoft: providerCredentials("microsoft") !== null,
          google: providerCredentials("google") !== null,
        }}
      />

      <SiteSettingsForm
        firmName={tenant?.name ?? "Your firm"}
        logoUrl={tenant?.logo_url ?? null}
      />
    </div>
  );
}

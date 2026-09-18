import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getStaffTenantId } from "@/lib/tenant/context";

import { GenzLogo } from "./genz-logo";

/**
 * The logo for the firm whose CRM this is.
 *
 * Falls back to the platform mark when a firm hasn't uploaded one, so a new
 * firm never renders an empty header. Callers that are client-facing (the
 * upload, payment and signing portals) should pass an explicit tenantId,
 * because those pages have no staff session — the client is not a user.
 */
export async function FirmLogo({
  className,
  tenantId,
  tone = "auto",
}: {
  className?: string;
  tenantId?: string;
  tone?: "auto" | "dark";
}) {
  const id = tenantId ?? (await getStaffTenantId());
  if (!id) return <GenzLogo className={className} tone={tone} />;

  const supabase = await createClient();
  const { data } = await supabase
    .schema("crm")
    .from("tenants")
    .select("name, logo_url")
    .eq("id", id)
    .maybeSingle();

  if (!data?.logo_url) return <GenzLogo className={className} tone={tone} />;

  // Deliberately a plain img rather than next/image: the URL is a firm's
  // uploaded asset on the storage origin, so it would need a remote-pattern
  // allowlist entry per deployment, and a logo is already small.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={data.logo_url}
      alt={data.name}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

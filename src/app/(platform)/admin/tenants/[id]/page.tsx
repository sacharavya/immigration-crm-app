import Link from "next/link";
import { notFound } from "next/navigation";

import { firmPublicUrl } from "@/lib/email/url";
import { createClient } from "@/lib/supabase/server";

import type { TenantMember } from "../../actions";
import { getFeatureCatalogue } from "@/lib/tenant/server";

import { CopyUrl } from "../../_components/copy-url";
import { DangerZone } from "../../_components/danger-zone";
import { MembersTable } from "../../_components/members-table";
import { OwnerForm } from "../../_components/owner-form";
import { TenantDetailForm } from "../../_components/tenant-detail-form";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .schema("crm")
    .from("tenants")
    .select(
      "id, name, slug, number_prefix, status, public_host, features, admin_notes, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!tenant) notFound();

  const catalogue = await getFeatureCatalogue();
  const publicUrl = await firmPublicUrl(tenant.id);

  // Account administration: names, emails, roles and sign-in status. Still
  // no clients, cases or documents — those stay behind tenant isolation.
  const { data: memberRows } = await supabase
    .schema("platform")
    .rpc("tenant_members", { p_tenant: id });
  const members = (memberRows as TenantMember[] | null) ?? [];

  return (
    <div className="space-y-5 p-6">
      <header>
        <Link
          href="/admin"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← All firms
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-stone-900">
          {tenant.name}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Configuration and access for this firm. Their client and case
          records are not reachable from this portal.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-stone-500">Public site</span>
          <CopyUrl url={publicUrl} />
        </div>
        <p className="mt-1 text-xs text-stone-500">
          The handle <span className="font-mono">{tenant.slug}</span> is this
          firm&apos;s subdomain, so it cannot be changed after creation. A
          custom domain can be added below.
        </p>
      </header>

      <OwnerForm
        tenantId={tenant.id}
        tenantName={tenant.name}
        staffCount={members.length}
      />

      <MembersTable members={members} tenantName={tenant.name} />

      <TenantDetailForm
        catalogue={catalogue}
        tenant={{
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          number_prefix: tenant.number_prefix,
          status: tenant.status as "active" | "suspended",
          public_host: tenant.public_host,
          features: (tenant.features as Record<string, unknown> | null) ?? {},
          admin_notes: tenant.admin_notes,
        }}
      />

      <DangerZone tenantId={tenant.id} tenantName={tenant.name} />
    </div>
  );
}

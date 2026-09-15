import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getFeatureCatalogue } from "@/lib/tenant/server";

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
      </header>

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
    </div>
  );
}

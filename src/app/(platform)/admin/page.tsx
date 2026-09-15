import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { CreateTenantForm } from "./_components/create-tenant-form";

export const dynamic = "force-dynamic";

type Usage = {
  tenant_id: string;
  staff_count: number;
  client_count: number;
  case_count: number;
  last_activity: string | null;
};

export default async function FirmsPage() {
  const supabase = await createClient();

  const { data: tenants } = await supabase
    .schema("crm")
    .from("tenants")
    .select("id, name, slug, number_prefix, status, public_host, created_at")
    .order("created_at", { ascending: true });

  // Aggregates only. There is no query anywhere in this portal that returns
  // a client, case or document row.
  const { data: usageRows } = await supabase
    .schema("platform")
    .rpc("tenant_usage");

  const usage = new Map<string, Usage>(
    ((usageRows as Usage[] | null) ?? []).map((u) => [u.tenant_id, u]),
  );

  return (
    <div className="space-y-5 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Firms</h1>
          <p className="mt-1 text-sm text-stone-600">
            Every firm using the platform. Counts are totals only — their
            records are not readable from here.
          </p>
        </div>
      </header>

      <CreateTenantForm />

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Firm</th>
              <th className="px-4 py-2.5 font-medium">Handle</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Staff</th>
              <th className="px-4 py-2.5 text-right font-medium">Clients</th>
              <th className="px-4 py-2.5 text-right font-medium">Cases</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {(tenants ?? []).map((t) => {
              const u = usage.get(t.id);
              return (
                <tr key={t.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-900">{t.name}</div>
                    {t.public_host && (
                      <div className="text-xs text-stone-500">
                        {t.public_host}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600">
                    {t.slug}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        t.status === "active"
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
                          : "rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900"
                      }
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                    {u?.staff_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                    {u?.client_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                    {u?.case_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="text-sm font-medium text-[var(--primary)] hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(tenants ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                  No firms yet. Add the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

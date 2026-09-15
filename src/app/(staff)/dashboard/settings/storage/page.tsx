import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { getStorageSettings } from "@/lib/storage/settings";
import { requireStaffTenantId } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/server";

import { StorageForm } from "./_components/storage-form";

export const dynamic = "force-dynamic";

export default async function StorageSettingsPage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "manage_settings")) redirect("/dashboard");

  const supabase = await createClient();
  const { data: row } = await supabase
    .schema("crm")
    .from("storage_settings")
    .select("provider, drive_id, root_folder")
    .maybeSingle();

  if (!row) {
    return (
      <div className="p-6">
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Storage settings row missing. Re-apply the storage settings
          migration.
        </p>
      </div>
    );
  }

  // Resolved view (row wins, env fills the gaps) so the page can show what
  // is actually in use rather than only what is stored.
  const effective = await getStorageSettings(await requireStaffTenantId());

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-xl font-semibold text-stone-900">
          Storage settings
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Control which drive holds case files and where the case folder tree
          is anchored.
        </p>
      </header>

      <StorageForm
        hasEnvFallback={Boolean(process.env.GRAPH_DOCUMENT_LIBRARY_ID?.trim())}
        effectiveDriveId={effective.driveId}
        initial={{
          provider: row.provider,
          drive_id: row.drive_id,
          root_folder: row.root_folder,
        }}
      />
    </div>
  );
}

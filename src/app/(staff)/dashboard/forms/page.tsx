import { FileText } from "lucide-react";
import { redirect } from "next/navigation";

import { getStaff } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

// Home of the forms workspace. First feature to land here: autofilling
// IRCC forms from the client's intake data.
export default async function FormsPage() {
  const me = await getStaff();
  if (!me) redirect("/login");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-stone-900">Forms</h1>
      <p className="mt-1 text-sm text-stone-500">
        Fill government forms from client data.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 rounded-lg border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
        <FileText className="h-8 w-8 text-stone-300" />
        <p className="text-sm font-medium text-stone-700">Nothing here yet</p>
        <p className="max-w-sm text-sm text-stone-500">
          Form autofill is coming next: pick a client, pick an IRCC form, and
          their intake answers fill it in.
        </p>
      </div>
    </div>
  );
}

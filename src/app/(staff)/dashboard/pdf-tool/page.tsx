import { redirect } from "next/navigation";

import { PdfTool } from "@/components/pdf-tool/pdf-tool";
import { getStaff } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

export default async function PdfToolPage() {
  const me = await getStaff();
  if (!me) redirect("/login");

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">
          Submission package builder
        </h1>
        <p className="text-sm text-stone-500">
          Merge PDFs and images, reorder and rotate pages, and compress to a
          portal size limit - all in the browser, nothing leaves this device.
        </p>
      </div>
      <PdfTool />
    </div>
  );
}

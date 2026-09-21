import { FirmLogo } from "@/components/brand/firm-logo";
import { tenantForPortalToken } from "@/lib/tenant/context";
import type { Metadata } from "next";

import { PublicFooter } from "@/components/public-footer";

// Public case payment-request portal. Same chrome shape as /book-an-appointment and
// /intake — branded header, firm-info footer, noindex meta so leaked
// tokens don't get indexed.

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  title: "Upload payment proof · genzdatalabs Immigration",
};

export default async function PayLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  // The client has no session, so the firm comes from the token.
  const { token } = await params;
  const portalTenantId = await tenantForPortalToken(token);

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <FirmLogo className="h-10 w-auto" tenantId={portalTenantId ?? undefined} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl flex-1 px-6 py-8">{children}</main>
      <PublicFooter />
    </div>
  );
}

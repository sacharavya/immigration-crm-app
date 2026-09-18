import { FirmLogo } from "@/components/brand/firm-logo";
import { tenantForPortalToken } from "@/lib/tenant/context";
import type { Metadata } from "next";

import { PublicFooter } from "@/components/public-footer";

// Public client-self-serve intake. Same chrome shape as /book-an-appointment layout
// (logo header, firm-info footer) so the visual experience matches
// every other public surface the firm sends to clients.

export const metadata: Metadata = {
  // Tokens land in URLs that can leak to search engines via the browser
  // / address bar / mistakenly shared screenshots. Disallowing indexing
  // is a cheap defence-in-depth on top of the random-UUID token.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  title: "Intake form · genzdatalabs Immigration",
};

export default async function IntakePortalLayout({
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
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <FirmLogo className="h-10 w-auto" tenantId={portalTenantId ?? undefined} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl flex-1 px-6 py-8">{children}</main>
      <PublicFooter />
    </div>
  );
}

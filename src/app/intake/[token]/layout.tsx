import type { Metadata } from "next";
import Image from "next/image";

// Public client-self-serve intake. Same chrome shape as /book layout
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
  title: "Intake form · Big Bang Immigration",
};

export default function IntakePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Image
            src="/logo.png"
            alt="Big Bang Immigration"
            width={1933}
            height={537}
            priority
            className="h-10 w-auto"
          />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      <footer className="mt-12 border-t border-stone-200 bg-white px-6 py-6 text-sm text-stone-600">
        <div className="mx-auto max-w-5xl space-y-1">
          <p className="font-medium text-stone-700">
            Big Bang Immigration Consulting Inc.
          </p>
          <p>211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5</p>
          <p>
            Questions?{" "}
            <a
              className="text-[var(--navy)] underline-offset-2 hover:underline"
              href="mailto:info@bigbangimmigration.com"
            >
              info@bigbangimmigration.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

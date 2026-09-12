import type { Metadata } from "next";
import Image from "next/image";

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

export default function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Image
            src="/genzdatalabs-logo.png"
            alt="genzdatalabs Immigration"
            width={1933}
            height={537}
            priority
            className="h-10 w-auto"
          />
        </div>
      </header>
      <main className="mx-auto max-w-3xl flex-1 px-6 py-8">{children}</main>
      <PublicFooter />
    </div>
  );
}
